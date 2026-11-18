import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards for the service-role key, which bypasses row-level security.
 * These read the source files, so they fail the build the moment someone
 * imports the service-role client, or reads the key, in the wrong place.
 */

const SRC = join(process.cwd(), "src");

/** The only files allowed to import src/server/service-client.ts. */
const ALLOWED_IMPORTERS = [
  "app/api/cron/overdue-reminders/route.ts",
  "app/api/cron/rent-charges/route.ts",
];

/** The only file allowed to read the key from the environment. */
const ALLOWED_KEY_READERS = ["server/env.ts"];

function sourceFiles(): { path: string; text: string }[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => ({
      path: relative(SRC, join(SRC, name)).split(sep).join("/"),
      text: readFileSync(join(SRC, name), "utf8"),
    }));
}

describe("service-role client", () => {
  const files = sourceFiles();

  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.map((f) => f.path)).toContain("server/service-client.ts");
  });

  it("is imported by the cron routes and nothing else", () => {
    const importers = files
      .filter((f) => f.path !== "server/service-client.ts")
      .filter((f) => /from\s+["'][^"']*service-client["']/.test(f.text))
      .map((f) => f.path);
    expect([...importers].sort()).toEqual(ALLOWED_IMPORTERS);
  });

  it("is never imported by browser code", () => {
    const clientFiles = files.filter((f) => /^["']use client["']/.test(f.text));
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      expect(file.text, file.path).not.toMatch(/service-client/);
      expect(file.text, file.path).not.toMatch(/SERVICE_ROLE/);
    }
  });

  it("the key is read from the environment in one file only", () => {
    const readers = files
      .filter((f) => /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(f.text))
      .map((f) => f.path);
    expect(readers).toEqual(ALLOWED_KEY_READERS);
  });

  it("the service-role client file is server-only", () => {
    const file = files.find((f) => f.path === "server/service-client.ts");
    expect(file?.text).toMatch(/^import "server-only";/);
  });
});
