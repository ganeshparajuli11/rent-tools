import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { defineConfig, devices } from "@playwright/test";

// Load .env.local so test helpers can create throwaway users on the dev
// project. Read directly: @next/env skips .env.local when NODE_ENV is "test".
if (existsSync(".env.local")) {
  for (const [key, value] of Object.entries(
    parseEnv(readFileSync(".env.local", "utf8")),
  )) {
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Mobile first: test a phone and a desktop browser.
  projects: [
    // Specs named *-desktop.spec.ts are written for a wide screen only.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testIgnore: /-desktop\.spec\.ts/,
    },
    {
      name: "desktop",
      // 1440px wide, the desktop size every screen must work at.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      // The homes journey is specified for the phone viewport.
      testIgnore: /homes\.spec\.ts/,
    },
  ],
  // Start the dev server unless PLAYWRIGHT_BASE_URL points somewhere else.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
