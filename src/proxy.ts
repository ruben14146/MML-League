import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Best-effort in-memory rate limits. These reset whenever a serverless
// instance recycles and aren't shared across regions/instances, but they
// still throttle sustained abuse from a single client hitting a warm
// instance — a real layer on top of Vercel's platform-level DDoS
// protection, not a substitute for it.
const WINDOW_MS = 60_000;
const GENERAL_LIMIT = 100;
const hits = new Map<string, { count: number; resetAt: number }>();

function sweepIfLarge() {
  if (hits.size <= 5000) return;
  const now = Date.now();
  for (const [k, v] of hits) {
    if (now > v.resetAt) hits.delete(k);
  }
}

function checkLimit(key: string, limit: number, windowMs: number): boolean {
  sweepIfLarge();
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Ticket creation is the highest-value public abuse target (spamming
// ticket rows), so it gets an additional, tighter limit keyed by the
// signed-in Discord ID rather than IP — defeats a single account cycling
// through IPs/VPNs, which the general per-IP limit above can't. Exact path
// only: this must not catch the admin-only PATCH/bulk-status sub-routes,
// which staff can legitimately hit often during a review session.
const TIGHT_LIMITED_EXACT_PATHS = new Set(["/api/tickets"]);
const TIGHT_LIMIT = 10;
const TIGHT_WINDOW_MS = 10 * 60_000;

export async function proxy(request: NextRequest) {
  const ip = clientIp(request);
  const { pathname } = request.nextUrl;

  if (checkLimit(`${ip}:${pathname}`, GENERAL_LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests, slow down and try again shortly." },
      { status: 429 }
    );
  }

  if (!SAFE_METHODS.has(request.method) && TIGHT_LIMITED_EXACT_PATHS.has(pathname)) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    const identity = (token?.discordId as string | undefined) ?? ip;
    if (checkLimit(`tight:${identity}:${pathname}`, TIGHT_LIMIT, TIGHT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many requests, slow down and try again shortly." },
        { status: 429 }
      );
    }
  }

  // CSRF defense-in-depth, two independent signals:
  // - Sec-Fetch-Site is set by the browser itself and can't be forged by
  //   page JS; any mutating request where it isn't same-origin/none is
  //   cross-site and blocked outright.
  // - Origin is checked as a fallback for the (rare) browsers/clients that
  //   omit Sec-Fetch-Site.
  if (!SAFE_METHODS.has(request.method)) {
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }

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
