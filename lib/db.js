import mysql from "mysql2/promise";

let pool;

export function getDb() {
  if (pool) return pool;

  const host = process.env.TIDB_HOST || process.env.MYSQL_HOST;
  const port = Number(process.env.TIDB_PORT || process.env.MYSQL_PORT || 4000);
  const user = process.env.TIDB_USER || process.env.MYSQL_USER;
  const password = process.env.TIDB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.TIDB_DATABASE || process.env.MYSQL_DATABASE;

  const ca = process.env.TIDB_CA_CERT;

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    ssl: { ca: process.env.TIDB_CA_CERT, rejectUnauthorized: true },
  });

  return pool;
}
