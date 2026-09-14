import Link from "next/link";
import { getCountries, getHospitalGroups, getHospitalSites, getSuppliers } from "@/lib/refdata";
import { query } from "@/lib/db";
import { createDeployment, deleteDeployment } from "@/lib/actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  SubmitButton,
  CollapsibleFormCard,
  FormGrid,
  PageHeader,
  Table,
  DeleteButton,
  ErrorBanner,
  th,
  td,
} from "@/components/AdminForm";
import { AdminTableFilter } from "@/components/AdminTableFilter";

export const dynamic = "force-dynamic";

interface DeploymentCategory {
  name: string;
  status: "confirmed" | "assumed" | "carve_out" | "unconfirmed";
}

interface DeploymentRow {
  id: number;
  hospital_site_id: number | null;
  hospital_group_id: number | null;
  supplier_name: string | null;
  product_name: string | null;
  status: string;
  categories: DeploymentCategory[];
}

// System-category badge colour by coverage status — mirrors the coverage
// view's confirmed/assumed/carve_out/unconfirmed palette so a deployment's
// category mix (what suppliers actually care about — EPR vs PACS vs
// maternity, etc.) reads at a glance instead of hiding behind a bare count.
const CATEGORY_BADGE_CLASS: Record<string, string> = {
  confirmed: "text-status-confirmed border-status-confirmed/30 bg-status-confirmed/10",
  assumed: "text-status-assumed border-status-assumed/30 bg-status-assumed/10",
  carve_out: "text-status-carveout border-status-carveout/30 bg-status-carveout/10",
  unconfirmed: "text-status-unconfirmed border-status-unconfirmed/30 bg-status-unconfirmed/10",
};

function CategoryBadges({ categories }: { categories: DeploymentCategory[] }) {
  if (categories.length === 0) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <span
          key={c.name}
          title={`${c.name} — ${c.status.replace("_", " ")}`}
          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            CATEGORY_BADGE_CLASS[c.status] ?? "text-fhi-slate border-slate-200 bg-slate-50"
          }`}
        >
          {c.name}
        </span>
      ))}
    </div>
  );
}

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const [deployments, sites, groups, suppliers, countries] = await Promise.all([
    query<DeploymentRow>(`
      SELECT d.id, d.hospital_site_id, d.hospital_group_id, s.name AS supplier_name, p.name AS product_name,
             d.status,
             COALESCE(
               json_agg(
                 json_build_object('name', sc.name, 'status', dc.coverage_status)
                 ORDER BY sc.name
               ) FILTER (WHERE sc.name IS NOT NULL),
               '[]'
             ) AS categories
      FROM deployment d
      LEFT JOIN supplier s ON s.id = d.supplier_id
      LEFT JOIN product p ON p.id = d.product_id
      LEFT JOIN deployment_category dc ON dc.deployment_id = d.id
      LEFT JOIN system_category sc ON sc.id = dc.system_category_id
      GROUP BY d.id, s.name, p.name
      ORDER BY d.created_at DESC
    `),
    getHospitalSites(),
    getHospitalGroups(),
    getSuppliers(),
    getCountries(),
  ]);
  const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name]));
  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const siteCountry = Object.fromEntries(sites.map((s) => [s.id, s.country_id]));
  const groupCountry = Object.fromEntries(groups.map((g) => [g.id, g.country_id]));
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle="One row per contract/engagement — never per category. Once a wall-to-wall EHR is confirmed, log it here once, then mark its category coverage on the deployment's own page."
      />
      <ErrorBanner message={searchParams?.error} />

      <CollapsibleFormCard title="+ Add a new deployment">
        <form action={createDeployment} className="space-y-4">
          <FormGrid>
            <Field label="Hospital site" hint="A deployment needs a site or a group (at least one)">
              <Select name="hospital_site_id" defaultValue="">
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hospital group">
              <Select name="hospital_group_id" defaultValue="">
                <option value="">—</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Supplier">
              <Select name="supplier_id" defaultValue="">
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product / system name" hint="Free text — creates the product under the chosen supplier if new">
              <TextInput name="product_name" placeholder="e.g. Epic, MEDITECH Expanse" />
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue="unconfirmed" required>
                <option value="unconfirmed">Unconfirmed</option>
                <option value="confirmed">Confirmed</option>
              </Select>
            </Field>
            <Field label="Evidence tier">
              <Select name="evidence_tier" defaultValue="">
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contract value">
              <TextInput type="number" step="0.01" name="contract_value" />
            </Field>
            <Field label="Currency">
              <TextInput name="currency" defaultValue="EUR" maxLength={3} />
            </Field>
            <Field label="Install date">
              <TextInput type="date" name="install_date" />
            </Field>
            <Field label="Expiry date">
              <TextInput type="date" name="expiry_date" />
            </Field>
            <Field label="Procurement framework">
              <TextInput name="procurement_framework" />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" />
          </Field>
          <SubmitButton>Add deployment</SubmitButton>
        </form>
      </CollapsibleFormCard>

      <div className="mt-8">
        <AdminTableFilter
          tableId="deployments-table"
          countries={countries}
          searchPlaceholder="Search by site, group, supplier or product…"
        />
        <Table id="deployments-table">
          <thead>
            <tr>
              <th className={th}>Site / group</th>
              <th className={th}>Country</th>
              <th className={th}>Supplier</th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>System category</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((d) => {
              const rowCountryId = d.hospital_site_id
                ? siteCountry[d.hospital_site_id]
                : d.hospital_group_id
                ? groupCountry[d.hospital_group_id]
                : null;
              const rowName = d.hospital_site_id
                ? siteName[d.hospital_site_id] ?? `Site #${d.hospital_site_id}`
                : d.hospital_group_id
                ? groupName[d.hospital_group_id] ?? `Group #${d.hospital_group_id}`
                : "—";
              return (
                <tr
                  key={d.id}
                  className="hover:bg-slate-50"
                  data-row-search={`${rowName} ${d.supplier_name ?? ""} ${d.product_name ?? ""} ${
                    rowCountryId ? countryName[rowCountryId] ?? "" : ""
                  }`.toLowerCase()}
                  data-row-country={rowCountryId ?? ""}
                >
                  <td className={td}>{rowName}</td>
                  <td className={td}>
                    {rowCountryId ? countryName[rowCountryId] ?? rowCountryId : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={td}>{d.supplier_name ?? <span className="text-slate-300">—</span>}</td>
                  <td className={td}>{d.product_name ?? <span className="text-slate-300">—</span>}</td>
                  <td className={td}>{d.status}</td>
                  <td className={td}>
                    <CategoryBadges categories={d.categories} />
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/deployments/${d.id}`} className="text-xs font-medium text-fhi-blue hover:underline">
                        Open
                      </Link>
                      <DeleteButton action={deleteDeployment.bind(null, d.id)} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {deployments.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>
                  No deployments logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
