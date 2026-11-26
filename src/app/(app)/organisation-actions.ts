"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { switchOrganisationSchema } from "@/lib/validation/organisation";
import * as organisation from "@/server/organisation";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * The organisation switcher in the sidebar and the phone More sheet
 * (roadmap B5). It:
 *  1. validates the organisation id with the shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and uses the person's own client,
 *  3. calls organisation.switchOrganisation, which checks the person is an
 *     active member of that organisation, remembers it in an httpOnly
 *     cookie and writes audit_log.
 * Every page then works in that organisation: `getMembership` re-checks
 * the cookie against the person's memberships on every request.
 */
export async function switchOrganisationAction(
  input: unknown,
): Promise<ActionResult<{ organisationId: string }>> {
  const parsed = switchOrganisationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("switch", "switchOrganisation", (ctx) =>
    organisation.switchOrganisation(ctx, parsed.data.organisationId),
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
