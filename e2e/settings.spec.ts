import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Settings, on a phone and on a desktop (both Playwright projects run this
 * file): the late rent email starts on, can be turned off with one tap,
 * Undo turns it back on, and the choice is kept after a reload.
 *
 * Needs the organisations.overdue_email_enabled migration
 * (docs/PENDING_MIGRATIONS.md); without it the page says the setting is not
 * ready, and this test fails on purpose.
 */
test.describe("settings", () => {
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

  test("turn the late rent email off, undo, and off again", async ({
    page,
  }) => {
    await user.signIn(page);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeVisible();

    const toggle = page.getByRole("switch", {
      name: "Email me about late rent",
    });
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // A big enough target for a thumb.
    const box = await toggle.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Late rent emails turned off")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // Keyboard works too: focus the switch and press Space.
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Email me about late rent" }),
    ).toHaveAttribute("aria-checked", "false");
  });
});
