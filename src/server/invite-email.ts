import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The email for an invitation (roadmap B4): Supabase Auth's sign-in email
 * (code and link), sent to the invited address from server code. It makes
 * the account if the person is new. Once they sign in, the set-up screen
 * shows their invitation, because it matches their (now confirmed) email.
 *
 * Supabase's own "invite" email needs the service-role key, which app code
 * never uses (only cron routes and test set-up do). So this uses the
 * publishable key, with a client that keeps no session, so it can never
 * touch the inviter's own sign-in.
 *
 * Returns false when the email could not be sent (for example Supabase's
 * hourly email limit); the inviter still has the link to send themselves.
 * Logs only a short code, never the email address.
 */
export async function sendInvitationEmail(email: string): Promise<boolean> {
  try {
    const env = getPublicEnv();
    const client = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: new URL(
          "/auth/confirm",
          env.NEXT_PUBLIC_APP_URL,
        ).toString(),
      },
    });
    if (error) {
      console.error("[members] invitation email failed", {
        code: error.code,
        status: error.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[members] invitation email failed", { code });
    return false;
  }
}
