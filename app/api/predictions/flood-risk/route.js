export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDb } from "@/lib/db";

function riskFromText(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("hujan lebat") || d.includes("hujan sedang")) return "TINGGI";
  if (d.includes("hujan ringan") || d.includes("berawan")) return "SEDANG";
  return "RENDAH";
}

function toISO(dt) {
  return new Date(dt).toISOString().slice(0, 19).replace("T", " ");
}

export async function GET() {
  const db = await getDb();

  // pick next forecast per area
  const [rows] = await db.query(`
    SELECT a.id, a.name, wf.weather_desc, wf.forecast_time_local
    FROM areas a
    LEFT JOIN weather_forecasts wf ON wf.area_id=a.id
    WHERE a.adm4_code IS NOT NULL
    ORDER BY wf.forecast_time_local ASC
    LIMIT 30
  `);

  const target = new Date(Date.now() + 60 * 60000);
  const items = rows
    .filter((r) => r.name)
    .map((r) => {
      const risk = riskFromText(r.weather_desc);
      const reason = `Cuaca: ${r.weather_desc || "-"}. (Heuristik demo)`;
      return {
        area: r.name,
        risk_level: risk,
        target_time: toISO(target),
        reason,
      };
    });

  await db.end();
  return Response.json({ items });
}
