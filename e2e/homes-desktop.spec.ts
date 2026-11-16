import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Homes on a laptop or desktop: the menu is a sidebar, the list is a table
 * that sorts from its headings, and everything works from the keyboard.
 * Also checks that a tablet still gets the phone layout (cards, bottom bar).
 * Runs against the dev Supabase project in .env.local.
 */
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

test.describe("homes (desktop)", () => {
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

  test("sidebar, sortable table, keyboard and tablet layout", async ({
    page,
  }) => {
    await user.signIn(page);
    await addWholeHome(page, "Alder House", "LS6 1AA");
    await addWholeHome(page, "Beech Cottage", "BD1 1AA");

    await page.goto("/homes");

    // The first Tab stop skips the menu and lands in the main area.
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();

    // Sidebar with labelled links; the current page is marked.
    const menu = page.getByRole("navigation", { name: "Main" });
    await expect(menu).toHaveCount(1);
    await expect(menu.getByRole("link", { name: "Homes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    // A table, sorted by name A to Z to begin with.
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    const nameHeading = table.getByRole("columnheader", { name: /Home/ });
    await expect(nameHeading).toHaveAttribute("aria-sort", "ascending");
    await expect(table.getByRole("row").nth(1)).toContainText("Alder House");
    await expect(table.getByRole("row").nth(2)).toContainText("Beech Cottage");

    // Sort Z to A with the keyboard only.
    await nameHeading.getByRole("link").focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/dir=desc/);
    await expect(
      table.getByRole("columnheader", { name: /Home/ }),
    ).toHaveAttribute("aria-sort", "descending");
    await expect(table.getByRole("row").nth(1)).toContainText("Beech Cottage");

    // Sort by postcode: BD1 comes before LS6.
    await table
      .getByRole("columnheader", { name: /Postcode/ })
      .getByRole("link")
      .click();
    await page.waitForURL(/sort=postcode/);
    await expect(table.getByRole("row").nth(1)).toContainText("Beech Cottage");
    await expect(table.getByRole("row").nth(2)).toContainText("Alder House");

    // The home name in a row opens the home.
    await table.getByRole("link", { name: "Alder House" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Alder House" }),
    ).toBeVisible();

    // Tablet (768px): cards and the bottom bar, no table.
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/homes");
    await expect(page.getByRole("table")).toBeHidden();
    await expect(page.getByRole("link", { name: /Alder House/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  });
});
