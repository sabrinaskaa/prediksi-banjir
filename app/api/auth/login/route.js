import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return Response.json({ ok: false, message: "Email & password wajib." }, { status: 400 });
    }

    const rows = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return Response.json({ ok: false, message: "Email / password salah." }, { status: 401 });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return Response.json({ ok: false, message: "Email / password salah." }, { status: 401 });
    }

    // versi simpel: balikkan user (nanti kalau mau JWT/cookie bisa kita rapihin)
    return Response.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error("login error:", e);
    return Response.json({ ok: false, message: e.message || "Login error" }, { status: 500 });
  }
}
