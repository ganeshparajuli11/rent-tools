import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * The Today page (docs/DESIGN_SYSTEM.md §3.1) at phone, tablet and desktop
 * widths: the first-steps card for a new account, then the figures,
 * "Your homes" and "Rent this month" once a home exists. Saves screenshots
 * to test-results/screens/ for the daily log.
 * Runs against the dev Supabase project in .env.local.
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("today", () => {
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

  test("first steps, then figures, homes and rent at every width", async ({
    page,
  }) => {
    await user.signIn(page);

    // A brand new account: what to do first, at every width.
    for (const size of WIDTHS) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Add your first property" }),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/today-empty-${size.width}.png`,
        fullPage: true,
      });
    }

    // Add a whole home, then come back to Today.
    await page.getByRole("link", { name: "Add a home" }).click();
    await page.getByLabel("Name for this home").fill("Sample House 01");
    await page.getByLabel("Address line 1").fill("1 Sample Street");
    await page.getByLabel("Postcode").fill("LS6 1AA");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: /As a whole home/ }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Save home" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sample House 01" }),
    ).toBeVisible();

    for (const size of WIDTHS) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { level: 2, name: "Needs you" }),
      ).toBeVisible();
      await expect(
        page.locator("dl > div").filter({ hasText: "Rooms let" }),
      ).toContainText("of 1");
      const homes = page.getByRole("region", { name: "Your homes" });
      await expect(
        homes.getByRole("link", { name: /Sample House 01/ }),
      ).toBeVisible();
      await expect(homes).toContainText("Empty");
      await expect(
        page.getByRole("heading", { level: 2, name: "Rent this month" }),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/today-${size.width}.png`,
        fullPage: true,
      });
    }

    // The rent filter lives in the address.
    await page
      .getByRole("navigation", { name: "Filter rent" })
      .getByRole("link", { name: /^Late/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\?rent=late/);
    await expect(
      page.getByText("Nobody is late with this month's rent."),
    ).toBeVisible();
  });
});
