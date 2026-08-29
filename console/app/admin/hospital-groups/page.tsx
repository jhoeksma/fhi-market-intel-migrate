import Link from "next/link";
import { getCountries, getHospitalGroups } from "@/lib/refdata";
import { createHospitalGroup, deleteHospitalGroup } from "@/lib/actions";
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

export default async function HospitalGroupsPage() {
  const [groups, countries] = await Promise.all([getHospitalGroups(), getCountries()]);
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Hospital groups"
        subtitle="Multi-site operators (e.g. an HSE hospital group, a private chain). A group can host deployments, procurement notices and contacts directly, even before its individual sites are entered."
      />

      <FormCard>
        <form action={createHospitalGroup} className="space-y-4">
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
            <Field label="Name" required>
              <TextInput name="name" placeholder="e.g. Ireland East Hospital Group" required />
            </Field>
            <Field label="Ownership">
              <Select name="ownership_type" defaultValue="">
                <option value="">—</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" />
          </Field>
          <SubmitButton>Add hospital group</SubmitButton>
        </form>
      </FormCard>

      <div className="mt-8">
        <Table>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Country</th>
              <th className={th}>Ownership</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50">
                <td className={td}>{g.name}</td>
                <td className={td}>{countryName[g.country_id] ?? g.country_id}</td>
                <td className={td}>{g.ownership_type ?? <span className="text-slate-300">—</span>}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/hospital-groups/${g.id}/edit`}
                      className="text-xs font-medium text-fhi-blue hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={deleteHospitalGroup.bind(null, g.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td className={td} colSpan={4}>
                  No hospital groups yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
