"use client";

import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------
// Types (mirror the API route shapes in app/api/v1/*)
// ---------------------------------------------------------------------
interface SupplierShare {
  name: string;
  count: number;
}
interface CountryMarketShare {
  iso2: string;
  name: string;
  sites: number;
  confirmedTotal: number;
  coveragePct: number;
  suppliers: SupplierShare[];
}
interface EuCountry {
  iso2: string;
  name: string;
}
type ReportsMap = Record<string, { file: string; sizeKB: number }>;
interface SearchResult {
  country: string;
  countryName: string;
  group: string;
  site: string;
  city: string | null;
  supplier: string | null;
  product: string | null;
}

type Basis = "confirmed" | "census";
type ViewId = "overview" | "country" | "compare" | "search" | "reports";

// ---------------------------------------------------------------------
// Static reference data (flags, canonical colour palette)
// ---------------------------------------------------------------------
const FLAGS: Record<string, string> = {
  AT: "🇦🇹", BE: "🇧🇪", BG: "🇧🇬", HR: "🇭🇷", CY: "🇨🇾", CZ: "🇨🇿", DK: "🇩🇰",
  EE: "🇪🇪", FI: "🇫🇮", FR: "🇫🇷", DE: "🇩🇪", GR: "🇬🇷", HU: "🇭🇺", IE: "🇮🇪",
  IT: "🇮🇹", LV: "🇱🇻", LT: "🇱🇹", LU: "🇱🇺", MT: "🇲🇹", NL: "🇳🇱", PL: "🇵🇱",
  PT: "🇵🇹", RO: "🇷🇴", SK: "🇸🇰", SI: "🇸🇮", ES: "🇪🇸", SE: "🇸🇪",
};

const PALETTE = [
  "#3572EF", "#F59E0B", "#10B981", "#F43F5E", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16",
  "#F97316", "#6366F1", "#14B8A6", "#EAB308", "#A855F7", "#EF4444", "#0EA5E9", "#D946EF",
  "#22C55E", "#B45309", "#7C3AED", "#0891B2", "#BE185D", "#4D7C0F", "#C2410C", "#4338CA",
  "#0F766E", "#A16207", "#6D28D9", "#B91C1C", "#0369A1", "#A21CAF", "#15803D", "#9333EA", "#DC2626",
];
const GRAY = "#94A3B8";

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}
function pct(n: number, d: number): number {
  return d ? (100 * n) / d : 0;
}
function pctStr(n: number, d: number, digits = 1): string {
  return pct(n, d).toFixed(digits) + "%";
}

// ---------------------------------------------------------------------
// Donut geometry — returns SVG path data for each segment
// ---------------------------------------------------------------------
interface DonutSeg {
  name: string;
  count: number;
  color: string;
  isGray?: boolean;
}
function donutSegments(country: CountryMarketShare, basis: Basis, colorFor: (n: string) => string): { segs: DonutSeg[]; total: number } {
  const segs: DonutSeg[] = country.suppliers.map((s) => ({ name: s.name, count: s.count, color: colorFor(s.name) }));
  if (basis === "census") {
    const unconfirmed = country.sites - country.confirmedTotal;
    if (unconfirmed > 0) segs.push({ name: "Not yet vendor-confirmed", count: unconfirmed, color: "var(--gray-slice)", isGray: true });
    return { segs, total: country.sites };
  }
  return { segs, total: country.confirmedTotal };
}

