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
 * A throwaway, confirmed user. Pass `password` to give it one, for the
 * email and password sign-in tests.
 */
export async function createTestUser({ password }: { password?: string } = {}) {
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
    await page.waitForURL("**/dashboard");
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

  return { email, signIn, resetLink, cleanup };
}
