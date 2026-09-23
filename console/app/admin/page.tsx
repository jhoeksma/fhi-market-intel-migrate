import Link from "next/link";
import { getRowCounts } from "@/lib/queries";
import { PageHeader } from "@/components/AdminForm";

export const dynamic = "force-dynamic";

const RESEARCH_TABLES: { key: string; label: string; href: string }[] = [
  { key: "hospital_group", label: "Hospital groups", href: "/admin/hospital-groups" },
  { key: "hospital_site", label: "Hospital sites", href: "/admin/hospital-sites" },
  { key: "deployment", label: "Deployments", href: "/admin/deployments" },
  { key: "deployment_category", label: "Deployment categories", href: "/admin/deployments" },
  { key: "procurement_notice", label: "Procurement notices", href: "/admin/procurement-notices" },
  { key: "contact", label: "Contacts", href: "/admin/contacts" },
  { key: "health_authority", label: "Health authorities", href: "/admin/health-authorities" },
  { key: "source", label: "Sources", href: "/admin/sources" },
];

export default async function AdminHome() {
  const counts = await getRowCounts();
  const countMap = Object.fromEntries(counts.map((r) => [r.t, r.n]));

  return (
    <div>
      <PageHeader
        title="Research data entry"
        subtitle="Backfill hospital groups, sites, deployments, procurement notices and contacts country by country. Start with Ireland."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {RESEARCH_TABLES.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-fhi-blue"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-fhi-slate">{t.label}</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-fhi-ink">
              {countMap[t.key] ?? 0}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
