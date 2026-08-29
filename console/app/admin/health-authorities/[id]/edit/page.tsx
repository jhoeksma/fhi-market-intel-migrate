import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getCountries, getSources, sourceLabel } from "@/lib/refdata";
import { updateHealthAuthority, deleteHealthAuthority } from "@/lib/actions";
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
  level: string | null;
  description: string | null;
  source_id: number | null;
}

export default async function EditHealthAuthorityPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [rows, countries, sources] = await Promise.all([
    query<Row>("SELECT * FROM health_authority WHERE id=$1", [id]),
    getCountries(),
    getSources(),
  ]);
  const ha = rows[0];
  if (!ha) notFound();

  return (
    <div>
      <PageHeader
        title="Edit health authority"
        subtitle={ha.name}
        action={<DeleteButton action={deleteHealthAuthority.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateHealthAuthority.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Country" required>
              <Select name="country_id" defaultValue={String(ha.country_id)} required>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" required>
              <TextInput name="name" defaultValue={ha.name} required />
            </Field>
            <Field label="Level">
              <Select name="level" defaultValue={ha.level ?? ""}>
                <option value="">—</option>
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="local">Local</option>
              </Select>
            </Field>
            <Field label="Source">
              <Select name="source_id" defaultValue={ha.source_id ? String(ha.source_id) : ""}>
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
            <TextArea name="description" defaultValue={ha.description ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/health-authorities" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
