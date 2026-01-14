import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    DB_HOST: process.env.DB_HOST ? "SET" : "MISSING",
    DB_PORT: process.env.DB_PORT ? "SET" : "MISSING",
    DB_USER: process.env.DB_USER ? "SET" : "MISSING",
    DB_PASSWORD: process.env.DB_PASSWORD ? "SET" : "MISSING",
    DB_NAME: process.env.DB_NAME ? "SET" : "MISSING",
    DB_SSL_CA: process.env.DB_SSL_CA ? "SET" : "MISSING",
  });
}
