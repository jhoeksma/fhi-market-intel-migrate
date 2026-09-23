import { importPayload } from "@/lib/actions";
import { Field, TextInput, SubmitButton, FormCard, PageHeader, ErrorBanner } from "@/components/AdminForm";
import type { ImportCounts } from "@/lib/importPayload";

export const dynamic = "force-dynamic";

const COUNT_LABELS: { key: keyof ImportCounts; label: string }[] = [
  { key: "hospitalGroups", label: "Hospital groups created" },
  { key: "hospitalSites", label: "Hospital sites created" },
  { key: "hospitalSitesUpdated", label: "Hospital sites updated (beds backfill)" },
  { key: "deployments", label: "Deployments created" },
  { key: "deploymentCategories", label: "Deployment category rows created" },
  { key: "healthAuthorities", label: "Health authorities created" },
  { key: "procurementNotices", label: "Procurement notices created" },
  { key: "sources", label: "Sources created" },
  { key: "suppliers", label: "Suppliers created" },
];

function ResultSummary({ counts, warnings }: { counts: ImportCounts; warnings: string[] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="mb-8 space-y-4">
      <div className="rounded-lg border border-status-confirmed/30 bg-status-confirmed/10 p-4 text-sm text-fhi-ink">
        <p className="font-medium text-status-confirmed">
          Done. {total === 0 ? "Nothing new — every record in this file already existed." : "Payload imported."}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {COUNT_LABELS.filter((c) => counts[c.key] > 0).map((c) => (
            <div key={c.key} className="flex items-baseline justify-between gap-2 border-b border-status-confirmed/10 py-1">
              <dt className="text-fhi-slate">{c.label}</dt>
              <dd className="tabular-nums font-medium">{counts[c.key]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-fhi-slate">
          Records that already existed (matched by country + name) were left untouched, not duplicated — that&apos;s
          why these counts can be lower than the number of records in the file.
        </p>
      </div>
      {warnings.length > 0 && (
        <div className="rounded-lg border border-status-carveout/30 bg-status-carveout/10 p-4 text-sm">
          <p className="font-medium text-status-carveout">Warnings ({warnings.length}):</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-fhi-ink">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ImportPage({
  searchParams,
}: {
  searchParams?: { error?: string; counts?: string; warnings?: string };
}) {
  let parsedCounts: ImportCounts | null = null;
  if (searchParams?.counts) {
    try {
      parsedCounts = JSON.parse(searchParams.counts);
    } catch {
      parsedCounts = null;
    }
  }
  const warnings = searchParams?.warnings ? searchParams.warnings.split(" | ") : [];

  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Upload a country payload JSON (sources, health authorities, hospital groups, hospital sites, deployments, procurement notices) and load it straight into the database in one transaction."
      />
      <ErrorBanner message={searchParams?.error} />

      {parsedCounts && <ResultSummary counts={parsedCounts} warnings={warnings} />}

      <FormCard>
        <form action={importPayload} className="space-y-4" encType="multipart/form-data">
          <Field
            label="Payload file"
            required
            hint="The .json file built for this country (same shape the old /api/admin/import endpoint takes). Existing records are matched by country + name and reused, not duplicated, so it's safe to re-upload the same file."
          >
            <TextInput type="file" name="file" accept="application/json,.json" required />
          </Field>
          <div className="rounded-md border border-status-unconfirmed/30 bg-status-unconfirmed/10 px-4 py-3 text-sm text-fhi-ink">
            Everything in the file is applied in a single transaction — if anything in it fails (an unknown country,
            an unresolved cross-reference, an unrecognised system category name), nothing from this file is saved.
            Fix the file and re-upload.
          </div>
          <SubmitButton>Import payload</SubmitButton>
        </form>
      </FormCard>
    </div>
  );
}
