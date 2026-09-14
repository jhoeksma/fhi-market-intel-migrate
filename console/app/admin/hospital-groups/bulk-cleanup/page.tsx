import Link from "next/link";
import { getCountries } from "@/lib/refdata";
import { bulkCleanupHospitalGroups } from "@/lib/actions";
import {
  Field,
  TextArea,
  Select,
  SubmitButton,
  FormCard,
  FormGrid,
  PageHeader,
  ErrorBanner,
} from "@/components/AdminForm";

export const dynamic = "force-dynamic";

function ResultSummary({
  deleted,
  sites,
  deployments,
  notFound,
  skipped,
}: {
  deleted: string;
  sites: string;
  deployments: string;
  notFound?: string;
  skipped?: string;
}) {
  const notFoundNames = notFound ? notFound.split(" | ") : [];
  const skippedRows = skipped ? skipped.split(" | ") : [];
  return (
    <div className="mb-8 space-y-4">
      <div className="rounded-lg border border-status-confirmed/30 bg-status-confirmed/10 p-4 text-sm text-fhi-ink">
        <p className="font-medium text-status-confirmed">Done.</p>
        <p className="mt-1">
          Deleted <b className="tabular-nums">{deleted}</b> hospital group{deleted === "1" ? "" : "s"}, along with{" "}
          <b className="tabular-nums">{sites}</b> hospital site{sites === "1" ? "" : "s"} and{" "}
          <b className="tabular-nums">{deployments}</b> deployment{deployments === "1" ? "" : "s"} under them.
        </p>
      </div>
      {notFoundNames.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-fhi-ink">
            Not found ({notFoundNames.length}) — already gone, or the name didn&apos;t match exactly:
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-fhi-slate">
            {notFoundNames.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {skippedRows.length > 0 && (
        <div className="rounded-lg border border-status-carveout/30 bg-status-carveout/10 p-4 text-sm">
          <p className="font-medium text-status-carveout">
            Skipped ({skippedRows.length}) — left untouched, needs a look:
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-fhi-ink">
            {skippedRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function BulkCleanupPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    deleted?: string;
    sites?: string;
    deployments?: string;
    notFound?: string;
    skipped?: string;
  };
}) {
  const countries = await getCountries();
  const hasResult = searchParams?.deleted !== undefined;

  return (
    <div>
      <PageHeader
        title="Bulk cleanup"
        subtitle="Delete a batch of hospital groups by exact name — along with their hospital sites and deployments — in the right order, in one go."
        action={
          <Link href="/admin/hospital-groups" className="text-xs font-medium text-fhi-blue hover:underline">
            ← Back to hospital groups
          </Link>
        }
      />
      <ErrorBanner message={searchParams?.error} />

      {hasResult && (
        <ResultSummary
          deleted={searchParams!.deleted!}
          sites={searchParams?.sites ?? "0"}
          deployments={searchParams?.deployments ?? "0"}
          notFound={searchParams?.notFound}
          skipped={searchParams?.skipped}
        />
      )}

      <FormCard>
        <form action={bulkCleanupHospitalGroups} className="space-y-4">
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
          </FormGrid>
          <Field
            label="Hospital group names"
            required
            hint="One exact name per line — must match the existing record's name exactly (case-insensitive). Copy them straight from wherever you have the list."
          >
            <TextArea name="names" rows={14} placeholder={"Centrum Onkologii -- Instytut im. Marii Sklodowskiej-Curie, Oddzial w Gliwicach\nEMC Instytut Medyczny\nGrupa LUX MED\n…"} required />
          </Field>
          <div className="rounded-md border border-status-unconfirmed/30 bg-status-unconfirmed/10 px-4 py-3 text-sm text-fhi-ink">
            For each name: deletes the group, every hospital site under it, and every deployment on that group or
            those sites. Skips (doesn&apos;t touch) any group or site that still has a contact or procurement notice
            attached, and reports those separately. This can&apos;t be undone.
          </div>
          <SubmitButton>Delete these groups</SubmitButton>
        </form>
      </FormCard>
    </div>
  );
}
