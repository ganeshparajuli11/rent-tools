import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Test-only sign-in for end-to-end tests against the DEV Supabase project.
 * Uses the service role key (from .env.local) to create a throwaway user and
 * a sign-in link, then opens that link like a person tapping it in the
 * email. No email is sent. Always call `cleanup()` afterwards.
 */
export function hasAdminEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Sets up a demo organisation for the user, the way the /setup screen
 * does: signed in as them (publishable key, so RLS and the database
 * function's own checks apply), never with the service role.
 */
async function setUpOrganisation(email: string, hashedToken: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const signedIn = await client.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });
  if (signedIn.error) {
    throw new Error(`sign in for set-up failed: ${signedIn.error.message}`);
  }
  const { error } = await client.rpc("create_organisation", {
    org_name: "E2E Demo Lettings",
    org_account_type: "property_manager",
    org_contact_email: email,
    creator_full_name: "Taylor Example",
  });
  if (error) throw new Error(`set up organisation failed: ${error.message}`);
  await client.auth.signOut({ scope: "local" });
}

/**
 * A throwaway, confirmed user. Pass `password` to give it one, for the
 * email and password sign-in tests. The user gets a demo organisation
 * ("E2E Demo Lettings", owner "Taylor Example") unless `setUp` is false,
 * in which case they land on the set-up screen.
 */
export async function createTestUser({
  password,
  setUp = true,
}: { password?: string; setUp?: boolean } = {}) {
  const client = admin();
  const email = `e2e-${randomUUID().slice(0, 8)}@example.com`;

  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    ...(password ? { password } : {}),
  });
  if (error || !data.user)
    throw new Error(`create user failed: ${error?.message}`);
  const userId = data.user.id;

  if (setUp) {
    const link = await client.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error || !link.data.properties) {
      throw new Error(`generate link failed: ${link.error?.message}`);
    }
    await setUpOrganisation(email, link.data.properties.hashed_token);
  }

  async function signIn(page: Page) {
    const link = await client.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (link.error || !link.data.properties) {
      throw new Error(`generate link failed: ${link.error?.message}`);
    }
    await page.goto(
      `/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=email`,
    );
    // Without an organisation, the app sends them to set one up.
    await page.waitForURL(setUp ? "**/dashboard" : "**/setup");
  }

  /** A password reset link, as if the person had asked for one. */
  async function resetLink() {
    const link = await client.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (link.error || !link.data.properties) {
      throw new Error(`generate link failed: ${link.error?.message}`);
    }
    return `/auth/confirm?token_hash=${link.data.properties.hashed_token}&type=recovery`;
  }

  async function cleanup() {
    const { data: memberships } = await client
      .from("memberships")
      .select("organisation_id")
      .eq("user_id", userId);
    const orgIds = (memberships ?? []).map((m) => m.organisation_id as string);
    if (orgIds.length) {
      await client.from("organisations").delete().in("id", orgIds);
    }
    await client.auth.admin.deleteUser(userId);
  }

  return { email, userId, signIn, resetLink, cleanup };
}
