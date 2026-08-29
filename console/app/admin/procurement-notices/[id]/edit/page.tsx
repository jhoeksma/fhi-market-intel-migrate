import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import {
  getCountries,
  getHealthAuthorities,
  getHospitalGroups,
  getHospitalSites,
  getSources,
  getSuppliers,
  sourceLabel,
} from "@/lib/refdata";
import { updateProcurementNotice, deleteProcurementNotice } from "@/lib/actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Checkbox,
  SubmitButton,
  CancelLink,
  FormCard,
  FormGrid,
  PageHeader,
  DeleteButton,
} from "@/components/AdminForm";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  country_id: number;
  hospital_group_id: number | null;
  hospital_site_id: number | null;
  health_authority_id: number | null;
  notice_id: string | null;
  portal: string | null;
  cpv_codes: string[] | null;
  title: string | null;
  publication_date: string | null;
  award_date: string | null;
  contract_start_date: string | null;
  contract_expiry_date: string | null;
  estimated_value: string | null;
  awarded_value: string | null;
  currency: string | null;
  awarded_supplier_id: number | null;
  is_framework: boolean;
  lot_description: string | null;
  status: string;
  source_id: number | null;
}

export default async function EditProcurementNoticePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [rows, countries, groups, sites, authorities, suppliers, sources] = await Promise.all([
    query<Row>(
      `SELECT id, country_id, hospital_group_id, hospital_site_id, health_authority_id, notice_id, portal,
              cpv_codes, title,
              to_char(publication_date, 'YYYY-MM-DD') AS publication_date,
              to_char(award_date, 'YYYY-MM-DD') AS award_date,
              to_char(contract_start_date, 'YYYY-MM-DD') AS contract_start_date,
              to_char(contract_expiry_date, 'YYYY-MM-DD') AS contract_expiry_date,
              estimated_value, awarded_value, currency, awarded_supplier_id, is_framework,
              lot_description, status, source_id
       FROM procurement_notice WHERE id=$1`,
      [id]
    ),
    getCountries(),
    getHospitalGroups(),
    getHospitalSites(),
    getHealthAuthorities(),
    getSuppliers(),
    getSources(),
  ]);
  const notice = rows[0];
  if (!notice) notFound();

  return (
    <div>
      <PageHeader
        title="Edit procurement notice"
        subtitle={notice.title ?? notice.notice_id ?? `Notice #${notice.id}`}
        action={<DeleteButton action={deleteProcurementNotice.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateProcurementNotice.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Country" required>
              <Select name="country_id" defaultValue={String(notice.country_id)} required>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title">
              <TextInput name="title" defaultValue={notice.title ?? ""} />
            </Field>
            <Field label="Notice ID">
              <TextInput name="notice_id" defaultValue={notice.notice_id ?? ""} />
            </Field>
            <Field label="Portal">
              <TextInput name="portal" defaultValue={notice.portal ?? ""} />
            </Field>
            <Field label="CPV codes" hint="comma-separated">
              <TextInput name="cpv_codes" defaultValue={notice.cpv_codes?.join(", ") ?? ""} />
            </Field>
            <Field label="Status" required>
              <Select name="status" defaultValue={notice.status} required>
                <option value="published">Published</option>
                <option value="awarded">Awarded</option>
                <option value="expired">Expired</option>
              </Select>
            </Field>
            <Field label="Hospital group">
              <Select name="hospital_group_id" defaultValue={notice.hospital_group_id ? String(notice.hospital_group_id) : ""}>
                <option value="">—</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hospital site">
              <Select name="hospital_site_id" defaultValue={notice.hospital_site_id ? String(notice.hospital_site_id) : ""}>
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Health authority">
              <Select
                name="health_authority_id"
                defaultValue={notice.health_authority_id ? String(notice.health_authority_id) : ""}
              >
                <option value="">—</option>
                {authorities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Awarded supplier">
              <Select
                name="awarded_supplier_id"
                defaultValue={notice.awarded_supplier_id ? String(notice.awarded_supplier_id) : ""}
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Publication date">
              <TextInput type="date" name="publication_date" defaultValue={notice.publication_date ?? ""} />
            </Field>
            <Field label="Award date">
              <TextInput type="date" name="award_date" defaultValue={notice.award_date ?? ""} />
            </Field>
            <Field label="Contract start date">
              <TextInput type="date" name="contract_start_date" defaultValue={notice.contract_start_date ?? ""} />
            </Field>
            <Field label="Contract expiry date">
              <TextInput type="date" name="contract_expiry_date" defaultValue={notice.contract_expiry_date ?? ""} />
            </Field>
            <Field label="Estimated value">
              <TextInput type="number" step="0.01" name="estimated_value" defaultValue={notice.estimated_value ?? ""} />
            </Field>
            <Field label="Awarded value">
              <TextInput type="number" step="0.01" name="awarded_value" defaultValue={notice.awarded_value ?? ""} />
            </Field>
            <Field label="Currency">
              <TextInput name="currency" defaultValue={notice.currency ?? "EUR"} maxLength={3} />
            </Field>
            <Field label="Source">
              <Select name="source_id" defaultValue={notice.source_id ? String(notice.source_id) : ""}>
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
            <TextArea name="lot_description" rows={2} defaultValue={notice.lot_description ?? ""} />
          </Field>
          <Checkbox name="is_framework" label="Framework agreement" defaultChecked={notice.is_framework} />
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/procurement-notices" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
