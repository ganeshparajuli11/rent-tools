import "server-only";

import type { z } from "zod";

import { type ActionResult, GENERIC_ERROR } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { getCurrentUser } from "./auth";
import { type Ctx, UserFacingError } from "./context";

/**
 * The shared wrapper for server actions that change data. It:
 *  1. checks the session,
 *  2. applies the rate limiter (per user, per area of the app),
 *  3. runs the data function with the user's own client, so RLS applies.
 * The data function derives the organisation on the server and writes
 * audit_log. Input must be validated with a Zod schema before calling this.
 *
 * Only messages from UserFacingError reach the browser. Anything else is
 * logged with its error code and replaced by a plain, generic message.
 */

const TOO_MANY =
  "You have made a lot of changes quickly. Please wait a minute and try again.";

export async function runAction<T>(
  /** Area of the app, used for the rate limit and the log line. */
  scope:
    | "homes"
    | "tenants"
    | "rent"
    | "settings"
    | "members"
    | "search"
    | "setup",
  name: string,
  fn: (ctx: Ctx) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: "You have been signed out. Please sign in again.",
    };
  }

  try {
    // Search runs as people type, so it has its own, larger allowance.
    const limit =
      scope === "search"
        ? await rateLimit("search-read", user.id, 120, "60 s")
        : await rateLimit(`${scope}-write`, user.id, 60, "60 s");
    if (!limit.success) return { ok: false, error: TOO_MANY };

    const supabase = await createClient();
    const data = await fn({ supabase, userId: user.id });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error(`[${scope}] ${name} failed`, { code });
    return { ok: false, error: GENERIC_ERROR };
  }
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** The result for input that failed its Zod schema: one message per field. */
export function invalidInput(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Please check the answers marked below.",
    fieldErrors: fieldErrorsOf(error),
  };
}
