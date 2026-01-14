import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// ---------- helpers: deterministic pseudo coordinates ----------
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pseudoLatLng(name, baseLat = -6.9667, baseLng = 110.4167) {
  // offset kecil biar titik nyebar tapi masih sekitar Semarang
  const h = hashString(name);
  const latOffset = ((h % 1000) / 1000 - 0.5) * 0.08; // ~±0.04
  const lngOffset = (((h / 1000) % 1000) / 1000 - 0.5) * 0.1; // ~±0.05
  return { lat: baseLat + latOffset, lng: baseLng + lngOffset };
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function safeQuery(db, sql, params = []) {
  try {
    return await db.query(sql, params);
  } catch (e) {
    // biar seed tetap jalan walau ada statement yang sudah pernah dieksekusi
    console.warn("[seed] warn:", e?.message?.slice?.(0, 160) ?? e);
    return [[], []];
  }
}

// ---------- data: sesuai request kamu ----------
const riskPoints = [
  // BARAT
  { zone: "BARAT", name: "Tri Tunggal" },
  { zone: "BARAT", name: "Jl. WR Supratman (pertemuan pertigaan Pamularsih)" },
  {
    zone: "BARAT",
    name: "Jl. Jend. Sudirman (Depan SPBU dan lampu merah Anjasmoro)",
  },
  { zone: "BARAT", name: "Sampokong" },
  { zone: "BARAT", name: "Jl. Proff Hamka (Jerakah)" },
  { zone: "BARAT", name: "Jl. Tambak Aji" },

  // TIMUR
  { zone: "TIMUR", name: "Jl. Wolter Monginisidi (Sekitar SPBU)" },
  { zone: "TIMUR", name: "Jl. Gebang Anom" },
  { zone: "TIMUR", name: "Jl. Padi Raya" },
  { zone: "TIMUR", name: "Jl. Muktiharjo Raya" },

  // TENGAH
  { zone: "TENGAH", name: "Bundaran Bubakan" },
  { zone: "TENGAH", name: "Jl. Singosari Raya" },
  { zone: "TENGAH", name: "Jl. Lamper Sari" },
  { zone: "TENGAH", name: "Jl. Tentara Pelajar" },
  { zone: "TENGAH", name: "Jl. Perintis Kemerdekaan (Kubota)" },

  // UTARA
  { zone: "UTARA", name: "Jl. Ujungsari Bandarharjo RW 1" },
  {
    zone: "UTARA",
    name: "Jl. Imam Bonjol (depan Hotel Rahayu sampai 0 km Semarang)",
  },
  { zone: "UTARA", name: "Jl. Tanjung" },
  { zone: "UTARA", name: "Jl. Kolonel Soegiono" },
  { zone: "UTARA", name: "Jl. Hassanudin" },
];

// pos sungai/bendungan (marker merah)
const stations = [
  { name: "Tugu Soeharto", zone: "BARAT", kind: "SUNGAI" },
  { name: "Mayang Sari", zone: "TENGAH", kind: "SUNGAI" },
  { name: "BKT", zone: "TIMUR", kind: "SUNGAI" },
  { name: "Jatibarang", zone: "BARAT", kind: "BENDUNGAN" },
  { name: "Mangkang Kulon", zone: "BARAT", kind: "SUNGAI" },
  { name: "Bendungan Plumbon", zone: "BARAT", kind: "BENDUNGAN" },
  { name: "Pudak Payung", zone: "TENGAH", kind: "SUNGAI" },
  { name: "Wates", zone: "TENGAH", kind: "SUNGAI" },
  { name: "Trimulyo", zone: "UTARA", kind: "SUNGAI" },
  { name: "Rowosari", zone: "TIMUR", kind: "SUNGAI" },
  { name: "Jabungan", zone: "TIMUR", kind: "SUNGAI" },
  { name: "Dinar Indah Meteseh", zone: "TIMUR", kind: "SUNGAI" },
];

const cctvs = [
  // CCTV SUNGAI
  {
    category: "SUNGAI",
    name: "Sebandaran Timur (arah barat)",
    url: "https://livepantau.semarangkota.go.id/318aaf8a-91f1-4688-8d6d-22565a643129/index.m3u8",
  },
  {
    category: "SUNGAI",
    name: "Mutikharjo (Kolam)",
    url: "https://livepantau.semarangkota.go.id/ee6dad0f-7b88-4e35-b8ad-07a8b67ee41c/index.m3u8",
  },
  {
    category: "SUNGAI",
    name: "Semarang Indah",
    url: "https://livepantau.semarangkota.go.id/c5c5fec4-4ca6-40f1-a2ae-8675f6d5d5e4/index.m3u8",
  },

  // CCTV GENANGAN
  {
    category: "GENANGAN",
    name: "Lamper (gajah)",
    url: "https://livepantau.semarangkota.go.id/907a8b85-8c12-4c3c-b3ab-e722147df943/index.m3u8",
  },
  {
    category: "GENANGAN",
    name: "Supriyadi",
    url: "https://livepantau.semarangkota.go.id/25059dd4-6624-4ae0-b0c3-f95ffa77e558/index.m3u8",
  },
  {
    category: "GENANGAN",
    name: "Tugumuda",
    url: "https://livepantau.semarangkota.go.id/26a953d8-175e-407b-b63f-4777ab6ef2dd/index.m3u8",
  },
];

// Minimal area + dummy weather
const areasToSeed = [
  { name: "Miroto", type: "KELURAHAN", adm4_code: "33.74.01.1001" },
];

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing in .env.local");
    process.exit(1);
  }

  function getCa() {
    const caRaw = process.env.TIDB_CA_PEM;
    if (!caRaw) return null;
    return caRaw.includes("\\n") ? caRaw.replace(/\\n/g, "\n") : caRaw;
  }

  const db = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: {
      ca: getCa(),
      rejectUnauthorized: true,
    },
  });

  console.log("🌱 Seeding started...");

  // (Optional) Ensure risk_points table exists (kalau belum sempat migrate)
  await safeQuery(
    db,
    `CREATE TABLE IF NOT EXISTS risk_points (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(160) NOT NULL,
      zone ENUM('BARAT','TIMUR','TENGAH','UTARA') NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // ---------- 1) upsert admin user (FIX 401) ----------
  const passwordHash = await bcrypt.hash("admin123", 10);

  await safeQuery(
    db,
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name=VALUES(name),
       password_hash=VALUES(password_hash),
       role=VALUES(role)`,
    ["Admin Demo", "admin@semarang.go.id", passwordHash, "ADMIN"]
  );

  // ---------- 2) clean core data (idempotent) ----------
  // Bersihin tabel-tabel yang kita isi. Users tidak dihapus.
  // Urutan aman karena ada foreign key.
  await safeQuery(db, "SET FOREIGN_KEY_CHECKS=0");
  await safeQuery(db, "TRUNCATE TABLE water_level_readings");
  await safeQuery(db, "TRUNCATE TABLE water_stations");
  await safeQuery(db, "TRUNCATE TABLE cctv_sources");
  await safeQuery(db, "TRUNCATE TABLE risk_points");
  await safeQuery(db, "TRUNCATE TABLE weather_forecasts");
  // areas: kita delete by name biar gak ganggu data lain kalau kamu nambah manual
  for (const a of areasToSeed) {
    await safeQuery(db, "DELETE FROM areas WHERE name=? AND type=?", [
      a.name,
      a.type,
    ]);
  }
  await safeQuery(db, "SET FOREIGN_KEY_CHECKS=1");

  // ---------- 3) seed areas + dummy weather ----------
  const areaIdByName = new Map();

  for (const a of areasToSeed) {
    const [ins] = await db.query(
      `INSERT INTO areas (name, type, adm4_code)
       VALUES (?, ?, ?)`,
      [a.name, a.type, a.adm4_code]
    );
    areaIdByName.set(a.name, ins.insertId);
  }

  // dummy weather 1 record biar panel cuaca gak kosong
  const mirotoId = areaIdByName.get("Miroto");
  if (mirotoId) {
    await db.query(
      `INSERT INTO weather_forecasts
        (area_id, analysis_time_utc, forecast_time_local, t_c, hu_pct, tcc_pct, ws_kmh, wd, weather_desc)
       VALUES (?, UTC_TIMESTAMP(), NOW(), ?, ?, ?, ?, ?, ?)`,
      [mirotoId, 29.5, 78, 55, 12, "NE", "Hujan Ringan"]
    );
  }

  // ---------- 4) seed risk points (kuning) ----------
  for (const p of riskPoints) {
    const { lat, lng } = pseudoLatLng(`RISK:${p.zone}:${p.name}`);
    await db.query(
      `INSERT INTO risk_points (name, zone, lat, lng)
       VALUES (?, ?, ?, ?)`,
      [p.name, p.zone, lat, lng]
    );
  }

  // ---------- 5) seed water stations (merah) + readings histori ----------
  const stationIds = [];

  for (const s of stations) {
    const { lat, lng } = pseudoLatLng(`STATION:${s.name}`);
    const [ins] = await db.query(
      `INSERT INTO water_stations (name, zone, kind, lat, lng, min_cm, max_cm, siaga_cm, awas_cm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.name,
        s.zone,
        s.kind,
        lat,
        lng,
        0,
        500,
        140, // siaga baseline
        200, // awas baseline
      ]
    );
    stationIds.push({ id: ins.insertId, zone: s.zone });
  }

  // Seed histori TMA: 6 titik per station (tiap 10 menit)
  // Dibikin variasi per zona biar prediksi banjir per zona gak kosong
  for (let i = 0; i < stationIds.length; i++) {
    const stationId = stationIds[i].id;
    const zone = stationIds[i].zone;

    // base per zona (biar keliatan beda)
    let base = 100;
    if (zone === "BARAT") base = 120;
    if (zone === "TIMUR") base = 135;
    if (zone === "TENGAH") base = 110;
    if (zone === "UTARA") base = 150;

    // variasi per pos
    base += (i % 5) * 6;

    for (let k = 5; k >= 0; k--) {
      const noise = randInt(-8, 14); // naik-turun natural
      const level = Math.max(40, Math.min(260, base + noise));
      await db.query(
        `INSERT INTO water_level_readings (station_id, reading_time, level_cm, status_text)
         VALUES (?, DATE_SUB(NOW(), INTERVAL ? MINUTE), ?, NULL)`,
        [stationId, k * 10, level]
      );
    }
  }

  // ---------- 6) seed CCTV ----------
  for (const c of cctvs) {
    const { lat, lng } = pseudoLatLng(`CCTV:${c.category}:${c.name}`);
    await db.query(
      `INSERT INTO cctv_sources (name, hls_url, category, lat, lng)
       VALUES (?, ?, ?, ?, ?)`,
      [c.name, c.url, c.category, lat, lng]
    );
  }

  await db.end();
  console.log("✅ Seeding done!");
  console.log("🔐 Login demo: admin@semarang.go.id / admin123");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
