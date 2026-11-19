import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Data rights, on a phone and on a desktop (both Playwright projects run
 * this file): download the tenants file from Settings, then remove a past
 * tenant's personal details and check they are gone from the page and the
 * next download.
 */
test.describe("data rights", () => {
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

  async function downloadTenants(page: import("@playwright/test").Page) {
    await page.goto("/settings");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download tenants" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(
      /^tenants-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    return readFile((await download.path())!, "utf8");
  }

  test("download tenants, then remove a past tenant's details", async ({
    page,
  }) => {
    await user.signIn(page);

    // A home let as a whole, with one tenant.
    await page.goto("/homes/new");
    await page.getByLabel("Name for this home").fill("3 Ash Road");
    await page.getByLabel("Address line 1").fill("3 Ash Road");
    await page.getByLabel("Postcode").fill("LS7 2BB");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: /As a whole/ }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Save home" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "3 Ash Road" }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Add a tenant/ }).click();
    await page.getByLabel("Tenant's name").fill("Sam Patel");
    await page.getByLabel("Phone (optional)").fill("07700 900321");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Rent each month, in pounds").fill("800");
    await page.getByLabel("Day of the month rent is due").selectOption("1");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Save tenant" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sam Patel" }),
    ).toBeVisible();
    const tenantUrl = page.url();

    // A current tenant cannot have their details removed.
    await expect(
      page.getByRole("button", { name: "Remove their personal details" }),
    ).toHaveCount(0);

    // The download has them, with the phone number kept as text.
    const before = await downloadTenants(page);
    expect(before).toContain('"Sam Patel"');
    expect(before).toContain('"07700 900321"');
    expect(before).toContain('"800.00"');

    // Move them out, then remove their details.
    await page.goto(tenantUrl);
    await page.getByRole("button", { name: "Tenant moved out" }).click();
    await expect(page.getByText(/This tenant moved out on/)).toBeVisible();

    const remove = page.getByRole("button", {
      name: "Remove their personal details",
    });
    const box = await remove.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await remove.click();

    // Nothing happens until the second, clearly worded button.
    await expect(
      page.getByRole("heading", { name: "Remove Sam Patel's details?" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Keep their details" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sam Patel" }),
    ).toBeVisible();

    // Keyboard only this time.
    await remove.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Yes, remove their details" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Their personal details have been removed").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Former tenant (details removed)",
      }),
    ).toBeVisible();
    await expect(page.getByText("07700 900321")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit tenant" })).toHaveCount(
      0,
    );

    // Gone from the next download too; their rent is still there.
    const after = await downloadTenants(page);
    expect(after).not.toContain("Sam Patel");
    expect(after).not.toContain("07700 900321");
    expect(after).toContain('"Former tenant (details removed)"');
    expect(after).toContain('"800.00"');
  });
});
