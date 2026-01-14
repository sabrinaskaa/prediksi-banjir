"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type RiskPoint = {
  id: number | string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
};

type TmaStation = {
  id: number | string;
  name: string;
  kind?: string | null;
  level_cm?: number | null;
  reading_time?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const yellowFlag = L.divIcon({
  className: "",
  html: `<div style="
    width: 18px; height: 18px; border-radius: 6px;
    background: #facc15; border: 2px solid #a16207;
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const redDot = L.divIcon({
  className: "",
  html: `<div style="
    width: 16px; height: 16px; border-radius: 999px;
    background: #ef4444; border: 2px solid #7f1d1d;
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function SemarangMap({
  riskPoints = [],
  tmaStations = [],
}: {
  riskPoints?: RiskPoint[];
  tmaStations?: TmaStation[];
}) {
  const center: LatLngExpression = [-6.9667, 110.4167];

  return (
    <div className="h-[420px] rounded-xl overflow-hidden border bg-white">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* KUNING = titik prediksi banjir */}
        {riskPoints.map((p) => (
          <Marker
            key={`rp-${p.id}`}
            position={[p.lat, p.lng] as LatLngExpression}
            icon={yellowFlag as unknown as L.Icon}
          >
            <Popup>
              <div className="font-semibold">Prediksi Banjir</div>
              <div className="text-sm">{p.name}</div>
              <div className="text-xs text-slate-600">Zona: {p.zone}</div>
            </Popup>
          </Marker>
        ))}

        {/* MERAH = pos sungai/bendungan */}
        {tmaStations
          .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
          .map((s) => (
            <Marker
              key={`st-${s.id}`}
              position={[s.lat as number, s.lng as number] as LatLngExpression}
              icon={redDot as unknown as L.Icon}
            >
              <Popup>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm">{s.kind ?? "POS"}</div>
                <div className="text-sm">TMA: {s.level_cm ?? "-"} cm</div>
                <div className="text-xs text-slate-600">
                  {s.reading_time ?? ""}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
