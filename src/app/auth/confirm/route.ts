import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/server/request";

/**
 * Where links in auth emails land. Two forms:
 *   /auth/confirm?token_hash=...&type=email|signup|recovery
 *     (the email templates in docs: works even when the link opens in a
 *     different browser, no PKCE code verifier needed), and
 *   /auth/confirm?code=...[&next=reset]
 *     (Supabase's default templates, PKCE: same browser only).
 * A sign-in, sign-up or email-code link goes to Today; a password reset
 * link goes to "Choose a new password". Always redirects to fixed paths,
 * so it can't be used as an open redirect. Rate limited per IP address.
 */
const TOKEN_TYPES: readonly EmailOtpType[] = ["email", "signup", "recovery"];

function isTokenType(value: string | null): value is EmailOtpType {
  return value !== null && (TOKEN_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  const isReset = type === "recovery" || params.get("next") === "reset";
  const failed = isReset ? "/reset-password?error=link" : "/sign-in?error=link";

  if ((tokenHash && isTokenType(type)) || code) {
    const limit = await rateLimit(
      "auth-confirm:ip",
      await getClientIp(),
      20,
      "15 m",
    );
    if (!limit.success) redirect(failed);

    const supabase = await createClient();
    const { error } =
      tokenHash && isTokenType(type)
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : await supabase.auth.exchangeCodeForSession(code ?? "");
    if (!error) {
      redirect(isReset ? "/reset-password/new" : "/dashboard");
    }
    console.error("[auth] link check failed", {
      code: error.code,
      status: error.status,
    });
  }

  redirect(failed);
}
