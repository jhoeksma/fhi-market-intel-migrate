import {
  getRowCounts,
  getSystemCategoryScope,
  getCountryCoverage,
  getMarketSizeByYear,
  getLastUpdated,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseInt(v, 10) || 0;
}

function fmt(v: number): string {
  return new Intl.NumberFormat("en-GB").format(v);
}

function fmtMoney(v: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-fhi-slate">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-fhi-ink">
        {value}
      </div>
      {sublabel && <div className="mt-0.5 text-xs text-fhi-slate">{sublabel}</div>}
    </div>
  );
}

function StatusCell({ value, kind }: { value: number; kind: "confirmed" | "assumed" | "carveout" | "unconfirmed" }) {
  if (value === 0) {
    return <span className="text-slate-300 tabular-nums">0</span>;
  }
  const colors: Record<string, string> = {
    confirmed: "text-status-confirmed",
    assumed: "text-status-assumed",
    carveout: "text-status-carveout",
    unconfirmed: "text-status-unconfirmed",
  };
  return <span className={`font-medium tabular-nums ${colors[kind]}`}>{fmt(value)}</span>;
}

export default async function CoveragePage() {
  const [rowCounts, scopeCounts, countries, marketSize, lastUpdated] =
    await Promise.all([
      getRowCounts(),
      getSystemCategoryScope(),
      getCountryCoverage(),
      getMarketSizeByYear(),
      getLastUpdated(),
    ]);

  const countMap = Object.fromEntries(rowCounts.map((r) => [r.t, n(r.n)]));
  const coreCount = n(scopeCounts.find((s) => s.scope === "core")?.n);
  const extendedCount = n(scopeCounts.find((s) => s.scope === "extended")?.n);

  const marketByYear = new Map<number, { value: number; currency: string }>();
  for (const row of marketSize) {
    const existing = marketByYear.get(row.year) ?? { value: 0, currency: row.currency };
    existing.value += parseFloat(row.total_value);
    existing.currency = row.currency;
    marketByYear.set(row.year, existing);
  }
  const years = [...marketByYear.keys()].sort();

  const totalDeployments = countries.reduce((s, c) => s + n(c.deployments), 0);
  const totalSites = countries.reduce((s, c) => s + n(c.hospital_sites), 0);
  const totalNotices = countries.reduce((s, c) => s + n(c.procurement_notices), 0);
  const totalContacts = countries.reduce((s, c) => s + n(c.contacts), 0);

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-fhi-blue font-display text-sm font-bold text-white">
                  F
                </span>
                <h1 className="font-display text-lg font-semibold text-fhi-ink">
                  Market Intelligence Console
                </h1>
              </div>
              <p className="mt-1 text-sm text-fhi-slate">
                European Health IT Market Intelligence Database &mdash; coverage &amp; data quality
              </p>
            </div>
            <div className="text-right text-xs text-fhi-slate">
              <div>Data last refreshed</div>
              <div className="tabular-nums text-fhi-ink">
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "&mdash;"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Summary stat cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Countries" value={fmt(countMap.country ?? 0)} />
          <StatCard label="Suppliers" value={fmt(countMap.supplier ?? 0)} />
          <StatCard
            label="System categories"
            value={fmt(countMap.system_category ?? 0)}
            sublabel={`${fmt(coreCount)} core &middot; ${fmt(extendedCount)} extended`}
          />
          <StatCard label="Market categories" value={fmt(countMap.market_category ?? 0)} />
          <StatCard label="Hospital sites" value={fmt(totalSites)} sublabel="research phase" />
          <StatCard label="Deployments" value={fmt(totalDeployments)} sublabel="research phase" />
          <StatCard label="Procurement notices" value={fmt(totalNotices)} sublabel="research phase" />
          <StatCard label="Digital leadership contacts" value={fmt(totalContacts)} sublabel="research phase" />
          <StatCard label="Evidence sources logged" value={fmt(countMap.source ?? 0)} />
          <StatCard label="Supplier revenue records" value={fmt(countMap.supplier_revenue ?? 0)} />
        </section>

        {/* Market sizing */}
        {years.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-base font-semibold text-fhi-ink">
              Market sizing (top-down, seeded)
            </h2>
            <p className="mt-1 text-sm text-fhi-slate">
              Total estimated spend across all market categories, by year. Seeded from the FHI Market
              Model; will be triangulated against bottom-up deployment data as country research completes.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-fhi-slate">
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 text-right font-medium">Total estimated spend</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => {
                    const row = marketByYear.get(y)!;
                    return (
                      <tr key={y} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 tabular-nums">{y}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                          {fmtMoney(row.value, row.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Country coverage table */}
        <section className="mt-10">
          <h2 className="font-display text-base font-semibold text-fhi-ink">
            Coverage by country
          </h2>
          <p className="mt-1 text-sm text-fhi-slate">
            Hospital-level research status. Deployment category coverage is shown as confirmed
            (directly evidenced), assumed (inferred from a wall-to-wall EHR), carve-out (confirmed
            exception), or unconfirmed.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-fhi-slate">
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 text-right font-medium">Groups</th>
                  <th className="px-4 py-3 text-right font-medium">Sites</th>
                  <th className="px-4 py-3 text-right font-medium">Deployments</th>
                  <th className="px-4 py-3 text-right font-medium">Confirmed</th>
                  <th className="px-4 py-3 text-right font-medium">Assumed</th>
                  <th className="px-4 py-3 text-right font-medium">Carve-out</th>
                  <th className="px-4 py-3 text-right font-medium">Unconfirmed</th>
                  <th className="px-4 py-3 text-right font-medium">Notices</th>
                  <th className="px-4 py-3 text-right font-medium">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="text-fhi-slate">{c.iso2}</span>{" "}
                      <span className="font-medium text-fhi-ink">{c.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(n(c.hospital_groups))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(n(c.hospital_sites))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(n(c.deployments))}</td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusCell value={n(c.dc_confirmed)} kind="confirmed" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusCell value={n(c.dc_assumed)} kind="assumed" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusCell value={n(c.dc_carve_out)} kind="carveout" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusCell value={n(c.dc_unconfirmed)} kind="unconfirmed" />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(n(c.procurement_notices))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(n(c.contacts))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 pb-8 text-xs text-fhi-slate">
          Future Health Intelligence &mdash; European Health IT Market Intelligence Database
        </footer>
      </div>
    </main>
  );
}
