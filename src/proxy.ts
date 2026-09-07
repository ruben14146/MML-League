import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Best-effort in-memory rate limit. This resets whenever a serverless
// instance recycles and isn't shared across regions/instances, but it still
// throttles sustained abuse from a single client hitting a warm instance —
// a meaningful layer on top of Vercel's platform-level DDoS protection.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 100;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();

  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now > v.resetAt) hits.delete(k);
    }
  }

  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  const ip = clientIp(request);

  if (isRateLimited(`${ip}:${request.nextUrl.pathname}`)) {
    return NextResponse.json(
      { error: "Too many requests, slow down and try again shortly." },
      { status: 429 }
    );
  }

  // Defense-in-depth CSRF check: browsers always send an Origin header on
  // cross-site fetch/form submissions, so any mutating API request whose
  // Origin doesn't match our own is rejected. Same-site requests from our
  // own frontend always match; requests with no Origin header (e.g. direct
  // API tooling) are left to the route's own auth check.
  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Every API route except NextAuth's own (which has its own CSRF/session
  // handling and shouldn't be rate-limited during the OAuth redirect dance).
  matcher: ["/api/((?!auth).*)"],
};
