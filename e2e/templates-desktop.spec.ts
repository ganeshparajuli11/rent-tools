import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * The page templates (docs/DESIGN_SYSTEM.md §3) at the three widths every
 * screen must work at: 375px (phone), 768px (tablet) and 1440px (desktop).
 * Checks that nothing scrolls sideways and saves a screenshot of each page
 * to test-results/screens/ for the daily log.
 * Runs against the dev Supabase project in .env.local.
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function addWholeHome(page: Page, name: string, postcode: string) {
  await page.goto("/homes/new");
  await page.getByLabel("Name for this home").fill(name);
  await page.getByLabel("Address line 1").fill(name);
  await page.getByLabel("Postcode").fill(postcode);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /As a whole home/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Save home" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("page templates", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create a test user.",
  );

  let user: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    await user?.cleanup();
  });

  test("list, record and rent pages at 375, 768 and 1440px", async ({
    page,
  }) => {
    await user.signIn(page);
    await addWholeHome(page, "Sample House 01", "LS6 1AA");
    const homeUrl = page.url();

    for (const size of WIDTHS) {
      await page.setViewportSize({ width: size.width, height: size.height });

      // List page: title with a count, filter tabs, cards or a table.
      await page.goto("/homes");
      await expect(
        page.getByRole("heading", { level: 1, name: /Properties/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Filter homes" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Current" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/properties-${size.width}.png`,
        fullPage: true,
      });

      // Record page: header, status, tabs, stat cards.
      await page.goto(homeUrl);
      await expect(
        page.getByRole("heading", { level: 1, name: "Sample House 01" }),
      ).toBeVisible();
      await expect(
        page.getByText("Empty", { exact: true }).first(),
      ).toBeVisible();
      const tabs = page.getByRole("navigation", {
        name: "Sections of this home",
      });
      await expect(
        tabs.getByRole("link", { name: /Overview/ }),
      ).toHaveAttribute("aria-current", "page");
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/home-${size.width}.png`,
        fullPage: true,
      });

      // The Photos tab is its own address.
      await tabs.getByRole("link", { name: /Photos/ }).click();
      await page.waitForURL(/tab=photos/);
      await expect(
        page.getByRole("heading", { level: 2, name: /Photos/ }),
      ).toBeVisible();

      // Rent page: empty state with one action.
      await page.goto("/rent");
      await expect(
        page.getByRole("heading", { level: 1, name: "Rent" }),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/rent-${size.width}.png`,
        fullPage: true,
      });
    }
  });
});
