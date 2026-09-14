"use client";

import { useEffect, useState } from "react";

// Client-side search + country filter bar for an admin list table.
//
// Deliberately DOM-based rather than array-based: it never receives the
// row data itself (which would mean passing render functions across the
// server/client boundary — not serializable, and every list page has its
// own row shape anyway). Instead each <tr> in the table below carries
// data-row-search / data-row-country attributes, and this component just
// toggles `hidden` on rows that don't match. That keeps every list page's
// existing server-rendered table (with its bound server actions) exactly
// as it was — this only adds a bit of markup and one small client island.
export function AdminTableFilter({
  tableId,
  countries,
  searchPlaceholder = "Search by name…",
}: {
  tableId: string;
  countries?: { id: number; name: string }[];
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const [countryId, setCountryId] = useState("");
  const [counts, setCounts] = useState<{ shown: number; total: number } | null>(null);

  useEffect(() => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll<HTMLElement>("[data-row-search]");
    const needle = q.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const text = row.dataset.rowSearch ?? "";
      const country = row.dataset.rowCountry ?? "";
      const match = (!needle || text.includes(needle)) && (!countryId || country === countryId);
      row.hidden = !match;
      if (match) shown++;
    });
    setCounts({ shown, total: rows.length });
  }, [q, countryId, tableId]);

  const hasFilter = q.length > 0 || countryId.length > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Search this table"
        className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-fhi-ink placeholder:text-slate-400 focus:border-fhi-blue focus:outline-none focus:ring-1 focus:ring-fhi-blue"
      />
      {countries && countries.length > 0 && (
        <select
          value={countryId}
          onChange={(e) => setCountryId(e.target.value)}
          aria-label="Filter by country"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-fhi-ink focus:border-fhi-blue focus:outline-none focus:ring-1 focus:ring-fhi-blue"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setCountryId("");
          }}
          className="text-xs font-medium text-fhi-slate hover:text-fhi-ink hover:underline"
        >
          Clear
        </button>
      )}
      {counts && (
        <span className="text-xs text-fhi-slate tabular-nums">
          {hasFilter ? `${counts.shown} of ${counts.total} shown` : `${counts.total} total`}
        </span>
      )}
    </div>
  );
}
