"use server";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  newPasswordSchema,
  passwordResetRequestSchema,
  passwordSignInSchema,
  signInSchema,
  signUpSchema,
  verifyCodeSchema,
} from "@/lib/validation/auth";
import {
  clearPendingSignInEmail,
  getPendingSignInEmail,
  setPendingSignInEmail,
} from "@/server/pending-sign-in";
import { getClientIp } from "@/server/request";

export type AuthFormState = {
  error?: string;
  /** Which box the error belongs under. The email box when not set. */
  field?: "email" | "password" | "confirm";
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
  wrongPassword:
    "That email and password did not work. Check them, or reset your password.",
  notConfirmed:
    "Please confirm your email address first. Use the link in the email we sent when you signed up.",
  cannotSignUp:
    "We could not create that account. If you already have one, sign in instead.",
  weakPassword:
    "That password is too easy to guess. Please choose a longer one.",
  samePassword: "Choose a password you have not used here before.",
  linkExpired:
    "Your reset link has expired. Please ask for a new one and try again.",
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

/**
 * Two limits for each sign-in step: by IP address and by account (the
 * email, or the user id once signed in), 10 and 5 tries per 15 minutes.
 */
async function isRateLimited(action: string, account: string) {
  const ip = await getClientIp();
  const [byIp, byAccount] = await Promise.all([
    rateLimit(`${action}:ip`, ip, 10, "15 m"),
    rateLimit(`${action}:email`, account, 5, "15 m"),
  ]);
  return !byIp.success || !byAccount.success;
}

/** The short error code Supabase Auth gives, if any. */
function authCode(error: unknown): string | undefined {
  const code =
    error && typeof error === "object"
      ? (error as { code?: unknown }).code
      : undefined;
  return typeof code === "string" ? code : undefined;
}

/** Where links in auth emails land: the fixed confirm route on this site. */
function confirmUrl(next?: "reset"): string {
  const url = new URL("/auth/confirm", getPublicEnv().NEXT_PUBLIC_APP_URL);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

/** The first problem in a parsed form, under the box it belongs to. */
function firstIssue(
  issues: readonly { message: string; path: readonly PropertyKey[] }[],
): Pick<AuthFormState, "error" | "field"> {
  const issue = issues[0];
  const key = issue?.path[0];
  const field =
    key === "password" || key === "confirm" || key === "email"
      ? key
      : undefined;
  return { error: issue?.message ?? MESSAGES.somethingWrong, field };
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

/** Sign in with an email and password. */
export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get("email");
  const echoEmail = typeof rawEmail === "string" ? rawEmail : "";
  const parsed = passwordSignInSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ...firstIssue(parsed.error.issues), email: echoEmail };
  }

  const { email, password } = parsed.data;
  try {
    if (await isRateLimited("password-sign-in", email)) {
      return { error: MESSAGES.tooManyTries, email };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logAuthError("signInWithPassword", error);
      if (authCode(error) === "email_not_confirmed") {
        return { error: MESSAGES.notConfirmed, email };
      }
      return { error: MESSAGES.wrongPassword, field: "password", email };
    }
  } catch (error) {
    logAuthError("signInWithPassword", error);
    return { error: MESSAGES.somethingWrong, email };
  }

  redirect("/dashboard");
}

/**
 * Create an account with an email and password. When the Supabase project
 * asks people to confirm their email (the default), there is no session
 * yet: the person is sent to "check your email". Supabase gives the same
 * answer for an email that already has an account, so nobody can find out
 * who has one.
 */
export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get("email");
  const echoEmail = typeof rawEmail === "string" ? rawEmail : "";
  const parsed = signUpSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ...firstIssue(parsed.error.issues), email: echoEmail };
  }

  const { email, password } = parsed.data;
  let signedIn = false;
  try {
    if (await isRateLimited("sign-up", email)) {
      return { error: MESSAGES.tooManyTries, email };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmUrl() },
    });
    if (error) {
      logAuthError("signUp", error);
      const code = authCode(error);
      if (code === "weak_password") {
        return { error: MESSAGES.weakPassword, field: "password", email };
      }
      if (error.status === 429) {
        return { error: MESSAGES.waitBeforeResend, email };
      }
      return { error: MESSAGES.cannotSignUp, email };
    }
    signedIn = Boolean(data.session);
  } catch (error) {
    logAuthError("signUpWithPassword", error);
    return { error: MESSAGES.somethingWrong, email };
  }

  redirect(signedIn ? "/dashboard" : "/sign-up/check-email");
}

/**
 * "Forgot your password?": emails a reset link. Always goes on to the same
 * "check your email" screen, whether or not the email has an account.
 */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get("email");
  const parsed = passwordResetRequestSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return {
      ...firstIssue(parsed.error.issues),
      email: typeof rawEmail === "string" ? rawEmail : "",
    };
  }

  const { email } = parsed.data;
  try {
    if (await isRateLimited("password-reset", email)) {
      return { error: MESSAGES.tooManyTries, email };
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: confirmUrl("reset"),
    });
    if (error) {
      logAuthError("resetPasswordForEmail", error);
      if (error.status === 429) {
        return { error: MESSAGES.waitBeforeResend, email };
      }
      // Anything else: carry on, so the answer never shows who has an account.
    }
  } catch (error) {
    logAuthError("requestPasswordReset", error);
    return { error: MESSAGES.somethingWrong, email };
  }

  redirect("/reset-password/sent");
}

/**
 * Choose a new password. Only works with the session the reset link (or a
 * normal sign-in) created, so it needs no old password.
 */
export async function setNewPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/reset-password?error=link");

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return firstIssue(parsed.error.issues);

  try {
    if (await isRateLimited("new-password", userId)) {
      return { error: MESSAGES.tooManyTries, field: "password" };
    }
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) {
      logAuthError("updateUser", error);
      const code = authCode(error);
      if (code === "weak_password") {
        return { error: MESSAGES.weakPassword, field: "password" };
      }
      if (code === "same_password") {
        return { error: MESSAGES.samePassword, field: "password" };
      }
      if (code === "reauthentication_needed" || error.status === 401) {
        return { error: MESSAGES.linkExpired, field: "password" };
      }
      return { error: MESSAGES.somethingWrong, field: "password" };
    }
  } catch (error) {
    logAuthError("setNewPassword", error);
    return { error: MESSAGES.somethingWrong, field: "password" };
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
