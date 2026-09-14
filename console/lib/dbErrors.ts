// Turns raw Postgres errors from `pg` into messages a person can act on,
// instead of letting them bubble up to Next.js's generic
// "Application error: a server-side exception has occurred" page (which
// hides the real cause behind a digest that only server logs can explain).
//
// Returns null for anything that isn't a recognized, safe-to-show
// constraint violation — callers fall back to a generic message rather
// than risk leaking raw DB internals for an error we don't understand.

interface PgErrorShape {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
}

const FRIENDLY_TABLE: Record<string, string> = {
  hospital_site: "hospital site",
  hospital_group: "hospital group",
  deployment: "deployment",
  deployment_category: "deployment category entry",
  procurement_notice: "procurement notice",
  contact: "contact",
  health_authority: "health authority",
};

function friendlyTableName(table: string | undefined): string {
  if (!table) return "another record";
  return FRIENDLY_TABLE[table] ?? table.replace(/_/g, " ");
}

export function friendlyDbError(err: unknown): string | null {
  const e = err as PgErrorShape | null | undefined;
  if (!e || typeof e !== "object" || !e.code) return null;

  // foreign_key_violation — deleting/updating a row something else still points at
  if (e.code === "23503") {
    const m = e.detail?.match(/still referenced from table "(\w+)"/);
    const label = friendlyTableName(m?.[1]);
    return `Can't delete — it's still linked to at least one ${label}. Delete that first, then try again.`;
  }

  // unique_violation — usually the (country, name) natural key on these tables
  if (e.code === "23505") {
    const m = e.detail?.match(/^Key \(([^)]+)\)=\(([^)]+)\) already exists\.?$/);
    if (m) {
      return `A record already exists with the same ${m[1].replace(/_/g, " ")} (${m[2]}). Edit the existing one instead, or use a different name.`;
    }
    return "A record with that same name already exists. Edit the existing one instead, or use a different name.";
  }

  return null;
}
