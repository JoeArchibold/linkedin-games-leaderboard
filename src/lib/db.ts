import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/**
 * Return a lazily-initialized connection pool. Created on first use so that
 * importing this module (e.g. during `next build` config collection) does not
 * fail when DATABASE_URL is absent in a build-time environment.
 */
export function getPool(): Pool {
  if (globalForPg.pgPool) return globalForPg.pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  // Reuse the pool across HMR reloads in development.
  if (process.env.NODE_ENV !== "production") {
    globalForPg.pgPool = pool;
  }

  return pool;
}
