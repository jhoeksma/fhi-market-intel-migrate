import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { canonicalSupplierName } from "@/lib/supplierAliases";

export const dynamic = "force-dynamic";

interface SearchRow {
  iso2: string;
  country_name: string;
  group_name: string | null;
  site_name: string;
  city: string | null;
  supplier_name: string | null;
  product_name: string | null;
}

const RESULT_CAP = 500;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const country = (searchParams.get("country") ?? "").trim().toUpperCase();
  // "yes" -> only sites with a confirmed supplier, "no" -> only sites without one
  const supplierFilter = (searchParams.get("supplier") ?? "").trim().toLowerCase();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (country) {
    params.push(country);
    conditions.push(`co.iso2 = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    conditions.push(
      `(hg.name ILIKE $${idx} OR hs.name ILIKE $${idx} OR hs.city ILIKE $${idx} OR s.name ILIKE $${idx})`
    );
  }
  if (supplierFilter === "yes") {
    conditions.push("s.id IS NOT NULL");
  } else if (supplierFilter === "no") {
    conditions.push("s.id IS NULL");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const rows = await query<SearchRow>(
      `
      SELECT
        co.iso2, co.name AS country_name,
        hg.name AS group_name,
        hs.name AS site_name,
        hs.city,
        s.name AS supplier_name,
        p.name AS product_name
      FROM hospital_site hs
      JOIN country co ON co.id = hs.country_id
      LEFT JOIN hospital_group hg ON hg.id = hs.hospital_group_id
      LEFT JOIN LATERAL (
        SELECT d.supplier_id, d.product_id
        FROM deployment d
        WHERE d.hospital_site_id = hs.id AND d.status = 'confirmed'
        ORDER BY d.id
        LIMIT 1
      ) dep ON true
      LEFT JOIN supplier s ON s.id = dep.supplier_id
      LEFT JOIN product p ON p.id = dep.product_id
      ${where}
      ORDER BY co.name, hg.name NULLS LAST, hs.name
      LIMIT ${RESULT_CAP}
      `,
      params
    );

    const results = rows.map((r) => ({
      country: r.iso2,
      countryName: r.country_name,
      group: r.group_name ?? r.site_name,
      site: r.site_name,
      city: r.city,
      supplier: r.supplier_name ? canonicalSupplierName(r.supplier_name) : null,
      product: r.product_name,
    }));

    return NextResponse.json({ results, capped: results.length === RESULT_CAP });
  } catch (err) {
    console.error("GET /api/v1/search failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
