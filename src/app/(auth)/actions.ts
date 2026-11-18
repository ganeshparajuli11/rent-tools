"use server";

import { redirect } from "next/navigation";

import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  passwordSignInSchema,
  signInSchema,
  verifyCodeSchema,
} from "@/lib/validation/auth";
import {
  clearPendingSignInEmail,
  getPendingSignInEmail,
  setPendingSignInEmail,
} from "@/server/pending-sign-in";
import { getClientIp } from "@/server/request";
import { isTestLoginEnabled, testLoginEmail } from "@/server/test-login";

export type AuthFormState = {
  error?: string;
  notice?: string;
  /** Echoed back so the input keeps what the person typed after an error. */
  email?: string;
};

const MESSAGES = {
  tooManyTries: "Too many tries. Please wait 15 minutes, then try again.",
  waitBeforeResend:
    "We have just sent you an email. Please wait a minute before asking for another.",
  sendFailed: "Sorry, we could not send the email just now. Please try again.",
  wrongCode:
    "That code did not work. Check the numbers, or ask for a new code.",
  somethingWrong: "Sorry, something went wrong. Please try again.",
  newCodeSent: "We have sent you a new code.",
} as const;

/** Logs only a short code, never the email address or other details. */
function logAuthError(where: string, error: unknown) {
  const info =
    error && typeof error === "object"
      ? {
          code: (error as { code?: unknown }).code,
          status: (error as { status?: unknown }).status,
        }
      : {};
  console.error(`[auth] ${where} failed`, info);
}

async function isRateLimited(action: string, email: string) {
  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`${action}:ip`, ip, 10, "15 m"),
    rateLimit(`${action}:email`, email, 5, "15 m"),
  ]);
  return !byIp.success || !byEmail.success;
}

/** Sends a sign-in code (and link). Creates the account if it is new. */
async function sendCode(email: string): Promise<AuthFormState | null> {
  try {
    if (await isRateLimited("send-code", email)) {
      return { error: MESSAGES.tooManyTries, email };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      logAuthError("signInWithOtp", error);
      return {
        error:
          error.status === 429
            ? MESSAGES.waitBeforeResend
            : MESSAGES.sendFailed,
        email,
      };
    }
    return null;
  } catch (error) {
    logAuthError("sendCode", error);
    return { error: MESSAGES.somethingWrong, email };
  }
}

/** Step 1: "Enter your email". */
export async function requestSignInCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = formData.get("email");
  const parsed = signInSchema.safeParse({ email: raw });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MESSAGES.somethingWrong,
      email: typeof raw === "string" ? raw : "",
    };
  }

  const { email } = parsed.data;
  const failed = await sendCode(email);
  if (failed) return failed;

  await setPendingSignInEmail(email);
  redirect("/sign-in/check-email");
}

/** Step 2: "Enter the code". */
export async function verifySignInCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = await getPendingSignInEmail();
  if (!email) redirect("/sign-in");

  const parsed = verifyCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? MESSAGES.wrongCode };
  }

  try {
    if (await isRateLimited("verify-code", email)) {
      return { error: MESSAGES.tooManyTries };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data.code,
      type: "email",
    });
    if (error) {
      logAuthError("verifyOtp", error);
      return { error: MESSAGES.wrongCode };
    }
  } catch (error) {
    logAuthError("verifySignInCode", error);
    return { error: MESSAGES.somethingWrong };
  }

  await clearPendingSignInEmail();
  redirect("/dashboard");
}

/** "Send a new code" on the check-email screen. */
export async function resendSignInCode(): Promise<AuthFormState> {
  const email = await getPendingSignInEmail();
  if (!email) redirect("/sign-in");

  const failed = await sendCode(email);
  if (failed) return { error: failed.error };
  return { notice: MESSAGES.newCodeSent };
}

/**
 * Test-only password sign-in for the demo account. Refused unless
 * ENABLE_TEST_LOGIN=true, and only for the demo email (src/server/test-login.ts).
 */
export async function signInWithTestPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isTestLoginEnabled()) {
    return { error: "Password sign-in is switched off." };
  }

  const rawEmail = formData.get("email");
  const parsed = passwordSignInSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  const echoEmail = typeof rawEmail === "string" ? rawEmail : "";
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? MESSAGES.somethingWrong,
      email: echoEmail,
    };
  }

  const { email, password } = parsed.data;
  const wrong = "That email and password did not work.";
  if (email !== testLoginEmail()) return { error: wrong, email };

  try {
    if (await isRateLimited("test-password", email)) {
      return { error: MESSAGES.tooManyTries, email };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logAuthError("signInWithPassword", error);
      return { error: wrong, email };
    }
  } catch (error) {
    logAuthError("signInWithTestPassword", error);
    return { error: MESSAGES.somethingWrong, email };
  }

  redirect("/dashboard");
}

/** Sign out of this device and go back to the sign-in screen. */
export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) logAuthError("signOut", error);
  } catch (error) {
    logAuthError("signOut", error);
  }
  redirect("/sign-in");
}
