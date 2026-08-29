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
