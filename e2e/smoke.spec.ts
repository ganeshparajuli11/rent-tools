import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("RentDesk")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});
