import Link from "next/link";
import {
  getCountries,
  getHealthAuthorities,
  getHospitalGroups,
  getHospitalSites,
  getSources,
  getSuppliers,
  sourceLabel,
} from "@/lib/refdata";
import { query } from "@/lib/db";
import { createProcurementNotice, deleteProcurementNotice } from "@/lib/actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Checkbox,
  SubmitButton,
  FormCard,
  FormGrid,
  PageHeader,
  Table,
  DeleteButton,
  th,
  td,
} from "@/components/AdminForm";

export const dynamic = "force-dynamic";

interface NoticeRow {
  id: number;
  country_id: number;
  title: string | null;
  portal: string | null;
  status: string;
  awarded_value: string | null;
  estimated_value: string | null;
  currency: string | null;
  award_date: string | null;
}

export default async function ProcurementNoticesPage() {
  const [notices, countries, groups, sites, authorities, suppliers, sources] = await Promise.all([
    query<NoticeRow>(
      `SELECT id, country_id, title, portal, status, awarded_value, estimated_value, currency,
              to_char(award_date, 'YYYY-MM-DD') AS award_date
       FROM procurement_notice ORDER BY COALESCE(award_date, publication_date) DESC NULLS LAST`
    ),
    getCountries(),
    getHospitalGroups(),
    getHospitalSites(),
    getHealthAuthorities(),
    getSuppliers(),
    getSources(),
  ]);
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  function fmtMoney(v: string | null, currency: string | null): string {
    if (v === null) return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "GBP",
      maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div>
      <PageHeader
        title="Procurement notices"
        subtitle="TED / national portal awards — evidence tier 2, the richest and most reliable spend/date source. Run the procurement sweep before the deployment pass."
      />

      <FormCard>
        <form action={createProcurementNotice} className="space-y-4">
          <FormGrid>
            <Field label="Country" required>
              <Select name="country_id" required defaultValue="">
                <option value="" disabled>
                  Select a country
                </option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <TextInput name="title" />
            </Field>
            <Field label="Notice ID">
              <TextInput name="notice_id" />
            </Field>
            <Field label="Portal" hint="e.g. TED, eTenders.gov.ie">
              <TextInput name="portal" />
            </Field>
            <Field label="CPV codes" hint="comma-separated">
              <TextInput name="cpv_codes" placeholder="72000000, 48180000" />
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue="published" required>
                <option value="published">Published</option>
                <option value="awarded">Awarded</option>
                <option value="expired">Expired</option>
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
            <Field label="Hospital site">
              <Select name="hospital_site_id" defaultValue="">
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Health authority">
              <Select name="health_authority_id" defaultValue="">
                <option value="">—</option>
                {authorities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Awarded supplier">
              <Select name="awarded_supplier_id" defaultValue="">
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Publication date">
              <TextInput type="date" name="publication_date" />
            </Field>
            <Field label="Award date">
              <TextInput type="date" name="award_date" />
            </Field>
            <Field label="Contract start date">
              <TextInput type="date" name="contract_start_date" />
            </Field>
            <Field label="Contract expiry date">
              <TextInput type="date" name="contract_expiry_date" />
            </Field>
            <Field label="Estimated value">
              <TextInput type="number" step="0.01" name="estimated_value" />
            </Field>
            <Field label="Awarded value">
              <TextInput type="number" step="0.01" name="awarded_value" />
            </Field>
            <Field label="Currency">
              <TextInput name="currency" defaultValue="EUR" maxLength={3} />
            </Field>
            <Field label="Source">
              <Select name="source_id" defaultValue="">
                <option value="">—</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sourceLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Lot description">
            <TextArea name="lot_description" rows={2} />
          </Field>
          <Checkbox name="is_framework" label="Framework agreement" />
          <SubmitButton>Add procurement notice</SubmitButton>
        </form>
      </FormCard>

      <div className="mt-8">
        <Table>
          <thead>
            <tr>
              <th className={th}>Title</th>
              <th className={th}>Country</th>
              <th className={th}>Portal</th>
              <th className={th}>Status</th>
              <th className={th}>Award date</th>
              <th className={th}>Value</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className={td}>{n.title ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{countryName[n.country_id] ?? n.country_id}</td>
                <td className={td}>{n.portal ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{n.status}</td>
                <td className={td}>{n.award_date ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{fmtMoney(n.awarded_value ?? n.estimated_value, n.currency)}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/procurement-notices/${n.id}/edit`}
                      className="text-xs font-medium text-fhi-blue hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={deleteProcurementNotice.bind(null, n.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {notices.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>
                  No procurement notices logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
