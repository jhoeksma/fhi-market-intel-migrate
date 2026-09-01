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
// 1 Sep 2026 — hospitalSites: when a payload record matches an EXISTING row
// (findOrCreate does not overwrite on match), any of beds/beds_notes present
// on the record are now also applied to that existing row via a plain
// parameterised UPDATE. This lets a later, smaller payload backfill just the
// bed counts for sites already imported by an earlier country payload,
// without duplicating rows or touching any other column.
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolClient } from "pg";

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

type AnyRec = Record<string, any>;

async function findOrCreate(
  client: PoolClient,
  table: string,
  matchSql: string,
  matchParams: any[],
  insertCols: string[],
  insertVals: any[]
): Promise<{ id: number; created: boolean }> {
  const existing = await client.query(`SELECT id FROM ${table} WHERE ${matchSql}`, matchParams);
  if (existing.rows.length) return { id: existing.rows[0].id, created: false };
  const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(",");
  const created = await client.query(
    `INSERT INTO ${table} (${insertCols.join(",")}) VALUES (${placeholders}) RETURNING id`,
    insertVals
  );
  return { id: created.rows[0].id, created: true };
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
  const counts: Record<string, number> = {
    sources: 0,
    suppliers: 0,
    healthAuthorities: 0,
    hospitalGroups: 0,
    hospitalSites: 0,
    hospitalSitesUpdated: 0,
    deployments: 0,
    deploymentCategories: 0,
    procurementNotices: 0,
  };
  const warnings: string[] = [];
  const keyMap = new Map<string, number>(); // arbitrary payload key -> db id

  function resolveKey(k: string | undefined | null, label: string): number | null {
    if (!k) return null;
    const id = keyMap.get(k);
    if (id === undefined) {
      throw new Error(`${label}: unresolved key "${k}"`);
    }
    return id;
  }

  try {
    await client.query("BEGIN");
    await client.query("SET search_path TO market_intel, public");

    const countryRows = (await client.query("SELECT id, iso2, name FROM country")).rows as {
      id: number;
      iso2: string;
      name: string;
    }[];
    const countryByIso2 = new Map(countryRows.map((c) => [c.iso2.toUpperCase(), c.id]));
    const countryByName = new Map(countryRows.map((c) => [c.name.toLowerCase(), c.id]));
    function countryId(rec: AnyRec): number {
      const iso = rec.country_iso2 ? countryByIso2.get(String(rec.country_iso2).toUpperCase()) : undefined;
      const byName = rec.country_name ? countryByName.get(String(rec.country_name).toLowerCase()) : undefined;
      const id = iso ?? byName;
      if (!id) throw new Error(`Unknown country for record ${JSON.stringify(rec.key ?? rec.name)}`);
      return id;
    }

    const supplierRows = (await client.query("SELECT id, name FROM supplier")).rows as {
      id: number;
      name: string;
    }[];
    const supplierByName = new Map(supplierRows.map((s) => [s.name.toLowerCase(), s.id]));
    // Auto-create suppliers referenced by name that don't exist yet (findOrCreate,
    // case-insensitive match) — this lets a country payload introduce new local
    // vendors (e.g. ChipSoft, NEXUS in the Netherlands) without a separate manual
    // step, while still reusing an existing row rather than duplicating it.
    async function supplierId(name: string | null | undefined): Promise<number | null> {
      if (!name) return null;
      const key = String(name).toLowerCase();
      const cached = supplierByName.get(key);
      if (cached) return cached;
      const created = await client.query("INSERT INTO supplier (name) VALUES ($1) RETURNING id", [name]);
      const newId = created.rows[0].id;
      supplierByName.set(key, newId);
      counts.suppliers++;
      return newId;
    }

    const catRows = (await client.query("SELECT id, name FROM system_category")).rows as {
      id: number;
      name: string;
    }[];
    const catByName = new Map(catRows.map((c) => [c.name.toLowerCase(), c.id]));
    function categoryId(name: string): number {
      const id = catByName.get(String(name).toLowerCase());
      if (!id) throw new Error(`Unknown system_category "${name}" — check GET /api/admin/import for exact names`);
      return id;
    }

    // --- sources ---
    for (const rec of body.sources ?? []) {
      const { id, created } = await findOrCreate(
        client,
        "source",
        rec.title ? "lower(title) = lower($1)" : "url = $1",
        [rec.title ?? rec.url],
        ["url", "tier", "publisher", "title", "date_accessed", "notes"],
        [rec.url ?? null, rec.tier ?? null, rec.publisher ?? null, rec.title ?? null, rec.date_accessed ?? null, rec.notes ?? null]
      );
      if (rec.key) keyMap.set(rec.key, id);
      if (created) counts.sources++;
    }

    // --- health authorities ---
    for (const rec of body.healthAuthorities ?? []) {
      const cid = countryId(rec);
      const source_id = rec.sourceKey ? resolveKey(rec.sourceKey, "healthAuthority.sourceKey") : rec.source_id ?? null;
      const { id, created } = await findOrCreate(
        client,
        "health_authority",
        "country_id = $1 AND lower(name) = lower($2)",
        [cid, rec.name],
        ["country_id", "name", "level", "description", "source_id"],
        [cid, rec.name, rec.level ?? null, rec.description ?? null, source_id]
      );
      if (rec.key) keyMap.set(rec.key, id);
      if (created) counts.healthAuthorities++;
    }

    // --- hospital groups ---
    for (const rec of body.hospitalGroups ?? []) {
      const cid = countryId(rec);
      const { id, created } = await findOrCreate(
        client,
        "hospital_group",
        "country_id = $1 AND lower(name) = lower($2)",
        [cid, rec.name],
        ["country_id", "name", "ownership_type", "notes"],
        [cid, rec.name, rec.ownership_type ?? null, rec.notes ?? null]
      );
      if (rec.key) keyMap.set(rec.key, id);
      if (created) counts.hospitalGroups++;
    }

    // --- hospital sites ---
    for (const rec of body.hospitalSites ?? []) {
      const cid = countryId(rec);
      const hospital_group_id = rec.hospitalGroupKey ? resolveKey(rec.hospitalGroupKey, "hospitalSite.hospitalGroupKey") : null;
      const health_authority_id = rec.healthAuthorityKey
        ? resolveKey(rec.healthAuthorityKey, "hospitalSite.healthAuthorityKey")
        : null;
      const { id, created } = await findOrCreate(
        client,
        "hospital_site",
        "country_id = $1 AND lower(name) = lower($2)",
        [cid, rec.name],
        [
          "country_id",
          "hospital_group_id",
          "health_authority_id",
          "name",
          "address",
          "city",
          "postcode",
          "beds",
          "beds_notes",
          "site_type",
          "ownership_type",
          "notes",
        ],
        [
          cid,
          hospital_group_id,
          health_authority_id,
          rec.name,
          rec.address ?? null,
          rec.city ?? null,
          rec.postcode ?? null,
          rec.beds ?? null,
          rec.beds_notes ?? null,
          rec.site_type ?? null,
          rec.ownership_type ?? null,
          rec.notes ?? null,
        ]
      );
      if (!created && (rec.beds !== undefined || rec.beds_notes !== undefined)) {
        // Existing row matched by name — findOrCreate does not overwrite,
        // so apply a beds/beds_notes-only backfill here when the payload
        // supplies them. Every other column on an existing row is left
        // untouched.
        await client.query(
          `UPDATE hospital_site SET
             beds = COALESCE($2, beds),
             beds_notes = COALESCE($3, beds_notes)
           WHERE id = $1`,
          [id, rec.beds ?? null, rec.beds_notes ?? null]
        );
        counts.hospitalSitesUpdated++;
      }
      if (rec.key) keyMap.set(rec.key, id);
      if (created) counts.hospitalSites++;
    }

    // --- deployments (+ nested deployment_category rows) ---
    for (const rec of body.deployments ?? []) {
      const hospital_site_id = rec.hospitalSiteKey ? resolveKey(rec.hospitalSiteKey, "deployment.hospitalSiteKey") : null;
      const hospital_group_id = rec.hospitalGroupKey ? resolveKey(rec.hospitalGroupKey, "deployment.hospitalGroupKey") : null;
      if (!hospital_site_id && !hospital_group_id) {
        throw new Error(`deployment ${rec.key ?? "?"}: needs hospitalSiteKey or hospitalGroupKey`);
      }
      const supplier_id = await supplierId(rec.supplier);
      let product_id: number | null = null;
      if (supplier_id && rec.product) {
        const existingProd = await client.query(
          "SELECT id FROM product WHERE supplier_id=$1 AND lower(name)=lower($2)",
          [supplier_id, rec.product]
        );
        if (existingProd.rows.length) {
          product_id = existingProd.rows[0].id;
        } else {
          const createdProd = await client.query(
            "INSERT INTO product (supplier_id, name) VALUES ($1,$2) RETURNING id",
            [supplier_id, rec.product]
          );
          product_id = createdProd.rows[0].id;
        }
      }
      const matchSql = hospital_site_id
        ? "hospital_site_id = $1 AND supplier_id IS NOT DISTINCT FROM $2 AND product_id IS NOT DISTINCT FROM $3"
        : "hospital_group_id = $1 AND supplier_id IS NOT DISTINCT FROM $2 AND product_id IS NOT DISTINCT FROM $3";
      const matchParams = [hospital_site_id ?? hospital_group_id, supplier_id, product_id];
      const { id: deploymentId, created } = await findOrCreate(
        client,
        "deployment",
        matchSql,
        matchParams,
        [
          "hospital_site_id",
          "hospital_group_id",
          "supplier_id",
          "product_id",
          "contract_value",
          "currency",
          "install_date",
          "expiry_date",
          "procurement_framework",
          "status",
          "evidence_tier",
          "notes",
        ],
        [
          hospital_site_id,
          hospital_group_id,
          supplier_id,
          product_id,
          rec.contract_value ?? null,
          rec.currency ?? null,
          rec.install_date ?? null,
          rec.expiry_date ?? null,
          rec.procurement_framework ?? null,
          rec.status ?? "unconfirmed",
          rec.evidence_tier ?? null,
          rec.notes ?? null,
        ]
      );
      if (rec.key) keyMap.set(rec.key, deploymentId);
      if (created) counts.deployments++;

      for (const cat of rec.categories ?? []) {
        const system_category_id = categoryId(cat.name);
        const existingCat = await client.query(
          "SELECT id FROM deployment_category WHERE deployment_id=$1 AND system_category_id=$2",
          [deploymentId, system_category_id]
        );
        if (existingCat.rows.length) {
          await client.query(
            "UPDATE deployment_category SET coverage_status=$1, evidence_tier=$2, notes=$3 WHERE id=$4",
            [cat.coverage_status, cat.evidence_tier ?? null, cat.notes ?? null, existingCat.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO deployment_category (deployment_id, system_category_id, coverage_status, evidence_tier, notes)
             VALUES ($1,$2,$3,$4,$5)`,
            [deploymentId, system_category_id, cat.coverage_status, cat.evidence_tier ?? null, cat.notes ?? null]
          );
          counts.deploymentCategories++;
        }
      }
    }

    // --- procurement notices ---
    for (const rec of body.procurementNotices ?? []) {
      const cid = countryId(rec);
      const hospital_group_id = rec.hospitalGroupKey ? resolveKey(rec.hospitalGroupKey, "procurementNotice.hospitalGroupKey") : null;
      const hospital_site_id = rec.hospitalSiteKey ? resolveKey(rec.hospitalSiteKey, "procurementNotice.hospitalSiteKey") : null;
      const health_authority_id = rec.healthAuthorityKey
        ? resolveKey(rec.healthAuthorityKey, "procurementNotice.healthAuthorityKey")
        : null;
      const awarded_supplier_id = await supplierId(rec.awarded_supplier);
      const source_id = rec.sourceKey ? resolveKey(rec.sourceKey, "procurementNotice.sourceKey") : null;
      const { created } = await findOrCreate(
        client,
        "procurement_notice",
        "country_id = $1 AND lower(title) = lower($2)",
        [cid, rec.title],
        [
          "country_id",
          "hospital_group_id",
          "hospital_site_id",
          "health_authority_id",
          "notice_id",
          "portal",
          "cpv_codes",
          "title",
          "publication_date",
          "award_date",
          "contract_start_date",
          "contract_expiry_date",
          "estimated_value",
          "awarded_value",
          "currency",
          "awarded_supplier_id",
          "is_framework",
          "lot_description",
          "status",
          "source_id",
        ],
        [
          cid,
          hospital_group_id,
          hospital_site_id,
          health_authority_id,
          rec.notice_id ?? null,
          rec.portal ?? null,
          rec.cpv_codes ?? null,
          rec.title,
          rec.publication_date ?? null,
          rec.award_date ?? null,
          rec.contract_start_date ?? null,
          rec.contract_expiry_date ?? null,
          rec.estimated_value ?? null,
          rec.awarded_value ?? null,
          rec.currency ?? null,
          awarded_supplier_id,
          rec.is_framework ?? false,
          rec.lot_description ?? null,
          rec.status ?? "published",
          source_id,
        ]
      );
      if (created) counts.procurementNotices++;
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, counts, warnings });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  } finally {
    client.release();
  }
}
