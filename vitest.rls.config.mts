import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { defineConfig } from "vitest/config";

// Read .env.local directly. (@next/env skips .env.local when NODE_ENV is
// "test", which Vitest sets, so it can't be used here.)
const envFile = new URL("./.env.local", import.meta.url);
const testEnv = existsSync(envFile)
  ? Object.fromEntries(
      Object.entries(parseEnv(readFileSync(envFile, "utf8"))).filter(
        (entry): entry is [string, string] => Boolean(entry[1]),
      ),
    )
  : {};

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
    env: testEnv,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
