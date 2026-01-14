import dotenv from "dotenv";
import mysql from "mysql2/promise";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

dotenv.config({ path: ".env.local" });

const URL = "https://pantaubanjir.semarangkota.go.id/";

function parseIndoDateTime(s) {
  // format: dd/mm/yyyy hh:mm
  const [d, t] = s.trim().split(/\s+/);
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd} ${t}:00`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL in .env.local");
  const db = await mysql.createConnection(url);

  const html = await (await fetch(URL)).text();
  const $ = cheerio.load(html);

  // Strategy: find cards-like chunks by searching for patterns in text.
  // Page shows "Tanggal:" and "Tinggi Air:" for each station.
  const pageText = $("body").text();
  const blocks = pageText.split("Tanggal:").slice(1);

  let saved = 0;

  for (const blk of blocks) {
    const dtMatch = blk.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
    const lvlMatch = blk.match(/Tinggi\s*Air:\s*(\d+)\s*cm/i);
    if (!dtMatch || !lvlMatch) continue;

    const readingTime = parseIndoDateTime(dtMatch[1]);
    const level = parseInt(lvlMatch[1], 10);

    // crude station name guess: first non-empty token line
    const pre = blk.slice(0, 160);
    const nameGuess =
      pre
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0]
        ?.slice(0, 120) || "UNKNOWN";

    // status text if exists
    const status = blk.match(/\b(Aman|Siaga|Awas)\b/i)?.[1] || null;
    const statusText = status ? status.toUpperCase() : null;

    // ensure station exists
    const [rows] = await db.query(
      "SELECT id FROM water_stations WHERE name=?",
      [nameGuess]
    );
    let stationId;
    if (!rows.length) {
      const [ins] = await db.query(
        "INSERT INTO water_stations (name, min_cm, max_cm) VALUES (?,?,?)",
        [nameGuess, 0, 500]
      );
      stationId = ins.insertId;
    } else {
      stationId = rows[0].id;
    }

    await db.query(
      "INSERT INTO water_level_readings (station_id, reading_time, level_cm, status_text) VALUES (?,?,?,?)",
      [stationId, readingTime, level, statusText]
    );

    saved += 1;
  }

  //await db.end();
  console.log(`✅ PantauBanjir ingested. rows_saved=${saved}`);
}

main().catch((e) => {
  console.error("❌ ingest_pantaubanjir failed:", e);
  process.exit(1);
});
