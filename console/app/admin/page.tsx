import Link from "next/link";
import { getCountries, getHealthAuthorities, getHospitalGroups, getHospitalSites } from "@/lib/refdata";
import { createHospitalSite, deleteHospitalSite } from "@/lib/actions";
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

export default async function HospitalSitesPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const [sites, countries, groups, authorities] = await Promise.all([
    getHospitalSites(),
    getCountries(),
    getHospitalGroups(),
    getHealthAuthorities(),
  ]);
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const groupName = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  return (
    <div>
      <PageHeader
        title="Hospital sites"
        subtitle="Individual hospital sites. Link to a hospital group and/or health authority where known."
      />
      <ErrorBanner message={searchParams?.error} />

      <CollapsibleFormCard title="+ Add a new hospital site">
        <form action={createHospitalSite} className="space-y-4">
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
              <TextInput name="name" placeholder="e.g. St. Vincent's University Hospital" required />
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
            <Field label="Address" hint="Street address">
              <TextInput name="address" />
            </Field>
            <Field label="City">
              <TextInput name="city" />
            </Field>
            <Field label="Postcode / ZIP">
              <TextInput name="postcode" />
            </Field>
            <Field label="Beds">
              <TextInput type="number" name="beds" min={0} />
            </Field>
            <Field label="Site type" hint="e.g. acute, maternity, community">
              <TextInput name="site_type" />
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
          <SubmitButton>Add hospital site</SubmitButton>
        </form>
      </CollapsibleFormCard>

      <div className="mt-8">
        <AdminTableFilter
          tableId="hospital-sites-table"
          countries={countries}
          searchPlaceholder="Search by name, city or postcode…"
        />
        <Table id="hospital-sites-table">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Country</th>
              <th className={th}>Group</th>
              <th className={th}>City</th>
              <th className={th}>Postcode</th>
              <th className={th}>Beds</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-slate-50"
                data-row-search={`${s.name} ${countryName[s.country_id] ?? ""} ${
                  s.hospital_group_id ? groupName[s.hospital_group_id] ?? "" : ""
                } ${s.city ?? ""} ${s.postcode ?? ""}`.toLowerCase()}
                data-row-country={s.country_id}
              >
                <td className={td}>{s.name}</td>
                <td className={td}>{countryName[s.country_id] ?? s.country_id}</td>
                <td className={td}>
                  {s.hospital_group_id ? groupName[s.hospital_group_id] ?? s.hospital_group_id : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className={td}>{s.city ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{s.postcode ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{s.beds ?? <span className="text-slate-300">—</span>}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/hospital-sites/${s.id}/edit`}
                      className="text-xs font-medium text-fhi-blue hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={deleteHospitalSite.bind(null, s.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td className={td} colSpan={7}>
                  No hospital sites yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
