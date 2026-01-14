"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("admin@semarang.go.id");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  async function submit(e: any) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return setErr("Login gagal. Cek email/password.");
    const { token } = await res.json();
    localStorage.setItem("token", token);
    r.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border">
        <h1 className="text-2xl font-semibold">Login Petugas</h1>
        <p className="text-slate-500 mt-1">Dashboard Monitoring Banjir Semarang</p>

        <div className="mt-6 space-y-3">
          <label className="text-sm text-slate-600">Email</label>
          <input
            className="w-full border rounded-xl p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="text-sm text-slate-600">Password</label>
          <input
            className="w-full border rounded-xl p-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="w-full rounded-xl p-3 bg-sky-600 hover:bg-sky-700 text-white font-medium">
            Masuk
          </button>

          <div className="text-xs text-slate-500 mt-2">
            Default demo: <span className="font-medium">admin@semarang.go.id</span> /{" "}
            <span className="font-medium">admin123</span>
          </div>
        </div>
      </form>
    </div>
  );
}
