import { expect, type Page, test } from "@playwright/test";

import { createTestUser, hasAdminEnv } from "./helpers/auth";

/**
 * Settings › Members and invitations (roadmap B4): an owner invites
 * someone, the invited person signs in and joins from the set-up screen,
 * then the owner changes their role (with Undo) and removes them (with a
 * confirm step). Checked at phone, tablet and desktop widths, with
 * screenshots for the daily log. Runs against the dev Supabase project in
 * .env.local. The invitation email may or may not go out (Supabase's
 * hourly limit); the page works either way.
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

test.describe("members: invite, join, change role, remove", () => {
  test.skip(
    !hasAdminEnv(),
    "Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to create test users.",
  );

  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let invitee: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeEach(async () => {
    owner = await createTestUser();
    invitee = await createTestUser({ setUp: false });
  });

  test.afterEach(async () => {
    // The owner's organisation goes first (it now holds the invitee too).
    await owner?.cleanup();
    await invitee?.cleanup();
  });

  for (const size of WIDTHS) {
    test(`at ${size.name} width`, async ({ browser }) => {
      const ownerPage = await browser.newPage({
        viewport: { width: size.width, height: size.height },
      });
      await owner.signIn(ownerPage);

      await ownerPage.goto("/settings");
      await ownerPage.getByRole("link", { name: /Members/ }).click();
      await expect(
        ownerPage.getByRole("heading", { name: /^Members/, level: 1 }),
      ).toBeVisible();
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(1);

      // Invite them as staff.
      await ownerPage.getByLabel("Their email address").fill(invitee.email);
      await ownerPage.getByLabel(/^Staff/).check();
      await ownerPage.getByRole("button", { name: "Send invitation" }).click();
      const link = ownerPage.getByLabel(/Invitation link/);
      await expect(link).toHaveValue(/\/invite\/[A-Za-z0-9_-]{43}$/);
      await expect(ownerPage.getByTestId("invitation-row")).toHaveCount(1);
      await expectNoSidewaysScroll(ownerPage);
      await ownerPage.screenshot({
        path: `test-results/screens/members-invite-${size.name}.png`,
        fullPage: true,
      });

      // The invited person signs in and sees the invitation on set-up.
      const inviteePage = await browser.newPage({
        viewport: { width: size.width, height: size.height },
      });
      await invitee.signIn(inviteePage);
      await expect(
        inviteePage.getByRole("heading", { name: "You have been invited" }),
      ).toBeVisible();
      await expectNoSidewaysScroll(inviteePage);
      await inviteePage.screenshot({
        path: `test-results/screens/members-join-${size.name}.png`,
        fullPage: true,
      });
      // The link works for them too.
      await inviteePage.goto(await link.inputValue());
      await inviteePage.getByLabel("Your full name").fill("Jordan Example");
      await inviteePage
        .getByRole("button", { name: /^Join E2E Demo Lettings/ })
        .click();
      await inviteePage.waitForURL("**/dashboard");

      // Back to the owner: they are in the list, waiting list is empty.
      await ownerPage.reload();
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(2);
      await expect(ownerPage.getByTestId("invitation-row")).toHaveCount(0);

      // Change their role; Undo puts it back.
      const role = ownerPage.getByLabel("Role for Jordan Example");
      await role.selectOption("manager");
      await expect(
        ownerPage.getByText("Jordan Example is now a manager"),
      ).toBeVisible();
      await ownerPage.getByRole("button", { name: "Undo" }).click();
      await expect(role).toHaveValue("staff");

      // Remove them, with the confirm step.
      await ownerPage
        .getByRole("button", { name: "Remove Jordan Example" })
        .click();
      await ownerPage
        .getByRole("button", { name: "Yes, remove Jordan Example" })
        .click();
      await expect(ownerPage.getByTestId("member-row")).toHaveCount(1);
      await expectNoSidewaysScroll(ownerPage);
      await ownerPage.screenshot({
        path: `test-results/screens/members-after-${size.name}.png`,
        fullPage: true,
      });

      // Removed: they have no organisation, so they are sent to set-up.
      await inviteePage.goto("/dashboard");
      await inviteePage.waitForURL("**/setup");

      await inviteePage.close();
      await ownerPage.close();
    });
  }
});
