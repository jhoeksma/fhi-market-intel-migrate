import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getHospitalGroups, getHospitalSites, getSuppliers, getSystemCategories } from "@/lib/refdata";
import {
  updateDeployment,
  deleteDeployment,
  createDeploymentCategory,
  updateDeploymentCategory,
  deleteDeploymentCategory,
} from "@/lib/actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  SubmitButton,
  CancelLink,
  FormCard,
  FormGrid,
  PageHeader,
  DeleteButton,
  DeleteSubmitButton,
} from "@/components/AdminForm";

export const dynamic = "force-dynamic";

interface DeploymentRow {
  id: number;
  hospital_site_id: number | null;
  hospital_group_id: number | null;
  supplier_id: number | null;
  product_id: number | null;
  product_name: string | null;
  contract_value: string | null;
  currency: string | null;
  install_date: string | null;
  expiry_date: string | null;
  procurement_framework: string | null;
  status: string;
  evidence_tier: number | null;
  notes: string | null;
}

interface CategoryRow {
  id: number;
  system_category_id: number;
  system_category_name: string;
  coverage_status: string;
  evidence_tier: number | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-status-confirmed",
  assumed: "text-status-assumed",
  carve_out: "text-status-carveout",
  unconfirmed: "text-status-unconfirmed",
};

export default async function DeploymentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [deploymentRows, categories, sites, groups, suppliers, systemCategories] = await Promise.all([
    query<DeploymentRow>(
      `SELECT d.id, d.hospital_site_id, d.hospital_group_id, d.supplier_id, d.product_id, p.name AS product_name,
              d.contract_value, d.currency,
              to_char(d.install_date, 'YYYY-MM-DD') AS install_date,
              to_char(d.expiry_date, 'YYYY-MM-DD') AS expiry_date,
              d.procurement_framework, d.status, d.evidence_tier, d.notes
       FROM deployment d
       LEFT JOIN product p ON p.id = d.product_id
       WHERE d.id = $1`,
      [id]
    ),
    query<CategoryRow>(
      `SELECT dc.id, dc.system_category_id, sc.name AS system_category_name, dc.coverage_status, dc.evidence_tier, dc.notes
       FROM deployment_category dc
       JOIN system_category sc ON sc.id = dc.system_category_id
       WHERE dc.deployment_id = $1
       ORDER BY sc.scope, sc.name`,
      [id]
    ),
    getHospitalSites(),
    getHospitalGroups(),
    getSuppliers(),
    getSystemCategories(),
  ]);
  const deployment = deploymentRows[0];
  if (!deployment) notFound();

  const coveredIds = new Set(categories.map((c) => c.system_category_id));
  const availableCategories = systemCategories.filter((sc) => !coveredIds.has(sc.id));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit deployment"
        subtitle={deployment.product_name ?? `Deployment #${deployment.id}`}
        action={<DeleteButton action={deleteDeployment.bind(null, id)} />}
      />

      <FormCard>
        <form action={updateDeployment.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Hospital site" hint="A deployment needs a site or a group (at least one)">
              <Select name="hospital_site_id" defaultValue={deployment.hospital_site_id ? String(deployment.hospital_site_id) : ""}>
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hospital group">
              <Select name="hospital_group_id" defaultValue={deployment.hospital_group_id ? String(deployment.hospital_group_id) : ""}>
                <option value="">—</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Supplier">
              <Select name="supplier_id" defaultValue={deployment.supplier_id ? String(deployment.supplier_id) : ""}>
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product / system name" hint="Free text — creates the product under the chosen supplier if new">
              <TextInput name="product_name" defaultValue={deployment.product_name ?? ""} />
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue={deployment.status} required>
                <option value="unconfirmed">Unconfirmed</option>
                <option value="confirmed">Confirmed</option>
              </Select>
            </Field>
            <Field label="Evidence tier">
              <Select name="evidence_tier" defaultValue={deployment.evidence_tier ? String(deployment.evidence_tier) : ""}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contract value">
              <TextInput type="number" step="0.01" name="contract_value" defaultValue={deployment.contract_value ?? ""} />
            </Field>
            <Field label="Currency">
              <TextInput name="currency" defaultValue={deployment.currency ?? "EUR"} maxLength={3} />
            </Field>
            <Field label="Install date">
              <TextInput type="date" name="install_date" defaultValue={deployment.install_date ?? ""} />
            </Field>
            <Field label="Expiry date">
              <TextInput type="date" name="expiry_date" defaultValue={deployment.expiry_date ?? ""} />
            </Field>
            <Field label="Procurement framework">
              <TextInput name="procurement_framework" defaultValue={deployment.procurement_framework ?? ""} />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={deployment.notes ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/deployments" />
          </div>
        </form>
      </FormCard>

      <div>
        <h2 className="font-display text-base font-semibold text-fhi-ink">Category coverage</h2>
        <p className="mt-1 text-sm text-fhi-slate">
          Which system categories this deployment covers, and how confidently. For a confirmed wall-to-wall EHR,
          add the core categories as <span className={STATUS_COLORS.assumed}>assumed</span> in one pass, then flip
          confirmed exceptions (imaging, blood tracking, oncology prescribing, genomics) to{" "}
          <span className={STATUS_COLORS.carveout}>carve_out</span>.
        </p>

        <div className="mt-4 space-y-3">
          {categories.map((c) => (
            <form
              key={c.id}
              action={updateDeploymentCategory.bind(null, id, c.id)}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-[180px] flex-1">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-fhi-slate">
                  Category
                </span>
                <div className="py-2 text-sm font-medium text-fhi-ink">{c.system_category_name}</div>
                <input type="hidden" name="system_category_id" value={c.system_category_id} />
              </div>
              <div className="w-40">
                <Field label="Coverage">
                  <Select name="coverage_status" defaultValue={c.coverage_status}>
                    <option value="confirmed">Confirmed</option>
                    <option value="assumed">Assumed</option>
                    <option value="carve_out">Carve-out</option>
                    <option value="unconfirmed">Unconfirmed</option>
                  </Select>
                </Field>
              </div>
              <div className="w-28">
                <Field label="Evidence tier">
                  <Select name="evidence_tier" defaultValue={c.evidence_tier ? String(c.evidence_tier) : ""}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="min-w-[200px] flex-1">
                <Field label="Notes">
                  <TextInput name="notes" defaultValue={c.notes ?? ""} />
                </Field>
              </div>
              <div className="flex gap-3 pb-2">
                <SubmitButton>Save</SubmitButton>
                <DeleteSubmitButton action={deleteDeploymentCategory.bind(null, id, c.id)} />
              </div>
            </form>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-fhi-slate">No category coverage recorded yet.</p>
          )}
        </div>

        {availableCategories.length > 0 && (
          <form
            action={createDeploymentCategory.bind(null, id)}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4"
          >
            <div className="min-w-[220px] flex-1">
              <Field label="Add category">
                <Select name="system_category_id" defaultValue="" required>
                  <option value="" disabled>
                    Select a system category
                  </option>
                  {availableCategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.scope})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="w-40">
              <Field label="Coverage" required>
                <Select name="coverage_status" defaultValue="unconfirmed" required>
                  <option value="confirmed">Confirmed</option>
                  <option value="assumed">Assumed</option>
                  <option value="carve_out">Carve-out</option>
                  <option value="unconfirmed">Unconfirmed</option>
                </Select>
              </Field>
            </div>
            <div className="w-28">
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
            </div>
            <div className="min-w-[200px] flex-1">
              <Field label="Notes">
                <TextInput name="notes" />
              </Field>
            </div>
            <div className="pb-2">
              <SubmitButton>Add</SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
