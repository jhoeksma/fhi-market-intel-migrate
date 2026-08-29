import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getHealthAuthorities, getHospitalGroups, getHospitalSites, getSources, sourceLabel } from "@/lib/refdata";
import { updateContact, deleteContact } from "@/lib/actions";
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
} from "@/components/AdminForm";

export const dynamic = "force-dynamic";

interface Row {
  id: number;
  hospital_site_id: number | null;
  hospital_group_id: number | null;
  health_authority_id: number | null;
  full_name: string;
  role_title: string;
  role_type: string | null;
  start_date: string | null;
  end_date: string | null;
  date_last_verified: string;
  source_id: number | null;
  notes: string | null;
}

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [rows, sites, groups, authorities, sources] = await Promise.all([
    query<Row>(
      `SELECT id, hospital_site_id, hospital_group_id, health_authority_id, full_name, role_title, role_type,
              to_char(start_date, 'YYYY-MM-DD') AS start_date,
              to_char(end_date, 'YYYY-MM-DD') AS end_date,
              to_char(date_last_verified, 'YYYY-MM-DD') AS date_last_verified,
              source_id, notes
       FROM contact WHERE id=$1`,
      [id]
    ),
    getHospitalSites(),
    getHospitalGroups(),
    getHealthAuthorities(),
    getSources(),
  ]);
  const contact = rows[0];
  if (!contact) notFound();

  return (
    <div>
      <PageHeader
        title="Edit contact"
        subtitle={`${contact.full_name} — ${contact.role_title}`}
        action={<DeleteButton action={deleteContact.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateContact.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Full name" required>
              <TextInput name="full_name" defaultValue={contact.full_name} required />
            </Field>
            <Field label="Role title (as stated)" required>
              <TextInput name="role_title" defaultValue={contact.role_title} required />
            </Field>
            <Field label="Role type">
              <Select name="role_type" defaultValue={contact.role_type ?? ""}>
                <option value="">—</option>
                <option value="CCIO">CCIO</option>
                <option value="CMIO">CMIO</option>
                <option value="CNIO">CNIO</option>
                <option value="CIO">CIO</option>
                <option value="CXIO">CXIO</option>
                <option value="CDIO">CDIO</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Date last verified" required>
              <TextInput type="date" name="date_last_verified" defaultValue={contact.date_last_verified} required />
            </Field>
            <Field label="Hospital site">
              <Select name="hospital_site_id" defaultValue={contact.hospital_site_id ? String(contact.hospital_site_id) : ""}>
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Hospital group">
              <Select name="hospital_group_id" defaultValue={contact.hospital_group_id ? String(contact.hospital_group_id) : ""}>
                <option value="">—</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Health authority">
              <Select
                name="health_authority_id"
                defaultValue={contact.health_authority_id ? String(contact.health_authority_id) : ""}
              >
                <option value="">—</option>
                {authorities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <TextInput type="date" name="start_date" defaultValue={contact.start_date ?? ""} />
            </Field>
            <Field label="End date">
              <TextInput type="date" name="end_date" defaultValue={contact.end_date ?? ""} />
            </Field>
            <Field label="Source">
              <Select name="source_id" defaultValue={contact.source_id ? String(contact.source_id) : ""}>
                <option value="">—</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sourceLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={contact.notes ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/contacts" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
