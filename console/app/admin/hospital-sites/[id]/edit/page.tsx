import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getCountries, getHealthAuthorities, getHospitalGroups } from "@/lib/refdata";
import { updateHospitalSite, deleteHospitalSite } from "@/lib/actions";
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
  country_id: number;
  hospital_group_id: number | null;
  health_authority_id: number | null;
  name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  beds: number | null;
  site_type: string | null;
  ownership_type: string | null;
  notes: string | null;
}

export default async function EditHospitalSitePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [rows, countries, groups, authorities] = await Promise.all([
    query<Row>("SELECT * FROM hospital_site WHERE id=$1", [id]),
    getCountries(),
    getHospitalGroups(),
    getHealthAuthorities(),
  ]);
  const site = rows[0];
  if (!site) notFound();

  return (
    <div>
      <PageHeader
        title="Edit hospital site"
        subtitle={site.name}
        action={<DeleteButton action={deleteHospitalSite.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateHospitalSite.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Country" required>
              <Select name="country_id" defaultValue={String(site.country_id)} required>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" required>
              <TextInput name="name" defaultValue={site.name} required />
            </Field>
            <Field label="Hospital group">
              <Select name="hospital_group_id" defaultValue={site.hospital_group_id ? String(site.hospital_group_id) : ""}>
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
                defaultValue={site.health_authority_id ? String(site.health_authority_id) : ""}
              >
                <option value="">—</option>
                {authorities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Address">
              <TextInput name="address" defaultValue={site.address ?? ""} />
            </Field>
            <Field label="City">
              <TextInput name="city" defaultValue={site.city ?? ""} />
            </Field>
            <Field label="Postcode / ZIP">
              <TextInput name="postcode" defaultValue={site.postcode ?? ""} />
            </Field>
            <Field label="Beds">
              <TextInput type="number" name="beds" min={0} defaultValue={site.beds ?? ""} />
            </Field>
            <Field label="Site type">
              <TextInput name="site_type" defaultValue={site.site_type ?? ""} />
            </Field>
            <Field label="Ownership">
              <Select name="ownership_type" defaultValue={site.ownership_type ?? ""}>
                <option value="">—</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={site.notes ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/hospital-sites" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
