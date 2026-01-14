import mysql from "mysql2/promise";

// IMPORTANT:
// - Jangan pernah pool.end() di serverless (Vercel). Itu bikin "Pool is closed" random.
// - Reuse pool via globalThis biar nggak bikin koneksi kebanyakan.

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function buildSSL() {
  // TiDB Cloud serverless wajib TLS.
  // Kamu bisa taruh PEM di env DB_SSL_CA.
  const ca = process.env.DB_SSL_CA?.trim();
  if (!ca) {
    // fallback: kalau kamu pakai TiDB Cloud, ini harusnya ada.
    // Tapi biar jelas error-nya:
    throw new Error("Missing env: DB_SSL_CA (TiDB Cloud requires TLS/CA)");
  }
  return { ca, rejectUnauthorized: true };
}

function createPool() {
  const host = mustEnv("DB_HOST");
  const user = mustEnv("DB_USER");
  const password = mustEnv("DB_PASSWORD");
  const database = mustEnv("DB_NAME");
  const port = Number(process.env.DB_PORT || "4000");

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: buildSSL(),

    // serverless-friendly
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60_000,
    queueLimit: 0,

    // TiDB Cloud: keep things simple
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    // IMPORTANT: Jangan multiStatements kecuali kamu ngerti risikonya
    multipleStatements: false,
  });
}

export function getDB() {
  if (!globalThis.__tidbPool) {
    globalThis.__tidbPool = createPool();
  }
  return globalThis.__tidbPool;
}

// helper wrapper biar rapi di route
export async function dbQuery(sql, params = []) {
  const pool = getDB();
  const [rows] = await pool.query(sql, params);
  return rows;
}
