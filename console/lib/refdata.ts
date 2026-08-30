import { query } from "./db";

export interface CountryOption {
  id: number;
  iso2: string;
  name: string;
}

export interface NamedOption {
  id: number;
  name: string;
  country_id: number;
}

export interface SourceOption {
  id: number;
  title: string | null;
  publisher: string | null;
  tier: number;
  url: string | null;
}

export interface SupplierOption {
  id: number;
  name: string;
}

export interface ProductOption {
  id: number;
  name: string;
  supplier_id: number;
}

export interface SystemCategoryOption {
  id: number;
  name: string;
  scope: string;
  category_group: string;
}

export async function getCountries(): Promise<CountryOption[]> {
  return query<CountryOption>("SELECT id, iso2, name FROM country ORDER BY name");
}

export async function getHealthAuthorities(): Promise<
  (NamedOption & { level: string | null })[]
> {
  return query<NamedOption & { level: string | null }>(
    "SELECT id, name, country_id, level FROM health_authority ORDER BY name"
  );
}

export async function getHospitalGroups(): Promise<
  (NamedOption & { ownership_type: string | null })[]
> {
  return query<NamedOption & { ownership_type: string | null }>(
    "SELECT id, name, country_id, ownership_type FROM hospital_group ORDER BY name"
  );
}

export interface HospitalSiteOption extends NamedOption {
  hospital_group_id: number | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  beds: number | null;
}

export async function getHospitalSites(): Promise<HospitalSiteOption[]> {
  return query<HospitalSiteOption>(
    "SELECT id, name, country_id, hospital_group_id, address, city, postcode, beds FROM hospital_site ORDER BY name"
  );
}

export async function getSuppliers(): Promise<SupplierOption[]> {
  return query<SupplierOption>("SELECT id, name FROM supplier ORDER BY name");
}

export async function getProducts(): Promise<ProductOption[]> {
  return query<ProductOption>(
    "SELECT id, name, supplier_id FROM product ORDER BY name"
  );
}

export async function getSources(): Promise<SourceOption[]> {
  return query<SourceOption>(
    "SELECT id, title, publisher, tier, url FROM source ORDER BY created_at DESC"
  );
}

export async function getSystemCategories(): Promise<SystemCategoryOption[]> {
  return query<SystemCategoryOption>(
    "SELECT id, name, scope, category_group FROM system_category ORDER BY scope, name"
  );
}

export function sourceLabel(s: SourceOption): string {
  const bits = [s.title ?? s.url ?? `Source #${s.id}`, `tier ${s.tier}`];
  if (s.publisher) bits.splice(1, 0, s.publisher);
  return bits.join(" · ");
}
