import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-xl bg-white border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Dashboard Monitoring Banjir Semarang</h1>
        <p className="text-slate-500 mt-2">
          Kamu hanya bisa membuka dashboard ketika sudah login ya.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="px-4 py-2 rounded-xl bg-sky-600 text-white font-medium">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
