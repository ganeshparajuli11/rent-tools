import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * First-time setup (PRODUCT_SPEC.md §6.1, roadmap B2): a new account has
 * no organisation, so every app page sends it to /setup. The form explains
 * problems in plain words, then makes the organisation with the person as
 * its owner and goes to Today, greeting them by first name. Checked at
 * phone, tablet and desktop widths, with screenshots for the daily log.
 * Runs against the dev Supabase project in .env.local.
 */
const WIDTHS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("organisation setup", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create a test user.",
  );

  let user: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeEach(async () => {
    user = await createTestUser({ setUp: false });
  });

  test.afterEach(async () => {
    await user?.cleanup();
  });

  test("a new account sets up its organisation and lands on Today", async ({
    page,
  }) => {
    await user.signIn(page);
    await expect(
      page.getByRole("heading", { name: "Set up your organisation" }),
    ).toBeVisible();

    // Every app page sends them here until it is done.
    for (const path of ["/dashboard", "/homes", "/settings"]) {
      await page.goto(path);
      await page.waitForURL("**/setup");
    }

    for (const size of WIDTHS) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto("/setup");
      await expectNoSidewaysScroll(page);
      await page.screenshot({
        path: `test-results/screens/setup-${size.width}.png`,
        fullPage: true,
      });
    }

    // The contact email starts as the sign-in email.
    await expect(page.getByLabel("Contact email")).toHaveValue(user.email);

    // Problems are explained in plain words.
    await page.getByLabel("Contact email").fill("");
    await page.getByRole("button", { name: "Set up my organisation" }).click();
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(
      page.getByText("Enter a name for your organisation"),
    ).toBeVisible();
    await expect(page.getByText("Choose the kind of account")).toBeVisible();
    await expect(page.getByText("Enter your email address")).toBeVisible();

    await page.getByLabel("Your full name").fill("Sam Sample");
    await page.getByLabel("Organisation name").fill("Sample Homes Demo");
    await page.getByRole("radio", { name: /^Landlord/ }).check();
    await page.getByLabel("Contact email").fill("hello@example.com");
    await page.getByRole("button", { name: "Set up my organisation" }).click();

    await page.waitForURL("**/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: /, Sam\.$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add your first property" }),
    ).toBeVisible();

    // The sidebar shows the organisation, its account type and the person.
    await page.setViewportSize({ width: 1440, height: 1000 });
    const sidebar = page.locator("aside");
    await expect(sidebar).toContainText("Sample Homes Demo");
    await expect(sidebar).toContainText("Landlord");
    await expect(sidebar).toContainText("Sam Sample");
    await expect(sidebar).toContainText("Owner");

    // Set up once: the screen now goes straight to Today.
    await page.goto("/setup");
    await page.waitForURL("**/dashboard");
  });
});
