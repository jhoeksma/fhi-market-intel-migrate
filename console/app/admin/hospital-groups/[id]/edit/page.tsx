import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getCountries } from "@/lib/refdata";
import { updateHospitalGroup, deleteHospitalGroup } from "@/lib/actions";
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
  name: string;
  ownership_type: string | null;
  notes: string | null;
}

export default async function EditHospitalGroupPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [rows, countries] = await Promise.all([
    query<Row>("SELECT * FROM hospital_group WHERE id=$1", [id]),
    getCountries(),
  ]);
  const group = rows[0];
  if (!group) notFound();

  return (
    <div>
      <PageHeader
        title="Edit hospital group"
        subtitle={group.name}
        action={<DeleteButton action={deleteHospitalGroup.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateHospitalGroup.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Country" required>
              <Select name="country_id" defaultValue={String(group.country_id)} required>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" required>
              <TextInput name="name" defaultValue={group.name} required />
            </Field>
            <Field label="Ownership">
              <Select name="ownership_type" defaultValue={group.ownership_type ?? ""}>
                <option value="">—</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={group.notes ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/hospital-groups" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