function DonutSvg({
  segs,
  total,
  onSegmentClick,
}: {
  segs: DonutSeg[];
  total: number;
  onSegmentClick?: (seg: DonutSeg) => void;
}) {
  const cx = 120, cy = 120, r = 92, rInner = 58;
  let angle = -90;
  const paths = segs.map((seg, i) => {
    const frac = total ? seg.count / total : 0;
    const sweep = frac * 360;
    if (sweep <= 0.4) {
      angle += sweep;
      return null;
    }
    const large = sweep > 180 ? 1 : 0;
    const a0 = (angle * Math.PI) / 180, a1 = ((angle + sweep) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi0 = cx + rInner * Math.cos(a1), yi0 = cy + rInner * Math.sin(a1);
    const xi1 = cx + rInner * Math.cos(a0), yi1 = cy + rInner * Math.sin(a0);
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi0} ${yi0} A ${rInner} ${rInner} 0 ${large} 0 ${xi1} ${yi1} Z`;
    angle += sweep;
    const clickable = !!onSegmentClick;
    return (
      <path
        key={i}
        d={d}
        fill={seg.color}
        stroke="var(--bg)"
        strokeWidth={1.5}
        className={clickable ? "fhi-donut-seg clickable" : "fhi-donut-seg"}
        onClick={clickable ? () => onSegmentClick!(seg) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentClick!(seg);
                }
              }
            : undefined
        }
      >
        <title>
          {seg.name}: {seg.count}
          {clickable ? " — click to view sites" : ""}
        </title>
      </path>
    );
  });
  return (
    <svg width="240" height="240" viewBox="0 0 240 240">
      {paths}
    </svg>
  );
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------
export default function DashboardPage() {
  const [countries, setCountries] = useState<CountryMarketShare[] | null>(null);
  const [euCountries, setEuCountries] = useState<EuCountry[] | null>(null);
  const [reports, setReports] = useState<ReportsMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<ViewId>("overview");
  const [basis, setBasis] = useState<Basis>("confirmed");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [compareSelected, setCompareSelected] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<string>("");

  const [searchQ, setSearchQ] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [searchSupplier, setSearchSupplier] = useState("");
  const [searchSupplierName, setSearchSupplierName] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Jump to Search & Browse pre-filtered to one supplier's sites in one
  // country — used by clicks on the Country Market Share donut, legend and
  // table. Clears the free-text and confirmed/unconfirmed filters so the
  // supplier-name filter isn't silently narrowed by a leftover value.
  function goToSupplierListing(iso2: string, supplierName: string) {
    setSearchQ("");
    setSearchSupplier("");
    setSearchSupplierName(supplierName);
    setSearchCountry(iso2);
    setView("search");
  }
  // Same, for the "not yet vendor-confirmed" slice — reuses the existing
  // confirmed/unconfirmed filter rather than a supplier name.
  function goToUnconfirmedListing(iso2: string) {
    setSearchQ("");
    setSearchSupplierName("");
    setSearchSupplier("no");
    setSearchCountry(iso2);
    setView("search");
  }

  // Deep-link support: read the tab from the URL hash on first load (so the
  // nav bar embedded in the static country-report pages can link straight
  // back to e.g. /dashboard#reports), and keep the hash in sync as the user
  // switches tabs, so the URL stays shareable/bookmarkable.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if ((["overview", "country", "compare", "search", "reports"] as string[]).includes(hash)) {
      setView(hash as ViewId);
    }
  }, []);
  useEffect(() => {
    if (window.location.hash.replace("#", "") !== view) {
      window.history.replaceState(null, "", `#${view}`);
    }
  }, [view]);

  // Initial load: market share, EU country list, report availability
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [msRes, ccRes, repRes] = await Promise.all([
          fetch("/api/v1/market-share"),
          fetch("/api/v1/countries"),
          fetch("/api/v1/reports"),
        ]);
        if (!msRes.ok || !ccRes.ok || !repRes.ok) throw new Error("One or more API calls failed");
        const ms: CountryMarketShare[] = await msRes.json();
        const cc: EuCountry[] = await ccRes.json();
        const rep: ReportsMap = await repRes.json();
        if (cancelled) return;
        setCountries(ms);
        setEuCountries(cc);
        setReports(rep);
        setCompareSelected(new Set(ms.map((c) => c.iso2)));
        if (ms.length) setActiveCountry(ms[0].iso2);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load dashboard data");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Search: debounced fetch whenever filters change (only once the tab has been opened)
  useEffect(() => {
    if (view !== "search") return;
    let cancelled = false;
    setSearchLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQ) params.set("q", searchQ);
        if (searchCountry) params.set("country", searchCountry);
        if (searchSupplier) params.set("supplier", searchSupplier);
        if (searchSupplierName) params.set("supplierName", searchSupplierName);
        const res = await fetch(`/api/v1/search?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) setSearchResults(data.results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [view, searchQ, searchCountry, searchSupplier, searchSupplierName]);

  // Canonical vendor -> colour, derived once market-share data is in
  const colorFor = useMemo(() => {
    const names = new Set<string>();
    (countries ?? []).forEach((c) => c.suppliers.forEach((s) => { if (s.name !== "Other / unnamed") names.add(s.name); }));
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    const map: Record<string, string> = {};
    sorted.forEach((name, i) => { map[name] = PALETTE[i % PALETTE.length]; });
    return (name: string) => (name === "Other / unnamed" ? GRAY : map[name] ?? GRAY);
  }, [countries]);

  const totalSites = (countries ?? []).reduce((a, c) => a + c.sites, 0);
  const totalConfirmed = (countries ?? []).reduce((a, c) => a + c.confirmedTotal, 0);
  const sortedByCoverage = [...(countries ?? [])].sort((a, b) => (b.confirmedTotal / b.sites) - (a.confirmedTotal / a.sites));

  const activeCountryData = (countries ?? []).find((c) => c.iso2 === activeCountry) ?? null;
  const activeDonut = activeCountryData ? donutSegments(activeCountryData, basis, colorFor) : null;

  const reportCountries = euCountries ?? [];
  const selectedReportCountry = reportCountries.find((c) => c.iso2 === selectedReport);
  const selectedReportEntry = selectedReport && reports ? reports[selectedReport] : undefined;
  const selectedReportBlurb = useMemo(() => {
    if (!selectedReport) return "";
    const c = (countries ?? []).find((x) => x.iso2 === selectedReport);
    if (c) return `${fmt(c.sites)} hospital sites, ${fmt(c.confirmedTotal)} vendor-confirmed (${pctStr(c.confirmedTotal, c.sites, 1)}).`;
    return "Full national EPR/EHR landscape report.";
  }, [selectedReport, countries]);

  // ---------------------------------------------------------------------
  if (loadError) {
    return (
      <div className="fhi-dashboard">
        <div className="fhi-shell">
          <div className="fhi-error">Couldn&rsquo;t load the dashboard: {loadError}. Try refreshing — if it persists, the API or database may be unavailable.</div>
        </div>
      </div>
    );
  }

  const dataReady = countries !== null && euCountries !== null && reports !== null;

  return (
    <div className="fhi-dashboard">
      <div className="fhi-shell">
        <header className="fhi-top">
          <div className="fhi-brand-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fhi-logo.png" alt="Future Health Intelligence" />
            <div className="fhi-divider" />
            <div className="fhi-ttl">
              <span className="fhi-eyebrow">FHI · European Health IT Market Intelligence</span>
              <h1>Market Intelligence Console</h1>
            </div>
          </div>
          <div className="fhi-basis-toggle">
            <button className={basis === "confirmed" ? "active" : ""} onClick={() => setBasis("confirmed")}>Vendor-confirmed only</button>
            <button className={basis === "census" ? "active" : ""} onClick={() => setBasis("census")}>Full census (with unconfirmed)</button>
          </div>
        </header>

        <nav className="fhi-tabs">
          {([
            ["overview", "Overview"],
            ["country", "Country Market Share"],
            ["compare", "Compare Countries"],
            ["search", "Search & Browse"],
            ["reports", "Country Reports"],
          ] as [ViewId, string][]).map(([id, label]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>
          ))}
        </nav>

        {!dataReady && <div className="fhi-loading">Loading live data from the database…</div>}

        {dataReady && view === "overview" && (
          <div className="fhi-view active">
            <div className="fhi-kpi-row">
              <div className="fhi-kpi"><div className="v">{countries!.length}</div><div className="l">Countries tracked</div><div className="sub">EPR/EHR landscape reports, live in the database</div></div>
              <div className="fhi-kpi"><div className="v">{fmt(totalSites)}</div><div className="l">Hospital sites mapped</div><div className="sub">Public and private acute providers</div></div>
              <div className="fhi-kpi"><div className="v">{fmt(totalConfirmed)}</div><div className="l">Vendor-confirmed deployments</div><div className="sub">Named EPR/EHR supplier, evidenced</div></div>
              <div className="fhi-kpi"><div className="v">{pctStr(totalConfirmed, totalSites, 1)}</div><div className="l">Weighted vendor coverage</div><div className="sub">Confirmed ÷ total sites, live query</div></div>
            </div>

            <section className="fhi-block">
              <h2>Vendor-confirmed coverage by country</h2>
              <p className="fhi-desc">Share of each country&rsquo;s hospital census with a named, evidenced EPR/EHR supplier — queried live from the database.</p>
              <div className="fhi-card fhi-cov-list">
                {sortedByCoverage.map((c) => {
                  const p = pct(c.confirmedTotal, c.sites);
                  const color = p >= 80 ? "var(--emerald)" : p >= 30 ? "var(--amber)" : "var(--rose)";
                  return (
                    <div className="fhi-cov-row" key={c.iso2}>
                      <div className="name"><span className="flag">{FLAGS[c.iso2]}</span>{c.name}</div>
                      <div className="fhi-cov-track"><div className="fhi-cov-fill" style={{ width: `${p}%`, background: color }} /></div>
                      <div className="pct">{pctStr(c.confirmedTotal, c.sites, 1)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {dataReady && view === "country" && activeCountryData && activeDonut && (
          <div className="fhi-view active">
            <div className="fhi-pill-row">
              {countries!.map((c) => (
                <button key={c.iso2} className={"fhi-pill" + (c.iso2 === activeCountry ? " active" : "")} onClick={() => setActiveCountry(c.iso2)}>
                  <span className="flag">{FLAGS[c.iso2]}</span>{c.name}
                </button>
              ))}
            </div>
            <section className="fhi-block">
              <h2>{activeCountryData.name} — EPR/EHR supplier share</h2>
              <p className="fhi-desc">
                {fmt(activeCountryData.sites)} hospital sites in the national census, {fmt(activeCountryData.confirmedTotal)} with a vendor-confirmed EPR/EHR system ({pctStr(activeCountryData.confirmedTotal, activeCountryData.sites, 1)} coverage).
              </p>
              <div className="fhi-card">
                <div className="fhi-donut-wrap">
                  <div className="fhi-donut-fig">
                    <DonutSvg
                      segs={activeDonut.segs}
                      total={activeDonut.total}
                      onSegmentClick={(seg) =>
                        seg.isGray
                          ? goToUnconfirmedListing(activeCountryData.iso2)
                          : goToSupplierListing(activeCountryData.iso2, seg.name)
                      }
                    />
                    <div className="fhi-center-label">
                      <div className="big">{basis === "census" ? pctStr(activeCountryData.confirmedTotal, activeCountryData.sites, 0) : fmt(activeCountryData.confirmedTotal)}</div>
                      <div className="small">{basis === "census" ? "of census, vendor-confirmed" : "confirmed sites"}</div>
                    </div>
                  </div>
                  <div className="fhi-legend">
                    {activeDonut.segs.map((seg) => (
                      <div
                        className="row clickable"
                        key={seg.name}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          seg.isGray
                            ? goToUnconfirmedListing(activeCountryData.iso2)
                            : goToSupplierListing(activeCountryData.iso2, seg.name)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            seg.isGray
                              ? goToUnconfirmedListing(activeCountryData.iso2)
                              : goToSupplierListing(activeCountryData.iso2, seg.name);
                          }
                        }}
                      >
                        <span className="sw" style={{ background: seg.color }} />
                        <span className="nm">{seg.name}</span>
                        <span className="ct">{fmt(seg.count)}</span>
                        <span className="pc">{pctStr(seg.count, activeDonut.total, 1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="fhi-caption-note">
                  {basis === "census"
                    ? <><b>Full census view:</b> percentages are of all {fmt(activeCountryData.sites)} sites in the national census. The grey slice is sites with no vendor confirmed yet in public sources — not sites without a system.</>
                    : <><b>Vendor-confirmed view:</b> percentages are of the {fmt(activeCountryData.confirmedTotal)} sites with an evidenced supplier only ({pctStr(activeCountryData.confirmedTotal, activeCountryData.sites, 1)} of the census) — treat as directional, not a full market share, where coverage is low.</>}
                </p>
              </div>
            </section>
            <section className="fhi-block">
              <h2>Confirmed deployments, by supplier</h2>
              <div className="fhi-card fhi-overflow-x">
                <table className="fhi-data">
                  <thead><tr><th>Supplier</th><th className="num">Confirmed sites</th><th className="num">Share (confirmed)</th><th className="num">Share (full census)</th></tr></thead>
                  <tbody>
                    {[...activeCountryData.suppliers].sort((a, b) => b.count - a.count).map((s) => (
                      <tr key={s.name}>
                        <td>
                          <button className="fhi-supplier-link" onClick={() => goToSupplierListing(activeCountryData.iso2, s.name)}>
                            <span className="sw" style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: colorFor(s.name), marginRight: 8 }} />
                            {s.name}
                          </button>
                        </td>
                        <td className="num">{fmt(s.count)}</td>
                        <td className="num">{pctStr(s.count, activeCountryData.confirmedTotal, 1)}</td>
                        <td className="num">{pctStr(s.count, activeCountryData.sites, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {dataReady && view === "compare" && (
          <div className="fhi-view active">
            <section className="fhi-block">
              <h2>Compare supplier share across countries</h2>
              <p className="fhi-desc">Select countries to compare. Bars use the toggle above. Colour is fixed per supplier across every country, so the same vendor reads the same everywhere.</p>
              <div className="fhi-compare-controls">
                {countries!.map((c) => {
                  const checked = compareSelected.has(c.iso2);
                  return (
                    <label key={c.iso2} className={"fhi-chk" + (checked ? " checked" : "")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(compareSelected);
                          if (e.target.checked) next.add(c.iso2); else next.delete(c.iso2);
                          setCompareSelected(next);
                        }}
                      />
                      {FLAGS[c.iso2]} {c.name}
                    </label>
                  );
                })}
              </div>
              <div className="fhi-card">
                <div className="fhi-stack-rows">
                  {countries!.filter((c) => compareSelected.has(c.iso2)).map((c) => {
                    const { segs, total } = donutSegments(c, basis, colorFor);
                    const headCount = basis === "census" ? `${fmt(c.confirmedTotal)} / ${fmt(c.sites)} sites confirmed` : `${fmt(c.confirmedTotal)} confirmed sites`;
                    return (
                      <div className="fhi-stack-row" key={c.iso2}>
                        <div className="head"><span>{FLAGS[c.iso2]} {c.name}</span><span className="cnt">{headCount}</span></div>
                        <div className="fhi-stack-bar">
                          {segs.map((seg) => {
                            const frac = total ? seg.count / total : 0;
                            if (frac <= 0) return null;
                            return <div key={seg.name} className="fhi-stack-seg" style={{ width: `${frac * 100}%`, background: seg.color }} title={`${seg.name}: ${fmt(seg.count)} (${pctStr(seg.count, total, 1)})`} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="fhi-vendor-legend">
                  {[...new Set(countries!.filter((c) => compareSelected.has(c.iso2)).flatMap((c) => c.suppliers.map((s) => s.name)).filter((n) => n !== "Other / unnamed"))]
                    .sort((a, b) => a.localeCompare(b))
                    .map((name) => (
                      <div className="row" key={name}><span className="sw" style={{ background: colorFor(name) }} />{name}</div>
                    ))}
                  {basis === "census" && <div className="row"><span className="sw" style={{ background: "var(--gray-slice)" }} />Not yet vendor-confirmed</div>}
                </div>
              </div>
            </section>
          </div>
        )}

        {dataReady && view === "search" && (
          <div className="fhi-view active">
            <section className="fhi-block">
              <h2>Search hospital groups, sites &amp; suppliers</h2>
              <p className="fhi-desc">Live query against the database — every hospital site currently imported, across all countries.</p>
              {searchSupplierName && (
                <div className="fhi-active-filter">
                  Filtering to <b>{searchSupplierName}</b>
                  {searchCountry && (countries ?? []).find((c) => c.iso2 === searchCountry)
                    ? <> in {FLAGS[searchCountry]} {(countries ?? []).find((c) => c.iso2 === searchCountry)!.name}</>
                    : null}
                  <button onClick={() => setSearchSupplierName("")}>Clear ×</button>
                </div>
              )}
              <div className="fhi-search-controls">
                <input type="text" placeholder="Search by hospital, group or city…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                <select value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)}>
                  <option value="">All countries</option>
                  {(countries ?? []).map((c) => <option key={c.iso2} value={c.iso2}>{FLAGS[c.iso2]} {c.name}</option>)}
                </select>
                <select value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)}>
                  <option value="">All records</option>
                  <option value="yes">Vendor confirmed</option>
                  <option value="no">Vendor unconfirmed</option>
                </select>
              </div>
              <div className="fhi-result-count">{searchLoading ? "Searching…" : searchResults ? `${searchResults.length} matching records` : ""}</div>
              <div className="fhi-card fhi-overflow-x">
                <table className="fhi-data">
                  <thead><tr><th>Country</th><th>Hospital group</th><th>Site</th><th>City</th><th>Supplier</th><th>Product</th></tr></thead>
                  <tbody>
                    {(searchResults ?? []).map((r, i) => (
                      <tr key={i}>
                        <td>{FLAGS[r.country]} {r.countryName}</td>
                        <td>{r.group}</td>
                        <td>{r.site}</td>
                        <td>{r.city ?? "—"}</td>
                        <td>{r.supplier ? r.supplier : <span className="fhi-chip-known no">unconfirmed</span>}</td>
                        <td>{r.product ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {dataReady && view === "reports" && (
          <div className="fhi-view active">
            <section className="fhi-block">
              <h2>Country landscape reports</h2>
              <p className="fhi-desc">Full branded EPR/EHR landscape reports, one per country. Completed countries are selectable and open the full report in a new tab; countries not yet researched are greyed out below.</p>
              <div className="fhi-card fhi-report-picker">
                <div className="fhi-report-picker-row">
                  <label className="fhi-report-picker-label" htmlFor="reportSelect">Jump to a report</label>
                  <select id="reportSelect" className="fhi-report-select" value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
                    <option value="">Choose a country…</option>
                    <optgroup label={`Completed reports (${Object.keys(reports!).length})`}>
                      {reportCountries.filter((c) => reports![c.iso2]).map((c) => <option key={c.iso2} value={c.iso2}>{FLAGS[c.iso2]} {c.name}</option>)}
                    </optgroup>
                    <optgroup label={`Not yet researched (${reportCountries.filter((c) => !reports![c.iso2]).length})`}>
                      {reportCountries.filter((c) => !reports![c.iso2]).map((c) => <option key={c.iso2} value={c.iso2} disabled>{FLAGS[c.iso2]} {c.name}</option>)}
                    </optgroup>
                  </select>
                  <a
                    className={"fhi-report-open-btn" + (selectedReportEntry ? " enabled" : "")}
                    href={selectedReportEntry?.file ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open full report ↗
                  </a>
                </div>
                {selectedReportEntry && selectedReportCountry && (
                  <div className="fhi-report-preview">
                    <div className="rp-name">{FLAGS[selectedReportCountry.iso2]} {selectedReportCountry.name} — EPR/EHR Landscape Report</div>
                    <div className="rp-meta">{selectedReportBlurb} · {selectedReportEntry.sizeKB} KB HTML, print-ready.</div>
                  </div>
                )}
              </div>
            </section>
            <section className="fhi-block">
              <h2>All {reportCountries.length} EU member states</h2>
              <p className="fhi-desc"><span className="fhi-legend-dot done" />Completed &nbsp;&nbsp;<span className="fhi-legend-dot pending" />Not yet researched</p>
              <div className="fhi-report-grid">
                {[...reportCountries].sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
                  const rep = reports![c.iso2];
                  if (rep) {
                    return (
                      <a key={c.iso2} className="fhi-report-tile done" href={rep.file} target="_blank" rel="noopener noreferrer">
                        <span className="flag">{FLAGS[c.iso2]}</span>{c.name}<span className="arrow">↗</span>
                      </a>
                    );
                  }
                  return (
                    <div key={c.iso2} className="fhi-report-tile pending">
                      <span className="flag">{FLAGS[c.iso2]}</span>{c.name}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <footer className="fhi-footer">
          <span>Live prototype · internal analyst build</span>
          <span className="byline">Future Health Intelligence {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/fhi-mark.png" alt="" /></span>
        </footer>
      </div>
    </div>
  );
}
