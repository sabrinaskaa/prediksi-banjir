export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDb } from "@/lib/db";

async function getWeatherFromOpenMeteo() {
  // Panggil Open-Meteo via endpoint internal biar satu format
  try {
    const r = await fetch(`${origin}/api/weather`, { cache: "no-store" });
    if (!r.ok) return [];
    const j = await r.json();
    return j.items ?? [];
  } catch {
    return [];
  }
}

async function getWeatherFromDb(db) {
  // latest per area (anti duplikat)
  const [rows] = await db.query(`
    SELECT a.name, wf.forecast_time_local, wf.t_c, wf.hu_pct, wf.tcc_pct, wf.ws_kmh, wf.wd, wf.weather_desc
    FROM weather_forecasts wf
    JOIN areas a ON a.id = wf.area_id
    JOIN (
      SELECT area_id, MAX(forecast_time_local) AS max_time
      FROM weather_forecasts
      GROUP BY area_id
    ) last
      ON last.area_id = wf.area_id AND last.max_time = wf.forecast_time_local
    ORDER BY a.name ASC
    LIMIT 50
  `);
  return rows;
}

export async function GET() {
  const db = await getDb();

  // --- ambil weather dari Open-Meteo, fallback DB ---
  let weather = await getWeatherFromOpenMeteo();
  if (!Array.isArray(weather) || weather.length === 0) {
    weather = await getWeatherFromDb(db);
  }

  // --- TMA ---
  const [tma] = await db.query(`
  SELECT
    ws.id,
    ws.name,
    ws.kind,
    ws.lat,
    ws.lng,
    r.level_cm,
    r.reading_time
  FROM water_stations ws
  LEFT JOIN (
    SELECT r1.station_id, r1.level_cm, r1.reading_time
    FROM water_level_readings r1
    INNER JOIN (
      SELECT station_id, MAX(reading_time) AS max_time
      FROM water_level_readings
      GROUP BY station_id
    ) last
      ON last.station_id = r1.station_id
     AND last.max_time = r1.reading_time
  ) r
    ON r.station_id = ws.id
  ORDER BY ws.name ASC
`);

  const [stations] = await db.query(`
  SELECT
    ws.id, ws.name,
    ws.kind,
    ws.lat, ws.lng,
    wlr.level_cm, wlr.reading_time
  FROM water_stations ws
  LEFT JOIN (
    SELECT r1.station_id, r1.level_cm, r1.reading_time
    FROM water_level_readings r1
    JOIN (
      SELECT station_id, MAX(reading_time) AS max_time
      FROM water_level_readings
      GROUP BY station_id
    ) last
      ON last.station_id = r1.station_id
     AND last.max_time = r1.reading_time
  ) wlr
    ON wlr.station_id = ws.id
  ORDER BY ws.name ASC
`);

  // --- Risk points (prediksi banjir) ---
  const [riskPoints] = await db.query(`
    SELECT id, name, zone, lat, lng
    FROM risk_points
    ORDER BY zone, name
  `);

  // --- CCTV ---
  const [cctv] = await db.query(`
    SELECT id, name, hls_url, category, lat, lng
    FROM cctv_sources
    ORDER BY category, name
  `);

  //await db.end();

  return Response.json({ weather, tma, riskPoints, cctv, stations });
}
