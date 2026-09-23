import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Shared-password gate for the internal/commercial surfaces of this app.
// `/` (the public coverage-stats page) is deliberately left open — it shows
// only row counts, not the branded reports or market-share breakdowns.
// Everything else that exposes FHI's paid intelligence (the analytics
// dashboard, the full country reports, the admin CRUD tools, and the API
// routes that back the dashboard) sits behind one shared password.
//
// This runs on the Edge runtime, so it uses atob() rather than Buffer.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/api/v1/:path*",
  ],
};

const REALM = "FHI Market Intelligence";

export function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;

  // Fail loud, not open: an unconfigured password on a commercial deployment
  // should block access, not silently let everyone through.
  if (!expected) {
    return new NextResponse(
      "Site password is not configured (SITE_PASSWORD env var missing).",
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(":");
    const supplied = idx >= 0 ? decoded.slice(idx + 1) : decoded;
    if (timingSafeEqual(supplied, expected)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
