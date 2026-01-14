"use client";

import { useEffect, useState } from "react";

function RiskBadge({ value }) {
  const v = (value || "").toString().toUpperCase();

  // default look
  let label = v || "—";
  let cls =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm";

  if (v === "TINGGI" || v === "AWAS") {
    cls += " border-red-300 bg-red-50 text-red-700";
    label = "TINGGI";
  } else if (v === "SEDANG" || v === "SIAGA") {
    cls += " border-yellow-300 bg-yellow-50 text-yellow-800";
    label = "SEDANG";
  } else if (v === "RENDAH" || v === "AMAN") {
    cls += " border-green-300 bg-green-50 text-green-700";
    label = "RENDAH";
  } else if (v === "DATA_KOSONG") {
    cls += " border-slate-300 bg-slate-50 text-slate-600";
    label = "DATA KOSONG";
  } else {
    cls += " border-slate-300 bg-white text-slate-600";
  }

  return (
    <span className={cls}>
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      <span className="font-medium">{label}</span>
    </span>
  );
}

export default function PrediksiBanjirPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/predictions/flood", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // ✅ tahan banting: support banyak bentuk response
        const arr =
          json?.items ??
          json?.data?.items ??
          json?.data ??
          (Array.isArray(json) ? json : []);

        if (alive) {
          setItems(arr);
          setMeta(json?.meta ?? null);
        }
      } catch (e) {
        if (alive) setErr(e?.message || "Gagal load data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Prediksi Banjir +1 jam</h1>
      <p className="text-sm text-slate-500">
        Basis: max TMA per zona (simulasi awal).
      </p>

      <div className="mt-6 rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-sm text-slate-600">
            {loading
              ? "Loading..."
              : err
              ? `Error: ${err}`
              : `${items.length} item`}
          </div>
          {meta?.max_by_zone && (
            <div className="text-xs text-slate-400">
              {/* debug mini supaya kamu tau data kebaca */}
              max_by_zone:{" "}
              {Object.entries(meta.max_by_zone)
                .map(([k, v]) => `${k}:${v ?? "-"}`)
                .join(" | ")}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b">
                <th className="px-6 py-3">Zona</th>
                <th className="px-6 py-3">Lokasi</th>
                <th className="px-6 py-3">Basis TMA</th>
                <th className="px-6 py-3">Risiko</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !err && items.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-slate-500" colSpan={4}>
                    Data prediksi kosong. Cek seed risk_points / water_stations.
                  </td>
                </tr>
              )}

              {items.map((row, idx) => {
                // ✅ normalisasi field biar nggak kejebak beda nama
                const zone = row.zone ?? row.ZONE ?? "-";
                const location = row.location ?? row.name ?? row.lokasi ?? "-";
                const basis =
                  row.basis_tma_cm ??
                  row.basisTmaCm ??
                  row.basis_tma ??
                  row.basis ??
                  null;

                const risk =
                  row.risk ??
                  row.risiko ??
                  row.risk_level ??
                  row.riskLevel ??
                  row.status ??
                  null;

                return (
                  <tr key={row.id ?? idx} className="border-b last:border-b-0">
                    <td className="px-6 py-4 font-semibold">{zone}</td>
                    <td className="px-6 py-4">{location}</td>
                    <td className="px-6 py-4">
                      {basis == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        `${basis} cm`
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge value={risk} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
