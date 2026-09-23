import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Static for now, deliberately: these are the full branded HTML landscape
// reports shipped as static files under /public/reports (see MANIFEST.md).
// When a new country's report is added, add its file to public/reports/
// and add one entry here — this route doesn't need to change beyond that.
// A future pass could derive this from the DB (e.g. a `report_asset` table
// or a flag on `country`) once reports are generated/stored other than as
// hand-built static files, but that's not needed for this prototype.
const REPORTS: Record<string, { file: string; sizeKB: number }> = {
  AT: { file: "/reports/austria-epr-landscape-report.html", sizeKB: 350 },
  BE: { file: "/reports/belgium-epr-landscape-report.html", sizeKB: 378 },
  CZ: { file: "/reports/czech-republic-epr-landscape-report.html", sizeKB: 451 },
  DK: { file: "/reports/denmark-epr-landscape-report.html", sizeKB: 571 },
  FI: { file: "/reports/finland-epr-landscape-report.html", sizeKB: 311 },
  HU: { file: "/reports/hungary-epr-landscape-report.html", sizeKB: 301 },
  IE: { file: "/reports/ireland-epr-landscape-report.html", sizeKB: 446 },
  NL: { file: "/reports/netherlands-epr-landscape-report.html", sizeKB: 377 },
  PL: { file: "/reports/poland-epr-landscape-report.html", sizeKB: 335 },
  SE: { file: "/reports/sweden-epr-landscape-report.html", sizeKB: 412 },
};

export async function GET() {
  return NextResponse.json(REPORTS);
}
