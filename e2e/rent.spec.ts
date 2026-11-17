import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Rent journey, on a phone and on a desktop (both Playwright projects run
 * this file): add a home let as a whole with an owner, add a tenant who
 * moves in today, then on the rent page take a part payment, mark the rest
 * as paid, undo, and remove a payment. The dashboard shows the same money.
 *
 * The tenant moves in today, so this month's rent is due today at the
 * earliest and is never "Late", whatever day the test runs.
 *
 * Runs against the dev Supabase project in .env.local. "Undo" and "Remove"
 * need the payments.removed_at migration (docs/PENDING_MIGRATIONS.md).
 */
test.describe("rent", () => {
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

  test("part payment, mark as paid, undo and remove; dashboard adds up", async ({
    page,
  }) => {
    await user.signIn(page);

    // The menu has a Rent link, and the page starts empty.
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Rent" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Rent" }),
    ).toBeVisible();
    await expect(page.getByText(/^No rent for /)).toBeVisible();

    // A whole home, rented from an owner for £400 a month.
    await page.goto("/homes/new");
    await page.getByLabel("Name for this home").fill("9 Birch Way");
    await page.getByLabel("Address line 1").fill("9 Birch Way");
    await page.getByLabel("Postcode").fill("LS6 1AA");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio", { name: /As a whole home/ }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page
      .getByRole("radio", { name: /Yes, I pay rent to an owner/ })
      .check();
    await page.getByLabel("Owner's name").fill("Olive Owner");
    await page
      .getByLabel("Rent you pay the owner each month, in pounds")
      .fill("400");
    await page.getByLabel("Day of the month it is due").selectOption("1");
    await page.getByRole("button", { name: "Save home" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "9 Birch Way" }),
    ).toBeVisible();

    // A tenant who moves in today, paying £550.
    await page.getByRole("link", { name: /Add a tenant/ }).click();
    await page.getByLabel("Tenant's name").fill("Amira Khan");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Rent each month, in pounds").fill("550");
    await page.getByLabel("Day of the month rent is due").selectOption("1");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Save tenant" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Amira Khan" }),
    ).toBeVisible();

    // The rent page has this month's rent, due (not late).
    await page.goto("/rent");
    // Scoped to the rent list, so toasts (also list items) never match.
    const row = page
      .getByRole("list", { name: /^Rent for / })
      .getByRole("listitem")
      .filter({ hasText: "Amira Khan" });
    await expect(row).toContainText("9 Birch Way");
    await expect(row).toContainText("Due");
    await expect(row).toContainText("£550 due");
    await expect(page.getByText("1 due", { exact: true })).toBeVisible();

    // Other amount: an empty form says what to do, then £200 is recorded.
    await row.getByRole("button", { name: "Other amount: Amira Khan" }).click();
    await row.getByRole("button", { name: "Save payment" }).click();
    await expect(row.getByText("Enter the amount they paid")).toBeVisible();
    await row.getByLabel("Amount paid, in pounds").fill("200");
    await row.getByRole("button", { name: "Save payment" }).click();
    await expect(row).toContainText("Part paid");
    await expect(row).toContainText("£200 paid, £350 left to pay");

    // More than is left is refused.
    await row.getByRole("button", { name: "Other amount: Amira Khan" }).click();
    await row.getByLabel("Amount paid, in pounds").fill("400");
    await row.getByRole("button", { name: "Save payment" }).click();
    await expect(row.getByText(/more than is left to pay/)).toBeVisible();
    await row.getByRole("button", { name: "Cancel" }).click();

    // One tap pays the rest.
    await row.getByRole("button", { name: "Mark as paid: Amira Khan" }).click();
    await expect(row).toContainText("Paid");
    await expect(
      row.getByRole("button", { name: "Mark as paid: Amira Khan" }),
    ).toHaveCount(0);
    await expect(page.getByText("£350 recorded for Amira Khan")).toBeVisible();

    // Undo from the toast: back to part paid.
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(row).toContainText("£200 paid, £350 left to pay");

    // Pay the rest again, then check the list of payments.
    await row.getByRole("button", { name: "Mark as paid: Amira Khan" }).click();
    await expect(row).toContainText("Paid");
    await row.getByText("Payments (2)").click();
    await expect(
      row.getByRole("button", { name: /^Remove payment of £200/ }),
    ).toBeVisible();

    // The dashboard adds it up: £550 in, £400 to the owner, £150 left.
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
    const figure = (label: string) =>
      page.locator("dl > div").filter({ hasText: label });
    await expect(figure("Rent expected")).toContainText("£550");
    await expect(figure("Rent received")).toContainText("£550");
    await expect(figure("Rent owed to owners")).toContainText("£400");
    await expect(figure("Left after owners")).toContainText("£150");
    await expect(
      page.getByText("Nobody is late with their rent."),
    ).toBeVisible();
    await expect(
      page.getByText("Every room and home has a tenant."),
    ).toBeVisible();

    // Remove the £200 payment: the rent is part paid again, and Undo puts it back.
    await page.goto("/rent");
    await row.getByText("Payments (2)").click();
    await row.getByRole("button", { name: /^Remove payment of £200/ }).click();
    await expect(row).toContainText("£350 paid, £200 left to pay");
    await expect(page.getByText("£200 payment removed")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(row).toContainText("Paid");
    await expect(row.getByText("Payments (2)")).toBeVisible();

    // Last month has no rent for a tenant who moved in today.
    await page
      .getByRole("navigation", { name: "Months" })
      .getByRole("link")
      .first()
      .click();
    await expect(page.getByText(/^No rent for /)).toBeVisible();
    await page.getByRole("link", { name: "Back to this month" }).click();
    await expect(row).toContainText("Amira Khan");
  });
});
