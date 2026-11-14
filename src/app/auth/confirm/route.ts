import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign-in link from the email:
 *   /auth/confirm?token_hash=...&type=email
 * Works even if the link opens in a different browser from the one that asked
 * for it (token_hash flow, no PKCE code verifier needed).
 * Always redirects to fixed paths, so it can't be used as an open redirect.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (tokenHash && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: tokenHash,
    });
    if (!error) {
      redirect("/dashboard");
    }
    console.error("[auth] link verifyOtp failed", {
      code: error.code,
      status: error.status,
    });
  }

  redirect("/sign-in?error=link");
}
