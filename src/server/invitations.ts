import "server-only";

import type { MemberRole } from "@/lib/validation/members";

import { setPreferredOrganisationId } from "./active-organisation";
import { type Ctx, UserFacingError } from "./context";

/**
 * The invited person's side of invitations (roadmap B4): seeing their own
 * open invitations and accepting one. They may not belong to any
 * organisation yet, so there is no organisation to look up here. The
 * database functions work out who is calling from the session and match
 * the invitation to their confirmed email address; accepting also writes
 * audit_log in the same transaction.
 *
 * The migration that adds these may not be applied yet (see
 * docs/PENDING_MIGRATIONS.md); readers quietly show nothing until it is.
 */

export type MyInvitation = {
  id: string;
  organisationName: string;
  role: MemberRole;
  expiresAt: string;
};

function codeOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

/** A missing function: the B4 migration is not applied yet. */
function isNotMigrated(error: unknown): boolean {
  const code = codeOf(error);
  return code === "42883" || code === "PGRST202";
}

/** Open invitations for the signed-in person's email address. */
export async function getMyInvitations(ctx: Ctx): Promise<MyInvitation[]> {
  const { data, error } = await ctx.supabase.rpc("my_invitations");
  if (error) {
    if (!isNotMigrated(error)) {
      console.error("[invitations] read failed", { code: codeOf(error) });
    }
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    organisationName: row.organisation_name,
    role: row.role as MemberRole,
    expiresAt: row.expires_at,
  }));
}

const CLOSED_STATES = [
  "accepted",
  "cancelled",
  "expired",
  "not_for_you",
] as const;

export type InvitationLinkState =
  | { state: "open"; invitation: MyInvitation }
  | { state: (typeof CLOSED_STATES)[number] | "not_found" };

/** What an /invite/<token> link points at, for the signed-in person. */
export async function getInvitationForToken(
  ctx: Ctx,
  token: string,
): Promise<InvitationLinkState> {
  const { data, error } = await ctx.supabase.rpc("invitation_for_token", {
    invite_token: token,
  });
  if (error) {
    if (!isNotMigrated(error)) throw error;
    return { state: "not_found" };
  }
  const row = data?.[0];
  if (!row) return { state: "not_found" };
  if (row.state === "open") {
    return {
      state: "open",
      invitation: {
        id: row.id,
        organisationName: row.organisation_name,
        role: row.role as MemberRole,
        expiresAt: row.expires_at,
      },
    };
  }
  const closed = CLOSED_STATES.find((state) => state === row.state);
  return { state: closed ?? "not_found" };
}

export const INVITATION_UNUSABLE =
  "This invitation cannot be used. It may have expired or been cancelled, or it was sent to a different email address. Ask for a new one.";

/** Accepts an invitation for the signed-in person. */
export async function acceptInvitation(
  ctx: Ctx,
  invitationId: string,
  fullName: string | null,
): Promise<{ organisationId: string }> {
  const { data, error } = await ctx.supabase.rpc("accept_invitation", {
    invitation_id: invitationId,
    ...(fullName ? { full_name: fullName } : {}),
  });
  if (error) {
    const code = codeOf(error);
    if (code === "PD002") throw new UserFacingError(INVITATION_UNUSABLE);
    if (code === "PD003") {
      throw new UserFacingError(
        "You are already a member of this organisation.",
      );
    }
    if (code === "22023") {
      throw new UserFacingError("Please check your name and try again.");
    }
    if (isNotMigrated(error)) {
      throw new UserFacingError(
        "Invitations are not ready yet. Please try again later.",
      );
    }
    throw error;
  }
  if (typeof data !== "string") throw new Error("accept_invitation: no id");
  // The organisation they just joined becomes the active one (roadmap B5).
  // The id comes from the database function, which has just made the
  // membership; getMembership checks it again on every request anyway.
  await setPreferredOrganisationId(data);
  return { organisationId: data };
}
