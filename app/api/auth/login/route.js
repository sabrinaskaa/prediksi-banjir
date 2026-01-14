import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const rows = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows?.length) {
      return NextResponse.json(
        { ok: false, message: "Email/password salah." },
        { status: 401 }
      );
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return NextResponse.json(
        { ok: false, message: "Email/password salah." },
        { status: 401 }
      );
    }

    // minimal response (kalau mau JWT, nanti sekalian)
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { ok: false, message: "Server error saat login." },
      { status: 500 }
    );
  }
}
