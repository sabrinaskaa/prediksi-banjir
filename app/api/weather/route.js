// app/api/weather/route.js
export const runtime = "nodejs";

function weatherCodeToIdText(code) {
  const map = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Berawan",
    3: "Mendung",
    45: "Berkabut",
    48: "Kabut Tebal",
    51: "Gerimis Ringan",
    53: "Gerimis",
    55: "Gerimis Lebat",
    56: "Gerimis Dingin",
    57: "Gerimis Dingin Lebat",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Lebat",
    66: "Hujan Dingin",
    67: "Hujan Dingin Lebat",
    71: "Salju Ringan",
    73: "Salju Sedang",
    75: "Salju Lebat",
    77: "Butiran Salju",
    80: "Hujan Lokal Ringan",
    81: "Hujan Lokal Sedang",
    82: "Hujan Lokal Lebat",
    95: "Badai Petir",
    96: "Badai Petir + Hujan Es",
    99: "Badai Petir Hebat + Hujan Es",
  };
  return map[code] ?? "Tidak diketahui";
}

function degToWindDir(deg) {
  if (deg == null || Number.isNaN(deg)) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // default Semarang
  const lat = Number(searchParams.get("lat") ?? -6.9667);
  const lng = Number(searchParams.get("lng") ?? 110.4167);
  const hours = Math.min(
    Math.max(Number(searchParams.get("hours") ?? 6), 1),
    24
  );

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&hourly=temperature_2m,precipitation,cloudcover,relativehumidity_2m,windspeed_10m,winddirection_10m,weathercode` +
    `&timezone=Asia%2FJakarta`;

  try {
    const r = await fetch(url, { next: { revalidate: 300 } }); // cache 5 menit
    if (!r.ok) {
      return Response.json(
        { items: [], source: "open-meteo", error: "fetch_failed" },
        { status: 200 }
      );
    }

    const j = await r.json();

    const t = j.hourly?.time ?? [];
    const temp = j.hourly?.temperature_2m ?? [];
    const rain = j.hourly?.precipitation ?? [];
    const cloud = j.hourly?.cloudcover ?? [];
    const hum = j.hourly?.relativehumidity_2m ?? [];
    const wind = j.hourly?.windspeed_10m ?? [];
    const winddir = j.hourly?.winddirection_10m ?? [];
    const wcode = j.hourly?.weathercode ?? [];

    const now = new Date();
    const items = [];

    for (let i = 0; i < t.length; i++) {
      const dt = new Date(t[i]);
      if (dt < now) continue;

      const code = wcode[i];
      const desc = weatherCodeToIdText(code);

      items.push({
        // samakan key dengan UI/overview
        name: "Semarang",
        forecast_time_local: t[i],
        t_c: temp[i] ?? null,
        hu_pct: hum[i] ?? null,
        tcc_pct: cloud[i] ?? null,
        ws_kmh: wind[i] ?? null,
        wd: degToWindDir(winddir[i]),
        weather_desc: desc,
        rain_mm: rain[i] ?? null,
        weather_code: code ?? null,
      });

      if (items.length >= hours) break;
    }

    return Response.json({ items, source: "open-meteo" }, { status: 200 });
  } catch (e) {
    return Response.json(
      { items: [], source: "open-meteo", error: "exception" },
      { status: 200 }
    );
  }
}
