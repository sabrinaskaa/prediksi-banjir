// /lib/db.js
import mysql from "mysql2/promise";

let pool;

/**
 * TiDB Serverless requires TLS/SSL.
 * We read CA from env (DB_SSL_CA) so it works on Vercel without file paths.
 */
function buildSSLConfig() {
  const ca = process.env.DB_SSL_CA;

  // If CA isn't provided, we still try SSL but without CA pinning.
  // (Better: always provide CA)
  if (!ca) return { rejectUnauthorized: true };

  return {
    ca,
    rejectUnauthorized: true,
  };
}

export function getPool() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = Number(process.env.DB_PORT || 4000);

  // Stop silent fallback to localhost (biar ga kejadian lagi)
  const missing = [];
  if (!host) missing.push("DB_HOST");
  if (!user) missing.push("DB_USER");
  if (!password) missing.push("DB_PASSWORD");
  if (!database) missing.push("DB_NAME");
  if (missing.length) {
    throw new Error(
      `Missing DB env: ${missing.join(
        ", "
      )}. (Stop using localhost in production!)`
    );
  }

  pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    ssl: buildSSLConfig(),

    // pool tuning
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,

    // important for TiDB serverless latency spikes
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  return pool;
}

export async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}
