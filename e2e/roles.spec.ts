import { expect, type Page, test } from "@playwright/test";

import {
  addDemoHome,
  addToOrganisationOf,
  createTestUser,
  hasAdminEnv,
} from "./helpers/auth";

/**
 * Roles in the interface (docs/DESIGN_SYSTEM.md §8, roadmap B3): a staff
 * member can look at homes but sees no way to add or change them, and a
 * saved link to a form says plainly who can. The server and the database
 * refuse those changes anyway (tests/rls/roles.test.ts). Checked at phone,
 * tablet and desktop widths, with screenshots for the daily log. Runs
 * against the dev Supabase project in .env.local.
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

test.describe("roles: staff look but do not change", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create test users.",
  );

  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let staff: Awaited<ReturnType<typeof createTestUser>>;
  let homeId: string;

  test.beforeEach(async () => {
    owner = await createTestUser();
    staff = await createTestUser({ setUp: false });
    const organisationId = await addToOrganisationOf(
      owner.userId,
      staff.userId,
      "staff",
    );
    homeId = await addDemoHome(organisationId, "Sample House 01");
  });

  test.afterEach(async () => {
    await staff?.cleanup();
    await owner?.cleanup();
  });

  for (const size of WIDTHS) {
    test(`at ${size.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      // A staff member has an organisation, so lands on Today.
      await staff.signIn(page);
      await expect(page.getByRole("button", { name: "New" })).toHaveCount(0);

      await page.goto("/homes");
      await expect(
        page.getByRole("link", { name: /Sample House 01/ }).first(),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Add a home" })).toHaveCount(
        0,
      );
      await expectNoSidewaysScroll(page);

      await page.goto(`/homes/${homeId}`);
      await expect(
        page.getByRole("heading", { name: "Sample House 01" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Edit home" })).toHaveCount(
        0,
      );
      await expect(page.getByRole("button", { name: /Archive/ })).toHaveCount(
        0,
      );
      await expectNoSidewaysScroll(page);

      // A saved link to a form says who can use it, instead of the form.
      for (const path of ["/homes/new", `/homes/${homeId}/edit`]) {
        await page.goto(path);
        await expect(
          page.getByRole("heading", {
            name: "You can look, but not change this",
          }),
        ).toBeVisible();
        await expect(
          page.getByText("Only an owner, admin or manager can do this."),
        ).toBeVisible();
        await expectNoSidewaysScroll(page);
      }
      await page.screenshot({
        path: `test-results/screens/roles-staff-${size.name}.png`,
        fullPage: true,
      });
    });
  }
});
