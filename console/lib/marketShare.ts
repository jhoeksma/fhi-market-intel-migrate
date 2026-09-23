import { query } from "./db";
import { canonicalSupplierName } from "./supplierAliases";

export interface SupplierShare {
  name: string;
  count: number;
}

export interface CountryMarketShare {
  iso2: string;
  name: string;
  sites: number;
  confirmedTotal: number;
  coveragePct: number;
  suppliers: SupplierShare[];
}

interface SiteCountRow {
  id: number;
  iso2: string;
  name: string;
  sites: string; // COUNT(...) comes back as text from pg
}

interface SupplierCountRow {
  country_id: number;
  supplier_name: string | null;
  n: string;
}

// Powers Overview, Country Market Share and Compare Countries — all three
// read from the same per-country/per-supplier shape, so one query pair
// serves all of them; the frontend slices client-side (a single country,
// or a checkbox-selected subset). This intentionally folds what the
// dashboard-proposal.md roadmap called two endpoints (`/market-share` and
// `/compare`) into one, since they'd otherwise run the identical query.
export async function getMarketShare(): Promise<CountryMarketShare[]> {
  const [siteRows, supplierRows] = await Promise.all([
    query<SiteCountRow>(`
      SELECT co.id, co.iso2, co.name, COUNT(hs.id)::text AS sites
      FROM country co
      JOIN hospital_site hs ON hs.country_id = co.id
      GROUP BY co.id, co.iso2, co.name
    `),
    query<SupplierCountRow>(`
      SELECT
        COALESCE(hs.country_id, hg.country_id) AS country_id,
        s.name AS supplier_name,
        COUNT(*)::text AS n
      FROM deployment d
      LEFT JOIN hospital_site hs ON hs.id = d.hospital_site_id
      LEFT JOIN hospital_group hg ON hg.id = d.hospital_group_id
      LEFT JOIN supplier s ON s.id = d.supplier_id
      WHERE d.status = 'confirmed'
      GROUP BY COALESCE(hs.country_id, hg.country_id), s.name
    `),
  ]);

  // Aggregate supplier rows by country, canonicalising the name and merging
  // any raw variants (see supplierAliases.ts) into one bucket per country.
  const byCountry = new Map<number, Map<string, number>>();
  for (const row of supplierRows) {
    if (row.country_id === null || row.country_id === undefined) continue;
    const canonical = canonicalSupplierName(row.supplier_name);
    const bucket = byCountry.get(row.country_id) ?? new Map<string, number>();
    bucket.set(canonical, (bucket.get(canonical) ?? 0) + parseInt(row.n, 10));
    byCountry.set(row.country_id, bucket);
  }

  const out: CountryMarketShare[] = [];
  for (const row of siteRows) {
    const sites = parseInt(row.sites, 10) || 0;
    const supplierMap = byCountry.get(row.id) ?? new Map<string, number>();
    const suppliers: SupplierShare[] = [...supplierMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const confirmedTotal = suppliers.reduce((sum, s) => sum + s.count, 0);
    if (sites === 0 && confirmedTotal === 0) continue; // no data at all for this country yet
    out.push({
      iso2: row.iso2,
      name: row.name,
      sites,
      confirmedTotal,
      coveragePct: sites ? Math.round((confirmedTotal / sites) * 1000) / 10 : 0,
      suppliers,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
