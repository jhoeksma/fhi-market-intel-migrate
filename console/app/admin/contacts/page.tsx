import Link from "next/link";
import {
  getHealthAuthorities,
  getHospitalGroups,
  getHospitalSites,
  getSources,
  sourceLabel,
} from "@/lib/refdata";
import { query } from "@/lib/db";
import { createContact, deleteContact } from "@/lib/actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
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

interface ContactRow {
  id: number;
  full_name: string;
  role_title: string;
  role_type: string | null;
  date_last_verified: string;
  hospital_site_id: number | null;
  hospital_group_id: number | null;
  health_authority_id: number | null;
}

export default async function ContactsPage() {
  const [contacts, sites, groups, authorities, sources] = await Promise.all([
    query<ContactRow>(
      `SELECT id, full_name, role_title, role_type,
              to_char(date_last_verified, 'YYYY-MM-DD') AS date_last_verified,
              hospital_site_id, hospital_group_id, health_authority_id
       FROM contact ORDER BY date_last_verified DESC`
    ),
    getHospitalSites(),
    getHospitalGroups(),
    getHealthAuthorities(),
    getSources(),
  ]);
  const siteName = Object.fromEntries(sites.map((s) => [s.id, s.name]));
  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  const authorityName = Object.fromEntries(authorities.map((a) => [a.id, a.name]));

  function linkedTo(c: ContactRow): string {
    if (c.hospital_site_id) return siteName[c.hospital_site_id] ?? `Site #${c.hospital_site_id}`;
    if (c.hospital_group_id) return groupName[c.hospital_group_id] ?? `Group #${c.hospital_group_id}`;
    if (c.health_authority_id) return authorityName[c.health_authority_id] ?? `Authority #${c.health_authority_id}`;
    return "—";
  }

  return (
    <div>
      <PageHeader
        title="Digital leadership contacts"
        subtitle="CCIO / CMIO / CNIO / CIO / CXIO / CDIO holders. Re-verify twice yearly — date last verified drives that cadence."
      />

      <FormCard>
        <form action={createContact} className="space-y-4">
          <FormGrid>
            <Field label="Full name" required>
              <TextInput name="full_name" required />
            </Field>
            <Field label="Role title (as stated)" required>
              <TextInput name="role_title" placeholder="e.g. Chief Clinical Information Officer" required />
            </Field>
            <Field label="Role type">
              <Select name="role_type" defaultValue="">
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
              <TextInput type="date" name="date_last_verified" required />
            </Field>
            <Field label="Hospital site" hint="Link to a site, a group, or a health authority (at least one required)">
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
            <Field label="Start date">
              <TextInput type="date" name="start_date" />
            </Field>
            <Field label="End date">
              <TextInput type="date" name="end_date" />
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
          <Field label="Notes">
            <TextArea name="notes" />
          </Field>
          <SubmitButton>Add contact</SubmitButton>
        </form>
      </FormCard>

      <div className="mt-8">
        <Table>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Role</th>
              <th className={th}>Linked to</th>
              <th className={th}>Last verified</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className={td}>{c.full_name}</td>
                <td className={td}>
                  {c.role_title}
                  {c.role_type && <span className="ml-1 text-xs text-fhi-slate">({c.role_type})</span>}
                </td>
                <td className={td}>{linkedTo(c)}</td>
                <td className={td}>{c.date_last_verified}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/contacts/${c.id}/edit`} className="text-xs font-medium text-fhi-blue hover:underline">
                      Edit
                    </Link>
                    <DeleteButton action={deleteContact.bind(null, c.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>
                  No contacts logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
