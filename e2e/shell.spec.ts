import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * The app shell: + New, the ⌘K search, the sidebar on wide screens and the
 * bottom bar with More on phones. Runs at phone and desktop widths (see
 * playwright.config.ts), and checks 768px too.
 * Runs against the dev Supabase project in .env.local.
 */
async function addHomeFromNewMenu(page: Page, name: string) {
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("menuitem", { name: "Property" }).click();
  await expect(page).toHaveURL(/\/homes\/new$/);
  await page.getByLabel("Name for this home").fill(name);
  await page.getByLabel("Address line 1").fill(name);
  await page.getByLabel("Postcode").fill("LS6 2AB");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("radio", { name: /As a whole home/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Save home" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.describe("app shell", () => {
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

  test("+ New, search and the menu", async ({ page }) => {
    await user.signIn(page);
    await page.goto("/dashboard");

    await addHomeFromNewMenu(page, "Sample House 01");

    // Ctrl K opens the search from anywhere; a result opens the home.
    await page.goto("/rent");
    await page.keyboard.press("ControlOrMeta+k");
    const search = page.getByRole("dialog", { name: "Search" });
    await expect(search).toBeVisible();
    await search.getByRole("combobox").fill("sample");
    const result = search.getByRole("option", { name: /Sample House 01/ });
    await expect(result).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Sample House 01" }),
    ).toBeVisible();

    // Nothing found says so.
    await page.keyboard.press("ControlOrMeta+k");
    await search.getByRole("combobox").fill("zzzz nothing");
    await expect(search.getByRole("status")).toContainText("Nothing matches");
    await page.keyboard.press("Escape");
    await expect(search).toBeHidden();

    const menu = page.getByRole("navigation", { name: "Main" });
    await expect(menu).toHaveCount(1);
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;

    if (wide) {
      // Sidebar: groups, the current page marked, a count, and Sign out.
      await expect(
        menu.getByRole("link", { name: /^Properties\s*1$/ }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        menu.getByRole("heading", { name: "Portfolio" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
      // Pages that do not exist yet are not in the menu.
      await expect(menu.getByRole("link", { name: "Repairs" })).toHaveCount(0);
    } else {
      // Phone: bottom bar, and More holds Settings and Sign out.
      await expect(menu.getByRole("link", { name: "Today" })).toBeVisible();
      await page.getByRole("button", { name: "More", exact: true }).click();
      const more = page.getByRole("dialog", { name: "More" });
      await expect(more.getByRole("link", { name: "Settings" })).toBeVisible();
      await expect(
        more.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
      await more.getByRole("link", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Settings" }),
      ).toBeVisible();
    }

    // Tablet (768px): the phone layout, and nothing scrolls sideways.
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "More" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
