import dotenv from "dotenv";
import mysql from "mysql2/promise";

// node-fetch for older environments (Node 18+ has global fetch)
import fetch from "node-fetch";

dotenv.config({ path: ".env.local" });

const BMKG = (adm4) =>
  `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;

function toMysqlDatetime(s) {
  // accept "YYYY-MM-DD HH:mm:ss" or ISO
  if (!s) return null;
  const t = s.replace("T", " ").slice(0, 19);
  return t;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL in .env.local");
  const db = await mysql.createConnection(url);

  const [areas] = await db.query(
    "SELECT id, adm4_code FROM areas WHERE adm4_code IS NOT NULL"
  );

  for (const a of areas) {
    const res = await fetch(BMKG(a.adm4_code));
    if (!res.ok) {
      console.error("BMKG failed", a.adm4_code, res.status);
      continue;
    }
    const json = await res.json();

    // BMKG structures can vary; try a few paths
    const analysis = json?.data?.analysis_date || json?.analysis_date || null;
    const items =
      json?.data?.forecast ||
      json?.forecast ||
      json?.data?.data ||
      [];

    let inserted = 0;
    for (const it of items) {
      // Try common keys from BMKG doc: local_datetime, t, hu, tcc, ws, wd, weather_desc
      const forecastTime =
        it.local_datetime || it.datetime || it.utc_datetime || it.time || null;

      if (!forecastTime) continue;

      await db.query(
        `INSERT INTO weather_forecasts
          (area_id, analysis_time_utc, forecast_time_local, t_c, hu_pct, tcc_pct, ws_kmh, wd, weather_desc)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          toMysqlDatetime(analysis),
          toMysqlDatetime(forecastTime),
          it.t ?? it.temp ?? null,
          it.hu ?? it.humidity ?? null,
          it.tcc ?? null,
          it.ws ?? null,
          it.wd ?? null,
          it.weather_desc ?? it.weather ?? null,
        ]
      );
      inserted += 1;
    }

    console.log(`✅ BMKG ingested for area_id=${a.id} adm4=${a.adm4_code} rows=${inserted}`);
  }

  //await db.end();
}

main().catch((e) => {
  console.error("❌ ingest_bmkg failed:", e);
  process.exit(1);
});
