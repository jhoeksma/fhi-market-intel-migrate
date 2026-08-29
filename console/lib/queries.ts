import { query } from "./db";

export interface RowCount {
  t: string;
  n: string;
}

export interface CountryCoverage {
  id: number;
  iso2: string;
  name: string;
  hospital_groups: string;
  hospital_sites: string;
  deployments: string;
  dc_confirmed: string;
  dc_assumed: string;
  dc_carve_out: string;
  dc_unconfirmed: string;
  procurement_notices: string;
  contacts: string;
}

export interface MarketSizeByYear {
  country_name: string;
  year: number;
  total_value: string;
  currency: string;
}

export interface SystemCategoryScope {
  scope: string;
  n: string;
}

export async function getRowCounts(): Promise<RowCount[]> {
  return query<RowCount>("SELECT t, n FROM v_row_counts ORDER BY t");
}

export async function getSystemCategoryScope(): Promise<SystemCategoryScope[]> {
  return query<SystemCategoryScope>(
    "SELECT scope, COUNT(*) n FROM system_category GROUP BY scope ORDER BY scope"
  );
}

export async function getCountryCoverage(): Promise<CountryCoverage[]> {
  return query<CountryCoverage>(`
    WITH hg AS (
      SELECT country_id, COUNT(*) n FROM hospital_group GROUP BY country_id
    ),
    hs AS (
      SELECT country_id, COUNT(*) n FROM hospital_site GROUP BY country_id
    ),
    dep AS (
      SELECT COALESCE(hs.country_id, hg.country_id) AS country_id, COUNT(DISTINCT d.id) n
      FROM deployment d
      LEFT JOIN hospital_site hs ON hs.id = d.hospital_site_id
      LEFT JOIN hospital_group hg ON hg.id = d.hospital_group_id
      GROUP BY COALESCE(hs.country_id, hg.country_id)
    ),
    depcat AS (
      SELECT COALESCE(hs.country_id, hg.country_id) AS country_id,
             dc.coverage_status,
             COUNT(*) n
      FROM deployment_category dc
      JOIN deployment d ON d.id = dc.deployment_id
      LEFT JOIN hospital_site hs ON hs.id = d.hospital_site_id
      LEFT JOIN hospital_group hg ON hg.id = d.hospital_group_id
      GROUP BY COALESCE(hs.country_id, hg.country_id), dc.coverage_status
    ),
    pn AS (
      SELECT country_id, COUNT(*) n FROM procurement_notice GROUP BY country_id
    ),
    ct AS (
      SELECT COALESCE(hs.country_id, hg.country_id, ha.country_id) AS country_id, COUNT(*) n
      FROM contact c
      LEFT JOIN hospital_site hs ON hs.id = c.hospital_site_id
      LEFT JOIN hospital_group hg ON hg.id = c.hospital_group_id
      LEFT JOIN health_authority ha ON ha.id = c.health_authority_id
      GROUP BY COALESCE(hs.country_id, hg.country_id, ha.country_id)
    )
    SELECT
      co.id, co.iso2, co.name,
      COALESCE(hg.n, 0) hospital_groups,
      COALESCE(hs.n, 0) hospital_sites,
      COALESCE(dep.n, 0) deployments,
      COALESCE((SELECT n FROM depcat WHERE country_id = co.id AND coverage_status = 'confirmed'), 0) dc_confirmed,
      COALESCE((SELECT n FROM depcat WHERE country_id = co.id AND coverage_status = 'assumed'), 0) dc_assumed,
      COALESCE((SELECT n FROM depcat WHERE country_id = co.id AND coverage_status = 'carve_out'), 0) dc_carve_out,
      COALESCE((SELECT n FROM depcat WHERE country_id = co.id AND coverage_status = 'unconfirmed'), 0) dc_unconfirmed,
      COALESCE(pn.n, 0) procurement_notices,
      COALESCE(ct.n, 0) contacts
    FROM country co
    LEFT JOIN hg ON hg.country_id = co.id
    LEFT JOIN hs ON hs.country_id = co.id
    LEFT JOIN dep ON dep.country_id = co.id
    LEFT JOIN pn ON pn.country_id = co.id
    LEFT JOIN ct ON ct.country_id = co.id
    ORDER BY co.name
  `);
}

export async function getMarketSizeByYear(): Promise<MarketSizeByYear[]> {
  return query<MarketSizeByYear>(`
    SELECT co.name AS country_name, mse.year, SUM(mse.value) AS total_value, mse.currency
    FROM market_size_estimate mse
    JOIN country co ON co.id = mse.country_id
    GROUP BY co.name, mse.year, mse.currency
    ORDER BY co.name, mse.year
  `);
}

export async function getLastUpdated(): Promise<string | null> {
  const rows = await query<{ latest: string | null }>(`
    SELECT GREATEST(
      (SELECT MAX(created_at) FROM supplier),
      (SELECT MAX(created_at) FROM market_size_estimate),
      (SELECT MAX(created_at) FROM procurement_notice),
      (SELECT MAX(created_at) FROM deployment)
    ) AS latest
  `);
  return rows[0]?.latest ?? null;
}
