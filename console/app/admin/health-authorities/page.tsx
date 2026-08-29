import Link from "next/link";
import { getCountries, getHealthAuthorities, getSources, sourceLabel } from "@/lib/refdata";
import { createHealthAuthority, deleteHealthAuthority } from "@/lib/actions";
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

export default async function HealthAuthoritiesPage() {
  const [authorities, countries, sources] = await Promise.all([
    getHealthAuthorities(),
    getCountries(),
    getSources(),
  ]);
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Health authorities"
        subtitle="National, regional or local bodies (e.g. HSE in Ireland) that hospital sites and contacts can be linked to."
      />

      <FormCard>
        <form action={createHealthAuthority} className="space-y-4">
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
              <TextInput name="name" placeholder="e.g. Health Service Executive (HSE)" required />
            </Field>
            <Field label="Level">
              <Select name="level" defaultValue="">
                <option value="">—</option>
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="local">Local</option>
              </Select>
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
          <Field label="Description">
            <TextArea name="description" />
          </Field>
          <SubmitButton>Add health authority</SubmitButton>
        </form>
      </FormCard>

      <div className="mt-8">
        <Table>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Country</th>
              <th className={th}>Level</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {authorities.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className={td}>{a.name}</td>
                <td className={td}>{countryName[a.country_id] ?? a.country_id}</td>
                <td className={td}>{a.level ?? <span className="text-slate-300">—</span>}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/health-authorities/${a.id}/edit`}
                      className="text-xs font-medium text-fhi-blue hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={deleteHealthAuthority.bind(null, a.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {authorities.length === 0 && (
              <tr>
                <td className={td} colSpan={4}>
                  No health authorities yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
