import { getDb } from "@/lib/db";

function toISO(dt) {
  return new Date(dt).toISOString().slice(0, 19).replace("T", " ");
}

export async function GET() {
  const db = await getDb();

  const [stations] = await db.query(
    "SELECT id, name FROM water_stations ORDER BY name ASC"
  );
  const items = [];

  for (const st of stations) {
    const [reads] = await db.query(
      "SELECT reading_time, level_cm FROM water_level_readings WHERE station_id=? ORDER BY reading_time DESC LIMIT 6",
      [st.id]
    );
    if (!reads.length) continue;

    const last = reads[0];
    let predicted = last.level_cm;

    // slope based on last & oldest within window
    if (reads.length >= 2) {
      const oldest = reads[reads.length - 1];
      const t1 = new Date(oldest.reading_time).getTime();
      const t2 = new Date(last.reading_time).getTime();
      const dtMin = Math.max((t2 - t1) / 60000, 1);
      const slope = (last.level_cm - oldest.level_cm) / dtMin; // cm/min
      predicted = Math.round(last.level_cm + slope * 60);
    }

    const target = new Date(new Date(last.reading_time).getTime() + 60 * 60000);

    items.push({
      station: st.name,
      last_cm: last.level_cm,
      predicted_cm: predicted,
      target_time: toISO(target),
      method: "baseline_trend",
    });
  }

  await db.end();
  return Response.json({ items });
}
