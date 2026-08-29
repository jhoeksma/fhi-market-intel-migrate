import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/health-authorities", label: "Health authorities" },
  { href: "/admin/hospital-groups", label: "Hospital groups" },
  { href: "/admin/hospital-sites", label: "Hospital sites" },
  { href: "/admin/deployments", label: "Deployments" },
  { href: "/admin/procurement-notices", label: "Procurement notices" },
  { href: "/admin/contacts", label: "Contacts" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-fhi-blue font-display text-sm font-bold text-white">
              F
            </span>
            <span className="font-display text-base font-semibold text-fhi-ink">
              Market Intelligence Console
            </span>
            <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-fhi-slate">
              Admin
            </span>
          </div>
          <Link href="/" className="text-sm font-medium text-fhi-blue hover:underline">
            &larr; Coverage view
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-fhi-slate hover:bg-slate-100 hover:text-fhi-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
