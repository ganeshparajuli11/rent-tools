import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

import { getPublicEnv } from "./src/lib/env";

/**
 * Baseline security headers for every route.
 *
 * TODO(security): add a Content-Security-Policy. It needs nonces or hashes for
 * Next.js inline scripts, plus connect-src for the Supabase URL. See
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
 */
const securityHeaders = [
  {
    // Force HTTPS for 2 years, including subdomains.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Block the app from being shown inside iframes (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tailwind CSS v4 through Turbopack (set up by create-next-app).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default function config(phase: string): NextConfig {
  // Validate public env vars when `next dev` / `next build` start (fails fast).
  // (`pnpm typecheck` sets SKIP_ENV_VALIDATION=1: route type generation needs no keys.)
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    getPublicEnv();
  }
  return nextConfig;
}
