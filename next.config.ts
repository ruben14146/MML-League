import type { NextConfig } from "next";

// All security headers (CSP, X-Frame-Options, etc.) are set in src/proxy.ts
// instead of here — the CSP needs a per-request nonce for pages, which
// next.config's static headers() can't provide.
const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
