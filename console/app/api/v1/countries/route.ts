import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CountryRow {
  iso2: string;
  name: string;
}

// All 27 EU member states, independent of how much (if any) hospital data
// has been imported for a given one yet — this is what backs the Country
// Reports dropdown's "not yet researched" greyed-out entries. The `country`
// reference table is seeded with the full EU27 + UK/NO/IS/LI list by
// migrate.py regardless of import status, so this needs no separate seed.
export async function GET() {
  try {
    const rows = await query<CountryRow>(
      "SELECT iso2, name FROM country WHERE is_eu = true ORDER BY name"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/v1/countries failed", err);
    return NextResponse.json(
      { error: "Failed to load country list" },
      { status: 500 }
    );
  }
}
