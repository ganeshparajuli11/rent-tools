import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

import { getPublicEnv } from "./src/lib/env";
import { securityHeaders } from "./src/lib/security-headers";

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
  // Security headers, including the Content-Security-Policy, on every
  // route. See src/lib/security-headers.ts (and its tests).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDevelopment: process.env.NODE_ENV === "development",
        }),
      },
    ];
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
