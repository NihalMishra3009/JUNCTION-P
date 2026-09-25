import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import * as schema from "./schema";

// Ensure environment variables from .env.local are loaded if needed
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}

// Global pool instance to prevent connection exhaustion in Next.js dev server
declare global {
  // eslint-disable-next-line no-var
  var __junction_pg_pool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/junction_db";

  if (process.env.NODE_ENV === "production") {
    return new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  if (!global.__junction_pg_pool) {
    global.__junction_pg_pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return global.__junction_pg_pool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
