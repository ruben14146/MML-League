import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isDev = process.env.NODE_ENV === "development";

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

// Dynamic routes embed an ID/code in the URL itself, so rate-limiting by
// raw pathname is a no-op against them — every guessed value looks like a
// brand-new path with its own fresh counter. Collapse each dynamic segment
// to a placeholder so all attempts against a route share one bucket.
// Static sub-routes under /api/tickets/ that must not be mistaken for a
// dynamic ticket code.
const TICKETS_STATIC_SUBROUTES = new Set(["bulk-status", "leagues", "notify-discord"]);

function normalizePath(pathname: string): string {
  const ticketsMatch = /^\/api\/tickets\/([^/]+)$/.exec(pathname);
  if (ticketsMatch && !TICKETS_STATIC_SUBROUTES.has(ticketsMatch[1])) return "/api/tickets/:code";
  if (/^\/api\/staff\/[^/]+$/.test(pathname)) return "/api/staff/:discordId";
  if (/^\/api\/bans\/[^/]+$/.test(pathname)) return "/api/bans/:discordId";
  if (/^\/api\/ticket-items\/[^/]+$/.test(pathname)) return "/api/ticket-items/:id";
  if (/^\/api\/store-items\/[^/]+$/.test(pathname)) return "/api/store-items/:id";
  return pathname;
}

// Public, unauthenticated, and directly enumerable (short random codes) —
// this is the route most worth capping harder than the general default.
const ROUTE_LIMITS: Record<string, number> = {
  "/api/tickets/:code": 20,
};

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

function supabaseHost() {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : "";
  } catch {
    return "";
  }
}

// API responses are JSON — they execute nothing, so they get the tightest
// possible policy rather than reusing the page CSP.
const API_CSP = "default-src 'none'";

function pageCsp(nonce: string) {
  const supabase = supabaseHost();
  return [
    `default-src 'self'`,
    // 'strict-dynamic' + nonce means only scripts Next.js itself injects
    // (and anything they load) can run — no 'unsafe-inline' fallback for
    // an attacker-injected <script> tag to exploit.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Framer Motion animates via inline style="" attributes on SSR'd
    // markup, which CSP can't nonce — 'unsafe-inline' stays here, but
    // inline *style* injection is a far weaker primitive than inline
    // *script* injection, which is what script-src above now blocks hard.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https://cdn.discordapp.com${supabase ? ` https://${supabase}` : ""}`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");

  if (isApi && !isAuthApi) {
    const ip = clientIp(request);
    const routeKey = normalizePath(pathname);
    const routeLimit = ROUTE_LIMITS[routeKey] ?? GENERAL_LIMIT;

    if (checkLimit(`${ip}:${routeKey}`, routeLimit, WINDOW_MS)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many requests, slow down and try again shortly." },
          { status: 429 }
        ),
        API_CSP
      );
    }

    if (!SAFE_METHODS.has(request.method) && TIGHT_LIMITED_EXACT_PATHS.has(pathname)) {
      const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
      const identity = (token?.discordId as string | undefined) ?? ip;
      if (checkLimit(`tight:${identity}:${pathname}`, TIGHT_LIMIT, TIGHT_WINDOW_MS)) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Too many requests, slow down and try again shortly." },
            { status: 429 }
          ),
          API_CSP
        );
      }
    }

    // CSRF defense-in-depth, two independent signals:
    // - Sec-Fetch-Site is set by the browser itself and can't be forged by
    //   page JS; any mutating request where it isn't same-origin/none is
    //   cross-site and blocked outright.
    // - Origin is checked as a fallback for the (rare) browsers/clients
    //   that omit Sec-Fetch-Site.
    if (!SAFE_METHODS.has(request.method)) {
      const secFetchSite = request.headers.get("sec-fetch-site");
      if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
        return applySecurityHeaders(
          NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 }),
          API_CSP
        );
      }

      const origin = request.headers.get("origin");
      if (origin && origin !== request.nextUrl.origin) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 }),
          API_CSP
        );
      }
    }

    return applySecurityHeaders(NextResponse.next(), API_CSP);
  }

  if (isAuthApi) {
    // NextAuth handles its own CSRF/session logic — just apply baseline
    // headers without touching rate limiting or the CSRF check above.
    return applySecurityHeaders(NextResponse.next(), API_CSP);
  }

  // Page routes: nonce-based CSP. Next.js parses this header on dynamically
  // rendered pages and auto-applies the nonce to its own framework/page
  // scripts, so no per-component change is needed beyond forcing dynamic
  // rendering (see src/app/layout.tsx).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = pageCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, csp);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
