import mysql from "mysql2/promise";

export async function GET() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  const [stations] = await db.query(
    `SELECT id, name, kind FROM water_stations ORDER BY name`
  );

  const items = [];
  for (const s of stations) {
    const [rows] = await db.query(
      `SELECT level_cm, reading_time
       FROM water_level_readings
       WHERE station_id=?
       ORDER BY reading_time DESC
       LIMIT 2`,
      [s.id]
    );

    const last = rows[0];
    const prev = rows[1];

    let pred = last?.level_cm ?? null;

    if (last && prev) {
      const dtMin =
        (new Date(last.reading_time) - new Date(prev.reading_time)) / 60000;
      const slope = dtMin > 0 ? (last.level_cm - prev.level_cm) / dtMin : 0; // cm/menit
      pred = Math.round(last.level_cm + slope * 60);
    }

    items.push({
      station_id: s.id,
      name: s.name,
      kind: s.kind,
      last_cm: last?.level_cm ?? null,
      last_time: last?.reading_time ?? null,
      predicted_cm_1h: pred,
      method: "baseline_trend_2points",
    });
  }

  await db.end();
  return Response.json({ items });
}
