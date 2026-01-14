import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getCa() {
  const caRaw = process.env.TIDB_CA_PEM;
  if (!caRaw) return null;
  return caRaw.includes("\\n") ? caRaw.replace(/\\n/g, "\n") : caRaw;
}

async function connectWithRetry(uri, retries = 12) {
  const ca = getCa();
  let lastErr = null;

  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mysql.createConnection({
        uri,
        connectTimeout: 15000,
        ssl: ca
          ? {
              ca,
              rejectUnauthorized: true,
            }
          : undefined,
      });
      return conn;
    } catch (e) {
      lastErr = e;
      console.log(
        `⏳ DB connect failed (attempt ${i}/${retries}) -> ${
          e.code || e.message
        }`
      );
      await sleep(2000);
    }
  }

  throw lastErr;
}

/**
 * Split SQL file into individual statements safely enough for schema files.
 * - Removes comments (-- ... and /* ... * /)
 * - Splits by semicolon outside of strings
 */
function splitSqlStatements(sql) {
  // remove /* ... */ comments
  let s = sql.replace(/\/\*[\s\S]*?\*\//g, "\n");
  // remove -- comments (to end of line)
  s = s.replace(/^\s*--.*$/gm, "");
  s = s.replace(/^\s*#.*$/gm, "");

  const out = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const prev = s[i - 1];

    // toggle string state (ignore escaped quotes)
    if (ch === "'" && !inDouble && prev !== "\\") inSingle = !inSingle;
    if (ch === `"` && !inSingle && prev !== "\\") inDouble = !inDouble;

    if (ch === ";" && !inSingle && !inDouble) {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = "";
    } else {
      cur += ch;
    }
  }

  const tail = cur.trim();
  if (tail) out.push(tail);

  return out;
}

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL missing in .env.local");
  if (!process.env.TIDB_CA_PEM)
    throw new Error("TIDB_CA_PEM missing in .env.local (TiDB Cloud wajib TLS)");

  const schemaCandidates = [
    path.join(process.cwd(), "db", "schema.sql"),
    path.join(process.cwd(), "schema.sql"),
  ];
  const schemaPath = schemaCandidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(
      `schema.sql not found. Checked: ${schemaCandidates.join(", ")}`
    );
  }

  const schemaRaw = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSqlStatements(schemaRaw);

  console.log(`🧩 Applying schema from: ${schemaPath}`);
  console.log(`🧩 Statements: ${statements.length}`);

  const db = await connectWithRetry(uri);

  // run sequentially so we know exactly which one fails
  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    try {
      await db.query(stmt);
    } catch (e) {
      console.error(`❌ Failed at statement #${idx + 1}:\n${stmt}\n`);
      throw e;
    }
  }

  await db.end();
  console.log("✅ init_db ok: schema applied (single-statement mode, TLS)");
}

main().catch((e) => {
  console.error("❌ init_db failed:", e);
  process.exit(1);
});
