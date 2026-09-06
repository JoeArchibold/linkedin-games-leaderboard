/*
 * Minimal migration runner for the leaderboard database.
 *
 * Applies each `db/migrations/NNN_*.sql` file in order exactly once, tracking
 * applied files in a `schema_migrations` table. Each migration runs inside its
 * own transaction (all-or-nothing) and is recorded only after it succeeds.
 *
 * Config comes from env (DATABASE_URL, DB_SSL). If DATABASE_URL is not already
 * in the environment, it is read from the repo-root `.env` file (simple
 * KEY=VALUE parse — no dotenv dependency). Common fallback if migrations are run
 * in a sandbox without env.
 *
 * Usage (from the repo root):
 *   node db/migrate.mjs
 *   # or via pnpm:
 *   pnpm migrate
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const ROOT_ENV = path.join(__dirname, "..", ".env");

function loadDotEnv() {
  if (process.env.DATABASE_URL) return;
  if (!fs.existsSync(ROOT_ENV)) return;
  const text = fs.readFileSync(ROOT_ENV, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

const client = new pg.Client({ connectionString, ssl });

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await client.connect();
  try {
    await ensureTable(client);
    const res = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(res.rows.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skipping (already applied): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`applied: ${file}`);
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log(`Done. ${count} migration(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
