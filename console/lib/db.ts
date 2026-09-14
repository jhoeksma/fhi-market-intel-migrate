import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __marketIntelPool: Pool | undefined;
}

export const pool =
  global.__marketIntelPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_URL?.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.__marketIntelPool = pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO market_intel, public");
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// A single client held across multiple statements, wrapped in BEGIN/COMMIT
// (with ROLLBACK on any error). `query()` above grabs a fresh pooled
// connection per call, so a bare BEGIN there has no effect on the calls
// that follow it — this is the one to reach for whenever a multi-step
// mutation needs to succeed or fail as a unit (e.g. bulk cleanup that
// deletes across deployment/hospital_site/hospital_group together).
export async function transaction<T>(
  fn: (txQuery: <R = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO market_intel, public");
    await client.query("BEGIN");
    const txQuery = async <R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<R[]> => {
      const result = await client.query(text, params);
      return result.rows as R[];
    };
    const out = await fn(txQuery);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
