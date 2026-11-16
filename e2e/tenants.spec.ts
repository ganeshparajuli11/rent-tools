import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Tenants journey, on a phone and on a desktop (both Playwright projects run
 * this file): add a home with two rooms, add a tenant to a room in three
 * short steps, see them on the home page, change the rent, mark them as
 * moved out and undo.
 * Runs against the dev Supabase project in .env.local.
 */
test.describe("tenants", () => {
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

  test("add a tenant to a room, edit the rent, move out and undo", async ({
    page,
  }) => {
    await user.signIn(page);

    // A home let by the room, with two rooms and no owner.
    await page.goto("/homes/new");
    await page.getByLabel("Name for this home").fill("7 Elm Street");
    await page.getByLabel("Address line 1").fill("7 Elm Street");
    await page.getByLabel("Postcode").fill("LS6 1AA");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: /By the room/ }).check();
    await page.getByLabel("How many rooms do you let?").fill("2");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Save home" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "7 Elm Street" }),
    ).toBeVisible();

    // Both rooms start empty.
    const room1 = page.getByRole("listitem").filter({ hasText: "Room 1" });
    const room2 = page.getByRole("listitem").filter({ hasText: "Room 2" });
    await expect(room1).toContainText("Empty");
    await expect(room2).toContainText("Empty");

    // Step 1: who
    await page.getByRole("link", { name: "Add a tenant to Room 1" }).click();
    await expect(page.getByText("Room 1, 7 Elm Street")).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Enter the tenant's name")).toBeVisible();
    await page.getByLabel("Tenant's name").fill("Amira Khan");
    await page.getByLabel("Phone (optional)").fill("07700 900123");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: rent, due day, move-in date (pre-filled with today)
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await page.getByLabel("Rent each month, in pounds").fill("550");
    await page.getByLabel("Day of the month rent is due").selectOption("5");
    await expect(page.getByLabel("Date they moved in")).not.toHaveValue("");
    await page.getByLabel("Date they moved in").fill("2026-01-05");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Back keeps the answers
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("Rent each month, in pounds")).toHaveValue(
      "550",
    );
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: deposit is optional
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await page.getByLabel("Deposit, in pounds (optional)").fill("600");
    await page.getByRole("button", { name: "Save tenant" }).click();

    // Tenant page
    await expect(
      page.getByRole("heading", { level: 1, name: "Amira Khan" }),
    ).toBeVisible();
    await expect(page.getByText("Room 1, 7 Elm Street")).toBeVisible();
    await expect(page.getByText("£550 a month, due on the 5th")).toBeVisible();
    await expect(page.getByText("5 January 2026")).toBeVisible();
    await expect(page.getByText("£600", { exact: true })).toBeVisible();

    // The home page shows the tenant against Room 1; Room 2 is still empty.
    await page.getByRole("link", { name: "Back to 7 Elm Street" }).click();
    await expect(room1).toContainText("Amira Khan");
    await expect(room1).toContainText("£550 a month, due on the 5th");
    await expect(room2).toContainText("Empty");
    await expect(
      page.getByRole("link", { name: "Add a tenant to Room 1" }),
    ).toHaveCount(0);

    // Change the rent
    await page.getByRole("link", { name: "Amira Khan" }).click();
    await page.getByRole("link", { name: "Edit tenant" }).click();
    await page.getByLabel("Rent each month, in pounds").fill("575.50");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByText("£575.50 a month, due on the 5th"),
    ).toBeVisible();

    // Moved out, then undo from the toast
    await page.getByRole("button", { name: "Tenant moved out" }).click();
    await expect(page.getByText(/This tenant moved out on/)).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText(/This tenant moved out on/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Tenant moved out" }),
    ).toBeVisible();

    // Moved out for good: the room is empty again and they are a past tenant.
    await page.getByRole("button", { name: "Tenant moved out" }).click();
    await expect(page.getByText(/This tenant moved out on/)).toBeVisible();
    await page.getByRole("link", { name: "Back to 7 Elm Street" }).click();
    await expect(room1).toContainText("Empty");
    await page.getByText("Past tenants (1)").click();
    await expect(page.getByRole("link", { name: "Amira Khan" })).toBeVisible();
  });
});
