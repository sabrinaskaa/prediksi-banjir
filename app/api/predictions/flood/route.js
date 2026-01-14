import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function riskFromCm(levelCm, siaga = 140, awas = 200) {
  if (levelCm == null) return "DATA_KOSONG";
  if (levelCm >= awas) return "TINGGI";
  if (levelCm >= siaga) return "SEDANG";
  return "RENDAH";
}

const ZONES = ["BARAT", "TIMUR", "TENGAH", "UTARA"];

export async function GET() {
  const db = await getDb();

  // 1) Ambil latest reading per station (TiDB-safe: pakai window function)
  const latestSql = `
    WITH latest AS (
      SELECT
        station_id,
        level_cm,
        reading_time,
        ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY reading_time DESC) AS rn
      FROM water_level_readings
    )
    SELECT
      ws.id,
      ws.name,
      ws.zone,
      ws.kind,
      ws.lat,
      ws.lng,
      ws.siaga_cm,
      ws.awas_cm,
      l.level_cm,
      l.reading_time
    FROM water_stations ws
    LEFT JOIN latest l
      ON l.station_id = ws.id AND l.rn = 1
  `;

  const [stations] = await db.query(latestSql);

  // 2) Hitung max TMA per zona (basis prediksi)
  const maxByZone = {};
  const thresholdByZone = {}; // ambil threshold terakhir yg ketemu (opsional)

  for (const z of ZONES) {
    maxByZone[z] = null;
    thresholdByZone[z] = { siaga: 140, awas: 200 };
  }

  for (const s of stations || []) {
    const z = s.zone;
    if (!z || !ZONES.includes(z)) continue;

    // update threshold (kalau ada di DB)
    const siaga = s.siaga_cm ?? 140;
    const awas = s.awas_cm ?? 200;
    thresholdByZone[z] = { siaga, awas };

    const cm = s.level_cm ?? null;
    if (cm == null) continue;

    if (maxByZone[z] == null || cm > maxByZone[z]) {
      maxByZone[z] = cm;
    }
  }

  // 3) Ambil daftar lokasi prediksi (risk_points)
  let riskPoints = [];
  try {
    const [rp] = await db.query(
      `SELECT id, name, zone, lat, lng FROM risk_points ORDER BY zone ASC, name ASC`
    );
    riskPoints = rp || [];
  } catch {
    riskPoints = [];
  }

  const predictedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 jam

  // 4) Build output
  let items = [];

  if (riskPoints.length > 0) {
    items = riskPoints.map((p) => {
      const zone = p.zone;
      const basis = zone && ZONES.includes(zone) ? maxByZone[zone] : null;
      const th =
        zone && ZONES.includes(zone)
          ? thresholdByZone[zone]
          : { siaga: 140, awas: 200 };
      return {
        id: p.id,
        zone,
        location: p.name,
        lat: p.lat,
        lng: p.lng,
        basis_tma_cm: basis, // bisa null kalau belum ada data
        risk: riskFromCm(basis, th.siaga, th.awas),
        predicted_at: predictedAt,
      };
    });
  } else {
    // fallback: minimal tampilkan 4 zona biar ga blank
    items = ZONES.map((zone) => {
      const basis = maxByZone[zone];
      const th = thresholdByZone[zone];
      return {
        id: zone,
        zone,
        location: "-",
        lat: null,
        lng: null,
        basis_tma_cm: basis,
        risk: riskFromCm(basis, th.siaga, th.awas),
        predicted_at: predictedAt,
      };
    });
  }

  return NextResponse.json({
    predicted_at: predictedAt,
    items,
    // bonus buat debug
    meta: {
      risk_points_count: riskPoints.length,
      stations_count: (stations || []).length,
      max_by_zone: maxByZone,
    },
  });
}
