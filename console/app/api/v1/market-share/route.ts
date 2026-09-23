import { NextResponse } from "next/server";
import { getMarketShare } from "@/lib/marketShare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMarketShare();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/v1/market-share failed", err);
    return NextResponse.json(
      { error: "Failed to load market share data" },
      { status: 500 }
    );
  }
}
