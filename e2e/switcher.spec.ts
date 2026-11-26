import { expect, type Page, test } from "@playwright/test";

import {
  addDemoHome,
  addToOrganisationOf,
  createTestUser,
  hasAdminEnv,
  renameOrganisation,
} from "./helpers/auth";

/**
 * The organisation switcher (roadmap B5): someone in two organisations
 * picks the other one in the sidebar (or the phone More sheet), lands on
 * Today, and every page then shows that organisation's homes and their
 * role there. The choice survives a reload. The server re-checks it
 * against their memberships on every request (src/server/context.ts).
 * Checked at phone, tablet and desktop widths, with screenshots for the
 * daily log. Runs against the dev Supabase project in .env.local.
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

const FIRST = "E2E Demo Lettings";
const SECOND = "Sample Lettings Two";

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Opens the More sheet on phones and tablets; the sidebar is enough on desktop. */
async function showOrganisationBlock(page: Page) {
  const inSidebar = page.getByRole("button", { name: /^Organisation: / });
  if (await inSidebar.first().isVisible()) return;
  await page.getByRole("button", { name: "More", exact: true }).click();
}

async function closeMoreSheet(page: Page) {
  const sheet = page.getByRole("dialog", { name: "More" });
  if (await sheet.isVisible()) await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
}

async function switchTo(page: Page, from: string, to: string) {
  await showOrganisationBlock(page);
  await page
    .getByRole("button", { name: `Organisation: ${from}. Switch organisation` })
    .click();
  await page.getByRole("menuitem", { name: new RegExp(to) }).click();
  await expect(page.getByText(`Now working in ${to}`)).toBeVisible();
  await page.waitForURL("**/dashboard");
  await closeMoreSheet(page);
}

test.describe("organisation switcher", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create test users.",
  );

  let person: Awaited<ReturnType<typeof createTestUser>>;
  let otherOwner: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeEach(async () => {
    // Owner of their own organisation, and staff in someone else's.
    person = await createTestUser();
    otherOwner = await createTestUser();
    const theirs = await addToOrganisationOf(
      otherOwner.userId,
      person.userId,
      "staff",
    );
    await renameOrganisation(theirs, SECOND);
    await addDemoHome(theirs, "Sample House 02");
  });

  test.afterEach(async () => {
    await person?.cleanup();
    await otherOwner?.cleanup();
  });

  for (const size of WIDTHS) {
    test(`at ${size.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      // The first organisation they joined is where they start.
      await person.signIn(page);
      await expect(page.getByRole("button", { name: "New" })).toBeVisible();

      await page.goto("/homes");
      await switchTo(page, FIRST, SECOND);

      // Staff here: no + New, and the other organisation's homes.
      await expect(page.getByRole("button", { name: "New" })).toHaveCount(0);
      await page.goto("/homes");
      await expect(
        page.getByRole("link", { name: /Sample House 02/ }).first(),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);

      // Still there after a reload.
      await page.reload();
      await expect(
        page.getByRole("link", { name: /Sample House 02/ }).first(),
      ).toBeVisible();

      await showOrganisationBlock(page);
      await page
        .getByRole("button", {
          name: `Organisation: ${SECOND}. Switch organisation`,
        })
        .click();
      await expect(
        page.getByRole("menuitem", { name: new RegExp(FIRST) }),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/screens/switcher-${size.name}.png`,
        fullPage: true,
      });
      await page.getByRole("menuitem", { name: new RegExp(FIRST) }).click();
      await expect(page.getByText(`Now working in ${FIRST}`)).toBeVisible();
      await page.waitForURL("**/dashboard");
      await closeMoreSheet(page);

      // Back in their own organisation, as its owner.
      await expect(page.getByRole("button", { name: "New" })).toBeVisible();
      await page.goto("/homes");
      await expect(
        page.getByRole("link", { name: /Sample House 02/ }),
      ).toHaveCount(0);
    });
  }
});
