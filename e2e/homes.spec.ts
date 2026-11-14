import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Homes journey on a phone: sign in, add a home let by the room with an
 * owner, see it in the list, rename a room, archive the home, undo.
 * Runs against the dev Supabase project in .env.local.
 */
test.describe("homes (phone)", () => {
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

  test("add a home by the room with an owner, rename a room, archive and undo", async ({
    page,
  }) => {
    await user.signIn(page);

    // Empty state for a brand new account.
    await page.goto("/homes");
    await expect(
      page.getByRole("heading", { name: "Add your first home" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Add a home" }).click();

    // Step 1
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page.getByLabel("Name for this home").fill("12 Oak Road");
    await page.getByLabel("Address line 1").fill("12 Oak Road");
    await page.getByLabel("Town or city (optional)").fill("Leeds");
    await page.getByLabel("Postcode").fill("ls61aa");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: by the room, 3 rooms
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await page.getByRole("radio", { name: /By the room/ }).check();
    await page.getByLabel("How many rooms do you let?").fill("3");
    await page.getByRole("button", { name: "Next" }).click();

    // Back keeps the answers
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("How many rooms do you let?")).toHaveValue(
      "3",
    );
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: owner lease
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await page
      .getByRole("radio", { name: /Yes, I pay rent to an owner/ })
      .check();
    await page.getByLabel("Owner's name").fill("Mr Patel");
    await page
      .getByLabel("Rent you pay the owner each month, in pounds")
      .fill("650.50");
    await page.getByLabel("Day of the month it is due").selectOption("1");
    await page.getByRole("button", { name: "Save home" }).click();

    // Home detail
    await expect(
      page.getByRole("heading", { level: 1, name: "12 Oak Road" }),
    ).toBeVisible();
    await expect(page.getByText("LS6 1AA")).toBeVisible();
    await expect(
      page.getByText("£650.50 a month, due on the 1st"),
    ).toBeVisible();
    for (const room of ["Room 1", "Room 2", "Room 3"]) {
      await expect(
        page.getByRole("listitem").filter({ hasText: room }),
      ).toBeVisible();
    }

    // In the list
    await page.getByRole("link", { name: "All homes" }).click();
    const card = page.getByRole("link", { name: /12 Oak Road/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("3 rooms");

    // Rename a room
    await card.click();
    await page.getByRole("button", { name: "Rename Room 1" }).click();
    await page.getByLabel("Room name").fill("Front bedroom");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Front bedroom" }),
    ).toBeVisible();

    // Archive the home, then undo from the toast
    await page.getByRole("button", { name: "Archive this home" }).click();
    await page.waitForURL("**/homes");
    await expect(page.getByRole("link", { name: /12 Oak Road/ })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("link", { name: /12 Oak Road/ })).toBeVisible();
  });
});
