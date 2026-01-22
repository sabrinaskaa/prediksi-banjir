"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CCTVPlayer from "@/components/CCTVPlayer";

const SemarangMap = dynamic(() => import("@/components/SemarangMap"), {
  ssr: false,
});

type WeatherItem = {
  name: string;
  forecast_time_local: string;
  t_c: number | null;
  hu_pct: number | null;
  tcc_pct: number | null;
  weather_desc: string | null;
};

type TmaItem = {
  id: number | string;
  name: string;
  kind?: string | null;
  lat?: number | null;
  lng?: number | null;
  level_cm?: number | null;
  reading_time?: string | null;
};

type RiskPoint = {
  id: number | string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
};

type CctvItem = {
  id: number | string;
  name: string;
  hls_url: string;
  category: "SUNGAI" | "GENANGAN";
  lat?: number | null;
  lng?: number | null;
};

type OverviewResponse = {
  weather: WeatherItem[];
  tma: TmaItem[];
  riskPoints: RiskPoint[];
  cctv: CctvItem[];
};

function formatTime(s?: string | null) {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function statusBadge(levelCm?: number | null) {
  const cm = levelCm ?? null;
  if (cm == null)
    return { label: "N/A", cls: "bg-slate-50 border-slate-200 text-slate-600" };
  if (cm >= 200)
    return { label: "AWAS", cls: "bg-red-50 border-red-200 text-red-700" };
  if (cm >= 140)
    return {
      label: "SIAGA",
      cls: "bg-amber-50 border-amber-200 text-amber-700",
    };
  return {
    label: "AMAN",
    cls: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewResponse>({
    weather: [],
    tma: [],
    riskPoints: [],
    cctv: [],
  });
  const [loading, setLoading] = useState(true);

  const [cctvFilter, setCctvFilter] = useState<"ALL" | "SUNGAI" | "GENANGAN">(
    "ALL",
  );
  const [selectedCctv, setSelectedCctv] = useState<CctvItem | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch("/api/overview")
      .then((r) => r.json())
      .then((d: OverviewResponse) => {
        if (!mounted) return;
        setData(d);
        setSelectedCctv(d.cctv?.[0] ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setData({ weather: [], tma: [], riskPoints: [], cctv: [] });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCctv = useMemo(() => {
    if (cctvFilter === "ALL") return data.cctv;
    return data.cctv.filter((x) => x.category === cctvFilter);
  }, [data.cctv, cctvFilter]);

  useEffect(() => {
    // kalau filter berubah dan selected gak cocok, pindah ke item pertama yang sesuai filter
    if (!filteredCctv.length) {
      setSelectedCctv(null);
      return;
    }
    if (!selectedCctv) {
      setSelectedCctv(filteredCctv[0]);
      return;
    }
    if (cctvFilter !== "ALL" && selectedCctv.category !== cctvFilter) {
      setSelectedCctv(filteredCctv[0]);
    }
  }, [cctvFilter, filteredCctv, selectedCctv]);

  if (loading) {
    return <div className="p-8 text-slate-600">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Banjir Semarang</h1>
          <p className="text-slate-500">Monitoring + Prediksi 1 Jam</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="px-4 py-2 rounded-xl bg-white border hover:bg-slate-50"
            href="/dashboard/prediksi-banjir"
          >
            Prediksi Banjir +1 jam
          </Link>
          <Link
            className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            href="/dashboard/prediksi-tma"
          >
            Prediksi TMA +1 jam
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cuaca */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Cuaca</h2>
            <span className="text-xs text-slate-500">
              {data.weather.length} item
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-[280px] overflow-auto">
            {data.weather.length === 0 ? (
              <div className="text-sm text-slate-500">
                Belum ada data cuaca (seed/ingest).
              </div>
            ) : (
              data.weather.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 text-sm border-b last:border-b-0 pb-2"
                >
                  <div className="text-slate-600">
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs">
                      {formatTime(w.forecast_time_local)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{w.weather_desc ?? "-"}</div>
                    <div className="text-xs text-slate-600">
                      {w.t_c ?? "-"}°C · HU {w.hu_pct ?? "-"}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TMA */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tinggi Muka Air (TMA)</h2>
            <span className="text-xs text-slate-500">
              {data.tma.length} pos
            </span>
          </div>

          <div className="mt-3 space-y-3 max-h-[280px] overflow-auto">
            {data.tma.length === 0 ? (
              <div className="text-sm text-slate-500">
                Belum ada pos TMA (seed).
              </div>
            ) : (
              data.tma.map((x) => {
                const b = statusBadge(x.level_cm);
                return (
                  <div
                    key={x.id}
                    className="flex items-center justify-between gap-3 border rounded-xl p-3"
                  >
                    <div>
                      <div className="font-medium">{x.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatTime(x.reading_time)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {x.kind ?? "POS"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {x.level_cm ?? "-"} cm
                      </div>
                      <span
                        className={`inline-flex text-xs px-2 py-1 rounded-full border ${b.cls}`}
                      >
                        {b.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CCTV (INI YANG KAMU TANYA) */}
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">CCTV</h2>
            <div className="flex gap-2">
              {(["ALL", "SUNGAI", "GENANGAN"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCctvFilter(f)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    cctvFilter === f
                      ? "bg-sky-50 border-sky-200 text-sky-700"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {selectedCctv?.hls_url ? (
              <CCTVPlayer url={selectedCctv.hls_url} />
            ) : (
              <div className="text-sm text-slate-500">Tidak ada CCTV.</div>
            )}
            <div className="text-sm font-medium mt-2">
              {selectedCctv?.name ?? "-"}
            </div>
            <div className="text-xs text-slate-500">
              {selectedCctv?.category ?? ""}
            </div>
          </div>

          <div className="mt-4 max-h-[200px] overflow-auto space-y-2">
            {filteredCctv.length === 0 ? (
              <div className="text-sm text-slate-500">
                Tidak ada CCTV untuk filter ini.
              </div>
            ) : (
              filteredCctv.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCctv(c)}
                  className={`w-full text-left p-2 rounded-xl border ${
                    selectedCctv?.id === c.id
                      ? "bg-sky-50 border-sky-200"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.category}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* MAP */}
        <div className="lg:col-span-3 bg-white border rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h2 className="font-semibold">Peta</h2>
              <p className="text-slate-500 text-sm mt-1">
                Kuning = area rawan banjir. Merah = pos sungai/bendungan.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              {data.riskPoints.length} titik prediksi · {data.tma.length} pos
              TMA
            </div>
          </div>

          <div className="mt-4">
            <SemarangMap riskPoints={data.riskPoints} tmaStations={data.tma} />
          </div>
        </div>
      </div>
    </div>
  );
}
