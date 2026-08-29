import Link from "next/link";
import { getSources } from "@/lib/refdata";
import { createSource, deleteSource } from "@/lib/actions";
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

export default async function SourcesPage() {
  const sources = await getSources();

  return (
    <div>
      <PageHeader
        title="Sources"
        subtitle="Evidence citations. Tier 1 = ministry/government, down to tier 7 = unsourced (never asserted on its own)."
      />

      <FormCard>
        <form action={createSource} className="space-y-4">
          <FormGrid>
            <Field label="Title">
              <TextInput name="title" placeholder="e.g. HSE Digital Health Strategy 2024" />
            </Field>
            <Field label="Publisher">
              <TextInput name="publisher" placeholder="e.g. Health Service Executive" />
            </Field>
            <Field label="URL">
              <TextInput type="url" name="url" placeholder="https://..." />
            </Field>
            <Field label="Evidence tier" required>
              <Select name="tier" defaultValue="4" required>
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
              <TextInput type="date" name="date_accessed" />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea name="notes" />
          </Field>
          <SubmitButton>Add source</SubmitButton>
        </form>
      </FormCard>

      <div className="mt-8">
        <Table>
          <thead>
            <tr>
              <th className={th}>Title / URL</th>
              <th className={th}>Publisher</th>
              <th className={th}>Tier</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className={td}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-fhi-blue hover:underline">
                      {s.title ?? s.url}
                    </a>
                  ) : (
                    s.title ?? <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className={td}>{s.publisher ?? <span className="text-slate-300">—</span>}</td>
                <td className={td}>{s.tier}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/sources/${s.id}/edit`} className="text-xs font-medium text-fhi-blue hover:underline">
                      Edit
                    </Link>
                    <DeleteButton action={deleteSource.bind(null, s.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td className={td} colSpan={4}>
                  No sources logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
