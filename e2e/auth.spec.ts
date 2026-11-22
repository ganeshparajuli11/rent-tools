import { expect, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Email and password sign-in (roadmap B1): wrong password, sign in, sign
 * out, reset the password through the emailed link, and sign in with the
 * new one. Also checks the sign-up and reset forms' own errors, and that
 * "Email me a sign-in code" is still there. Runs at phone and desktop
 * widths. Uses throwaway users in the dev Supabase project (.env.local).
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

test.describe("email and password", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create a test user.",
  );

  for (const size of WIDTHS) {
    test(`sign in, sign out and reset the password (${size.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const user = await createTestUser({ password: "first passphrase" });
      try {
        await page.goto("/sign-in");
        await expect(
          page.getByRole("heading", { level: 1, name: "Sign in" }),
        ).toBeVisible();

        // A wrong password: a plain message, no hint about the account.
        await page.getByLabel("Email address").fill(user.email);
        await page.getByLabel("Password").fill("not the password");
        await page.getByRole("button", { name: "Sign in" }).click();
        await expect(
          page.getByText("That email and password did not work."),
        ).toBeVisible();

        // The right one.
        await page.getByLabel("Password").fill("first passphrase");
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL("**/dashboard");

        // Signed in, the sign-in screen sends them to Today.
        await page.goto("/sign-in");
        await page.waitForURL("**/dashboard");

        // Sign out (from the More sheet on phones).
        if (size.width < 1024) {
          await page.getByRole("button", { name: "More" }).click();
        }
        await page.getByRole("button", { name: "Sign out" }).first().click();
        await page.waitForURL("**/sign-in");

        // Forgot the password: the request page answers the same for anyone.
        await page.getByRole("link", { name: "Forgot your password?" }).click();
        await page.getByLabel("Email address").fill("nobody@example.com");
        await page
          .getByRole("button", { name: "Send me a reset link" })
          .click();
        await expect(
          page.getByRole("heading", { name: "Check your email" }),
        ).toBeVisible();

        // The emailed link signs them in for one step: a new password.
        await page.goto(await user.resetLink());
        await page.waitForURL("**/reset-password/new");
        await page.getByLabel("New password").fill("second passphrase");
        await page.getByLabel("Type it again").fill("second passphrase!");
        await page.getByRole("button", { name: "Save new password" }).click();
        await expect(
          page.getByText("The two passwords are not the same"),
        ).toBeVisible();
        await page.getByLabel("Type it again").fill("second passphrase");
        await page.getByRole("button", { name: "Save new password" }).click();
        await page.waitForURL("**/dashboard");
      } finally {
        await user.cleanup();
      }
    });
  }

  test("sign-up and reset forms explain problems in plain words", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email address").fill("taylor@example");
    await page.getByLabel("Choose a password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Enter a valid email address, like name@example.com"),
    ).toBeVisible();

    await page.getByLabel("Email address").fill("taylor@example.com");
    await page.getByLabel("Choose a password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();

    // Without a reset session, the new-password page sends people back.
    await page.goto("/reset-password/new");
    await page.waitForURL("**/reset-password?error=link");
    await expect(page.getByRole("alert")).toContainText("expired");

    // The email code is still a way in.
    await page.goto("/sign-in");
    await page
      .getByRole("link", { name: "Email me a sign-in code instead" })
      .click();
    await expect(
      page.getByRole("button", { name: "Send me a code" }),
    ).toBeVisible();
  });
});
