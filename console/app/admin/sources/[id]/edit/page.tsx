import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { updateSource, deleteSource } from "@/lib/actions";
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

interface SourceRow {
  id: number;
  url: string | null;
  tier: number;
  publisher: string | null;
  title: string | null;
  date_accessed: string | null;
  notes: string | null;
}

export default async function EditSourcePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const rows = await query<SourceRow>(
    `SELECT id, url, tier, publisher, title, to_char(date_accessed, 'YYYY-MM-DD') AS date_accessed, notes
     FROM source WHERE id=$1`,
    [id]
  );
  const source = rows[0];
  if (!source) notFound();

  return (
    <div>
      <PageHeader
        title="Edit source"
        subtitle={source.title ?? source.url ?? `Source #${source.id}`}
        action={<DeleteButton action={deleteSource.bind(null, id)} />}
      />
      <FormCard>
        <form action={updateSource.bind(null, id)} className="space-y-4">
          <FormGrid>
            <Field label="Title">
              <TextInput name="title" defaultValue={source.title ?? ""} />
            </Field>
            <Field label="Publisher">
              <TextInput name="publisher" defaultValue={source.publisher ?? ""} />
            </Field>
            <Field label="URL">
              <TextInput type="url" name="url" defaultValue={source.url ?? ""} />
            </Field>
            <Field label="Evidence tier" required>
              <Select name="tier" defaultValue={String(source.tier)} required>
                <option value="1">1 — ministry / government</option>
                <option value="2">2 — procurement notice (TED / national)</option>
                <option value="3">3 — national eHealth agency</option>
                <option value="4">4 — trade press</option>
                <option value="5">5 — hospital/group own pages</option>
                <option value="6">6 — supplier PR / Wikipedia / profile</option>
                <option value="7">7 — unsourced (never asserted)</option>
              </Select>
            </Field>
            <Field label="Date accessed">
              <TextInput type="date" name="date_accessed" defaultValue={source.date_accessed ?? ""} />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={source.notes ?? ""} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <CancelLink href="/admin/sources" />
          </div>
        </form>
      </FormCard>
    </div>
  );
}
