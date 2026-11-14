import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Load .env.local the same way `next dev` does.
nextEnv.loadEnvConfig(process.cwd(), true);

// Row-level security isolation tests. These talk to a REAL Supabase project
// (the one in .env.local), so they are kept out of `pnpm test`.
// Run with:  pnpm test:rls
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // The data layer imports "server-only", which throws outside Next.js.
    // These tests call that server code directly, so stub it out here.
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/rls/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
