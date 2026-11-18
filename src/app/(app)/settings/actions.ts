"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { overdueEmailSettingSchema } from "@/lib/validation/settings";
import { invalidInput, runAction } from "@/server/run-action";
import * as settings from "@/server/settings";

/**
 * Server actions for the Settings page. Each one:
 *  1. validates input with a shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with the
 *     user's own client (RLS applies). The data function derives the
 *     organisation on the server, checks the user is an owner and writes
 *     audit_log.
 */

/** The daily late rent email: on or off. Also the Undo for the last change. */
export async function setOverdueEmailAction(
  input: unknown,
): Promise<ActionResult<{ enabled: boolean }>> {
  const parsed = overdueEmailSettingSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("settings", "setOverdueEmail", (ctx) =>
    settings.setOverdueEmailEnabled(ctx, parsed.data.enabled),
  );
  if (result.ok) revalidatePath("/settings");
  return result;
}
