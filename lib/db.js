// lib/db.js
import mysql from "mysql2/promise";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v)
    throw new Error(
      `Missing DB env: ${name}. (Stop using localhost in production!)`
    );
  return v;
}

function getDbConfig() {
  const host = requiredEnv("DB_HOST");
  const user = requiredEnv("DB_USER");
  const password = requiredEnv("DB_PASSWORD");
  const database = requiredEnv("DB_NAME");
  const port = Number(process.env.DB_PORT || "4000");

  // TiDB Cloud serverless: wajib TLS
  // Kalau kamu punya CA PEM, taruh di env DB_SSL_CA (isi teks PEM, bukan path)
  const sslCA = process.env.DB_SSL_CA;
  const ssl =
    process.env.DB_SSL === "0"
      ? undefined
      : sslCA
      ? { ca: sslCA, rejectUnauthorized: true }
      : { rejectUnauthorized: true };

  return {
    host,
    user,
    password,
    database,
    port,
    ssl,
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

// cache pool global biar gak bikin pool baru tiap request (serverless/dev aman)
let _pool = globalThis.__db_pool;
if (!_pool) {
  _pool = mysql.createPool(getDbConfig());
  globalThis.__db_pool = _pool;
}

export const pool = _pool;

export function getDb() {
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function execute(sql, params = []) {
  const [res] = await pool.execute(sql, params);
  return res;
}
