// One-off bulk-import endpoint for populating country datasets (Ireland, and
// subsequent EU countries) without hundreds of manual admin-console form
// submissions. Protected by a shared-secret header so it can't be hit by
// randoms even though this console has no other auth layer.
//
// GET  /api/admin/import -> reference data (countries, system categories,
//                            suppliers) so a payload can be built with the
//                            exact names/codes the DB already has.
// POST /api/admin/import -> { sources, healthAuthorities, hospitalGroups,
//                              hospitalSites, deployments, procurementNotices }
//                            All records within one request are inserted in
//                            a single transaction. Records may reference
//                            each other via an arbitrary string "key" set on
//                            the record and referenced by "<field>Key"
//                            (e.g. hospitalGroupKey) elsewhere in the same
//                            payload. Existing rows are matched by natural
//                            key (country + lower(name), etc.) and reused
//                            rather than duplicated, so a payload can be
//                            safely re-posted.
//
// The actual upsert logic lives in lib/importPayload.ts so it can also be
// called in-process from the admin console's own Import page (Server
// Action) — see lib/actions.ts / app/admin/import. This route stays as the
// scriptable path (curl, CI, etc.) for anyone who has the token.
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { runImportPayload, type AnyRec } from "@/lib/importPayload";

function checkAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_IMPORT_TOKEN;
  if (!token) return false;
  return req.headers.get("x-import-token") === token;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO market_intel, public");
    const countries = (await client.query("SELECT id, iso2, name FROM country ORDER BY name")).rows;
    const systemCategories = (
      await client.query("SELECT id, name, scope, category_group FROM system_category ORDER BY scope, name")
    ).rows;
    const suppliers = (await client.query("SELECT id, name FROM supplier ORDER BY name")).rows;
    return NextResponse.json({ ok: true, countries, systemCategories, suppliers });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: AnyRec;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET search_path TO market_intel, public");
    const { counts, warnings } = await runImportPayload(client, body);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, counts, warnings });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  } finally {
    client.release();
  }
}
