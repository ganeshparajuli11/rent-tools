import { expect, type Page, test } from "@playwright/test";

import {
  addDemoHome,
  createTestUser,
  hasAdminEnv,
  ownedOrganisationId,
} from "./helpers/auth";
import { openFromMenu } from "./helpers/nav";

/**
 * Owners as records (roadmap C1): add an owner from the Owners page, link
 * them to a home from the home's Owners card, see the home on their
 * record, unlink with Undo, add a second owner straight from the home,
 * and archive an owner with Undo. Checked at phone, tablet and desktop
 * widths, with screenshots for the daily log. Fictional data only. Runs
 * against the dev Supabase project in .env.local.
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

const HOME = "Sample House 01";
const OWNER = "Taylor Example";
const COMPANY = "Demo Estates Ltd";

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("owners", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create a test user.",
  );

  let user: Awaited<ReturnType<typeof createTestUser>>;
  let homeId: string;

  test.beforeEach(async () => {
    user = await createTestUser();
    homeId = await addDemoHome(await ownedOrganisationId(user.userId), HOME);
  });

  test.afterEach(async () => {
    await user?.cleanup();
  });

  for (const size of WIDTHS) {
    test(`at ${size.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await user.signIn(page);

      // Empty list, then add a person.
      await openFromMenu(page, "Owners");
      await expect(
        page.getByRole("heading", { name: "Add your first owner" }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Add an owner" }).first().click();
      await page.getByLabel("Full name").fill(OWNER);
      await page.getByLabel("Email (optional)").fill("not an email");
      await page.getByRole("button", { name: "Save owner" }).click();
      await expect(
        page.getByText("Enter a valid email address, like name@example.com"),
      ).toBeVisible();
      await page.getByLabel("Email (optional)").fill("taylor@example.com");
      await page.getByLabel("Phone (optional)").fill("07700 900123");
      await page.getByRole("button", { name: "Save owner" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: OWNER }),
      ).toBeVisible();
      await expect(page.getByText("Not linked to any home yet.")).toBeVisible();
      await expectNoSidewaysScroll(page);

      // Link them from the home page.
      await page.goto(`/homes/${homeId}`);
      const card = page.getByRole("region", { name: "Owners" });
      await card.getByLabel("Link an owner").selectOption({ label: OWNER });
      await card.getByRole("button", { name: "Link owner" }).click();
      await expect(
        card.getByRole("link", { name: new RegExp(OWNER) }),
      ).toBeVisible();

      // Their record lists the home.
      await card.getByRole("link", { name: new RegExp(OWNER) }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: OWNER }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(HOME) }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/screens/owner-${size.name}.png`,
        fullPage: true,
      });

      // Unlink with Undo.
      await page.goto(`/homes/${homeId}`);
      await card.getByRole("button", { name: `Unlink ${OWNER}` }).click();
      await expect(
        page.getByText(`${OWNER} unlinked from this home`),
      ).toBeVisible();
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(page.getByText(`${OWNER} is linked again`)).toBeVisible();
      await expect(
        card.getByRole("link", { name: new RegExp(OWNER) }),
      ).toBeVisible();

      // A company, added straight from the home, comes back linked.
      await card.getByRole("link", { name: "Add a new owner" }).click();
      await expect(
        page.getByText(`They will be linked to ${HOME}.`),
      ).toBeVisible();
      await page.getByRole("radio", { name: /A company/ }).check();
      await page.getByLabel("Company name").fill(COMPANY);
      await page.getByRole("button", { name: "Save owner" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: HOME }),
      ).toBeVisible();
      await expect(
        card.getByRole("link", { name: new RegExp(COMPANY) }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/screens/home-owners-${size.name}.png`,
        fullPage: true,
      });

      // The list shows both; archive one with Undo.
      await page.goto("/owners");
      await expect(
        page.getByRole("link", { name: new RegExp(COMPANY) }).first(),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/owners-${size.name}.png`,
        fullPage: true,
      });
      await page
        .getByRole("link", { name: new RegExp(COMPANY) })
        .first()
        .click();
      await page.getByRole("button", { name: "Archive this owner" }).click();
      await expect(page.getByText(`${COMPANY} archived`)).toBeVisible();
      await page.getByRole("button", { name: "Undo" }).click();
      await expect(page.getByText(`${COMPANY} is back`)).toBeVisible();
    });
  }
});
