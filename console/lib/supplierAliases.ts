// Cross-country supplier name canonicalisation for the dashboard's Market
// Share / Compare Countries views.
//
// WHY THIS EXISTS AS A CODE MAP (not a DB table) FOR NOW: the dashboard-
// proposal.md doc (in the project) recommends porting the buyer/supplier
// identity-resolution pattern already proven in the NHS opportunities
// tracker (app/matching.py, Buyer.normalized_name, a daily dedup cron, and
// an EntityReviewFlag admin queue resolved via merge/supersede/dismiss)
// rather than a bare lookup table. That's real schema + admin-UI work and
// deliberately NOT part of this first working prototype. This file is the
// stand-in: it mirrors the aliasing the Python report-builders already did
// per-country, collected in one place so the API can compute cross-country
// share once instead of every caller re-deriving it.
//
// Source of truth for the raw strings below: the supplierName values in
// each country's import payload (at/be/cz/dk/fi/hu/pl/se_payload.json),
// which is what supplier.name was findOrCreate()'d from at import time.
// If someone has since cleaned up a name directly in /admin, this map may
// drift — that's exactly the kind of drift the real reconciliation queue
// (see above) is meant to catch; this file won't.
//
// Keys are lower-cased + trimmed for matching; values are the canonical
// display name shown in the dashboard.
export const SUPPLIER_ALIASES: Record<string, string> = {
  // Cerner / Oracle Health, spelled differently in every country that has it
  "oracle health (cerner)": "Cerner / Oracle Health",
  "oracle health (formerly cerner)": "Cerner / Oracle Health",
  "cerner": "Cerner / Oracle Health",
  "oracle": "Cerner / Oracle Health",

  // CompuGroup Medical, country-suffixed legal entity in Poland
  "compugroup medical polska sp. z o.o.": "CompuGroup Medical",

  // Poland
  "asseco poland s.a.": "Asseco Poland",
  "kamsoft s.a.": "KAMSOFT",
  "cloudimed sp. z o.o.": "CloudiMed",
  "marcel spolka akcyjna": "Marcel S.A. (LIS module)",
  "sygnity s.a. (acquired comarch's his business, oct 2025)": "Sygnity (ex-Comarch)",
  "konsultant it sp. z o.o.": "Nexus Polska (HIS ESKULAP)",
  "konsultant it sp. z o.o. (nexus polska eskulap reseller)": "Nexus Polska (HIS ESKULAP)",
  "nexus polska sp. z o.o.": "Nexus Polska (HIS ESKULAP)",

  // Czech Republic
  "agel a.s. / medical systems (subsidiary)": "AGEL / Medical Systems",
  "medical systems (agel subsidiary)": "AGEL / Medical Systems",
  "icz a.s.": "ICZ",
  "stapro s.r.o.": "STAPRO",
  "steiner, s.r.o.": "Steiner",
  "medicalc software s.r.o.": "Medicalc software",

  // Hungary — all three strings describe the same national e-MedSolution system
  "eszfk": "e-MedSolution (ESZFK / T-Systems)",
  "t-systems magyarorszag": "e-MedSolution (ESZFK / T-Systems)",
  "t-systems magyarorszag (built) / eszfk (operates)": "e-MedSolution (ESZFK / T-Systems)",
  "debreceni egyetem (self-developed)": "UD MED (Debrecen, self-developed)",

  // Belgium
  "xperthis sa": "Xperthis / Zorgi",
  "zorgi (xperthis care)": "Xperthis / Zorgi",
  "itémedical": "Itemedical / MetaVision",
  "nexuzhealth nv": "Nexuzhealth",

  // Finland
  "apotti oy": "Apotti",
  "esko systems oy": "Esko Systems",
  "una oy": "UNA Oy",

  // Placeholder / non-vendor strings that should fall into "Other / unnamed"
  // rather than showing up as their own (fake) supplier slice.
  "unknown / unconfirmed": "Other / unnamed",
  "akim programme (vendor unnamed in audit excerpt)": "Other / unnamed",
};

export function canonicalSupplierName(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Other / unnamed";
  const key = raw.trim().toLowerCase();
  return SUPPLIER_ALIASES[key] ?? raw.trim();
}
