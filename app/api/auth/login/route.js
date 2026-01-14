import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/db";

export async function POST(req) {
  const { email, password } = await req.json();
  const db = await getDb();

  const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);
  await db.end();

  if (!rows.length) return Response.json({ error: "invalid" }, { status: 401 });

  const u = rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return Response.json({ error: "invalid" }, { status: 401 });

  const token = jwt.sign(
    { sub: u.id, role: u.role, name: u.name },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: "8h" }
  );

  return Response.json({ token });
}
