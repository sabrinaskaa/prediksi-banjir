"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PrediksiTMA() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/predictions/water-level").then(r => r.json()).then(d => setRows(d.items || []));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prediksi TMA +1 jam</h1>
          <p className="text-slate-500">Baseline: trend sederhana dari pembacaan terakhir.</p>
        </div>
        <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-white border">Kembali</Link>
      </div>

      <div className="mt-6 bg-white border rounded-2xl overflow-hidden">
        <div className="p-4 border-b font-medium">Hasil Prediksi</div>
        <div className="p-4 overflow-auto">
          {!rows.length && <div className="text-slate-500 text-sm">Belum ada data TMA. Jalankan ingest dulu.</div>}
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr className="text-left">
                <th className="py-2">Pos</th>
                <th className="py-2">TMA terakhir (cm)</th>
                <th className="py-2">Prediksi +1 jam (cm)</th>
                <th className="py-2">Waktu target</th>
                <th className="py-2">Metode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2">{r.station}</td>
                  <td className="py-2">{r.last_cm}</td>
                  <td className="py-2 font-semibold">{r.predicted_cm}</td>
                  <td className="py-2">{r.target_time}</td>
                  <td className="py-2">{r.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
