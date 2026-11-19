import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "PropDesk home" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: /Every property/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("sign-in page asks for an email", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Your email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send me a code" }),
  ).toBeVisible();
});
