"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import {
  changeMemberRoleSchema,
  invitationIdSchema,
  inviteMemberSchema,
  removeMemberSchema,
  transferOwnershipSchema,
} from "@/lib/validation/members";
import * as members from "@/server/members";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * Server actions for Settings › Members. Each one:
 *  1. validates input with a shared Zod schema (an organisation id sent
 *     from the browser is dropped),
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with
 *     the person's own client (RLS applies). The data function works out
 *     the organisation on the server, checks the person's role and writes
 *     audit_log.
 */

const PATH = "/settings/members";

/** Invite someone by email. Returns the link to copy. */
export async function inviteMemberAction(
  input: unknown,
): Promise<
  ActionResult<{ invitationId: string; link: string; emailSent: boolean }>
> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "inviteMember", (ctx) =>
    members.inviteMember(ctx, parsed.data),
  );
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Cancel an invitation (the toast has Undo). */
export async function cancelInvitationAction(
  input: unknown,
): Promise<ActionResult<{ invitationId: string }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "cancelInvitation", (ctx) =>
    members.cancelInvitation(ctx, parsed.data.invitationId),
  );
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Undo for cancelling an invitation. */
export async function restoreInvitationAction(
  input: unknown,
): Promise<ActionResult<{ invitationId: string }>> {
  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "restoreInvitation", (ctx) =>
    members.restoreInvitation(ctx, parsed.data.invitationId),
  );
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Change a member's role. Also the Undo for the last change. */
export async function changeMemberRoleAction(
  input: unknown,
): Promise<
  ActionResult<{ membershipId: string; role: string; previousRole: string }>
> {
  const parsed = changeMemberRoleSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "changeMemberRole", (ctx) =>
    members.changeMemberRole(ctx, parsed.data.membershipId, parsed.data.role),
  );
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Remove someone from the organisation (confirmed on the page first). */
export async function removeMemberAction(
  input: unknown,
): Promise<ActionResult<{ membershipId: string }>> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "removeMember", (ctx) =>
    members.removeMember(ctx, parsed.data.membershipId),
  );
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Make another member the owner (the owner types the organisation's name). */
export async function transferOwnershipAction(
  input: unknown,
): Promise<ActionResult<{ membershipId: string }>> {
  const parsed = transferOwnershipSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("members", "transferOwnership", (ctx) =>
    members.transferOwnership(
      ctx,
      parsed.data.membershipId,
      parsed.data.confirmName,
    ),
  );
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
