"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { acceptInvitationSchema } from "@/lib/validation/members";
import { organisationSetupSchema } from "@/lib/validation/organisation";
import * as invitations from "@/server/invitations";
import * as organisation from "@/server/organisation";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * The /setup screen's one action: set up the person's organisation.
 *
 *  1. validates input with the shared Zod schema (any organisation or user
 *     id sent with it is dropped),
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and uses the person's own client,
 *  3. calls the database function `create_organisation`, which works out
 *     who is calling from the session, refuses a second organisation, makes
 *     them the owner and writes audit_log in one transaction.
 */
export async function setUpOrganisationAction(
  input: unknown,
): Promise<ActionResult<{ organisationId: string }>> {
  const parsed = organisationSetupSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("setup", "setUpOrganisation", (ctx) =>
    organisation.setUpOrganisation(ctx, parsed.data),
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Join an organisation by accepting an invitation (roadmap B4), from the
 * set-up screen or an /invite/<token> link. Same steps as above; the
 * database function `accept_invitation` checks the invitation was sent to
 * the signed-in person's confirmed email address, is still open, adds the
 * membership and writes audit_log in one transaction.
 */
export async function acceptInvitationAction(
  input: unknown,
): Promise<ActionResult<{ organisationId: string }>> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("setup", "acceptInvitation", (ctx) =>
    invitations.acceptInvitation(
      ctx,
      parsed.data.invitationId,
      parsed.data.fullName,
    ),
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
