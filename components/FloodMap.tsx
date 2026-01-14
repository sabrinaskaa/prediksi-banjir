"use client";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";

// Fix default marker icons in Next.js bundles
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function FloodMap() {
  const center: [number, number] = [-6.966667, 110.416664]; // Semarang

  const dummyPolygon = useMemo(() => ({
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Dummy Genangan A (demo)" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [110.405, -6.975],
            [110.425, -6.975],
            [110.425, -6.965],
            [110.405, -6.965],
            [110.405, -6.975]
          ]]
        }
      }
    ]
  }), []);

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={dummyPolygon as any} />
      <Marker position={center}>
        <Popup>
          <div className="text-sm">
            <div className="font-medium">Kota Semarang</div>
            <div className="text-slate-600">Marker pusat kota (demo)</div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
