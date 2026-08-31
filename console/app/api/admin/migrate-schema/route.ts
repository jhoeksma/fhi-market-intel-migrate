// Idempotent, additive schema-migration endpoint for the console's own
// Postgres connection. Deliberately NOT a generic SQL-exec surface: it runs
// only the fixed list of statements below, each written as
// "IF NOT EXISTS" / "IF EXISTS" so hitting this endpoint again is always
// safe (unlike the loader service's /migrate, which re-runs the full data
// seed and would duplicate rows in tables with no unique constraint —
// source, supplier_revenue, national_programme). Use this endpoint for
// schema-only changes (new columns, indexes) discovered mid-backfill;
// add the new statement to the list and hit the endpoint once.
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function checkAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_IMPORT_TOKEN;
  if (!token) return false;
  return req.headers.get("x-import-token") === token;
}

const STATEMENTS: string[] = [
  // 30 Aug 2026 — address/postcode on hospital_site, added for the
  // Netherlands backfill (supplier value requires precise site location).
  `ALTER TABLE hospital_site ADD COLUMN IF NOT EXISTS address TEXT`,
  `ALTER TABLE hospital_site ADD COLUMN IF NOT EXISTS postcode TEXT`,
];

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = await pool.connect();
  const ran: string[] = [];
  try {
    await client.query("SET search_path TO market_intel, public");
    for (const stmt of STATEMENTS) {
      await client.query(stmt);
      ran.push(stmt);
    }
    return NextResponse.json({ ok: true, ran });
  } catch (err: any) {
    return NextResponse.json({ ok: false, ran, error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
