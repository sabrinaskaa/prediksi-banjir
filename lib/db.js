import mysql from "mysql2/promise";

function getCa() {
  const caRaw = process.env.TIDB_CA_PEM;
  if (!caRaw) return null;
  return caRaw.includes("\\n") ? caRaw.replace(/\\n/g, "\n") : caRaw;
}

export async function getDb() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL missing");
  const ca = getCa();
  if (!ca) throw new Error("TIDB_CA_PEM missing (TiDB Cloud requires TLS)");

  return mysql.createConnection({
    uri,
    connectTimeout: 15000,
    ssl: { ca, rejectUnauthorized: true },
  });
}
