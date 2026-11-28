import "server-only";

import { getPublicEnv } from "@/lib/env";
import {
  hashInvitationToken,
  invitationLink,
  newInvitationToken,
} from "@/lib/invitations";
import { rateLimit } from "@/lib/rate-limit";
import { isRole, type Role } from "@/lib/roles";
import type { InviteMemberValues, MemberRole } from "@/lib/validation/members";

import {
  type Ctx,
  NOT_FOUND,
  requireRole,
  UserFacingError,
  writeAudit,
} from "./context";
import { sendInvitationEmail } from "./invite-email";

/**
 * Settings › Members (roadmap B4, PRODUCT_SPEC.md §5).
 *
 *  - Owners and admins invite people, change roles, remove members and
 *    cancel invitations. Admins never change or remove an owner, and
 *    nobody is made an owner here: ownership only moves through
 *    transferOwnership, which the owner confirms by typing the
 *    organisation's name.
 *  - Managers can see who is in the organisation; staff cannot (the page
 *    says so). Row-level security enforces the same in the database.
 *
 * Every function derives the organisation from the person's active
 * membership on the server (requireRole), and writes audit_log without
 * names or email addresses.
 */

export const MEMBERS_PAGE_SIZE = 25;

export type MemberListItem = {
  membershipId: string;
  userId: string;
  /** Null when the person has not given their name yet. */
  name: string | null;
  role: Role | null;
  joinedAt: string;
};

export type MemberList = {
  members: MemberListItem[];
  total: number;
  page: number;
  pageCount: number;
};

/** Active members of the person's organisation, one page at a time. */
export async function listMembers(
  ctx: Ctx,
  { page }: { page: number },
): Promise<MemberList> {
  const { organisationId } = await requireRole(ctx, "manager");
  const from = (page - 1) * MEMBERS_PAGE_SIZE;

  const { data, count, error } = await ctx.supabase
    .from("memberships")
    .select("id, user_id, role, created_at", { count: "exact" })
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + MEMBERS_PAGE_SIZE - 1);
  if (error) throw error;

  // Everyone's name in one more query (never one per person).
  const userIds = data.map((row) => row.user_id);
  const names = new Map<string, string | null>();
  if (userIds.length) {
    const profiles = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profiles.error) {
      // Names only decorate the list; show it without them.
      console.error("[members] profile read failed", {
        code: profiles.error.code,
      });
    }
    for (const profile of profiles.data ?? []) {
      names.set(profile.id, profile.full_name);
    }
  }

  const members = data.map((row) => ({
    membershipId: row.id,
    userId: row.user_id,
    name: names.get(row.user_id) ?? null,
    role: isRole(row.role) ? row.role : null,
    joinedAt: row.created_at,
  }));
  const total = count ?? members.length;
  return {
    members,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE)),
  };
}

export type InvitationListItem = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  sentAt: string;
};

/** Invitations nobody has accepted or cancelled yet (expired included). */
export async function listOpenInvitations(
  ctx: Ctx,
): Promise<InvitationListItem[]> {
  const { organisationId } = await requireRole(ctx, "admin");
  const { data, error } = await ctx.supabase
    .from("invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("organisation_id", organisationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as MemberRole,
    expiresAt: row.expires_at,
    sentAt: row.created_at,
  }));
}

const TOO_MANY_INVITATIONS =
  "You have sent a lot of invitations. Please wait an hour and try again.";

/**
 * Invites someone by email with a role. Cancels any earlier open
 * invitation for the same address first, so only the newest link works.
 * Returns the link (shown once, to copy) and whether the email went.
 */
export async function inviteMember(
  ctx: Ctx,
  values: InviteMemberValues,
): Promise<{ invitationId: string; link: string; emailSent: boolean }> {
  const { organisationId } = await requireRole(ctx, "admin");

  // Each invitation sends an email: a much smaller allowance than edits.
  const limit = await rateLimit("invite-email", ctx.userId, 20, "1 h");
  if (!limit.success) throw new UserFacingError(TOO_MANY_INVITATIONS);

  const earlier = await ctx.supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organisation_id", organisationId)
    .eq("email", values.email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (earlier.error) throw earlier.error;

  const token = newInvitationToken();
  const { data, error } = await ctx.supabase
    .from("invitations")
    .insert({
      organisation_id: organisationId,
      email: values.email,
      role: values.role,
      token_hash: await hashInvitationToken(token),
    })
    .select("id")
    .single();
  if (error) throw error;

  // The email address never goes in the audit log.
  await writeAudit(ctx, {
    organisationId,
    action: "invitation.created",
    table: "invitations",
    recordId: data.id,
    changes: { role: values.role, replaced: earlier.data.length },
  });

  const emailSent = await sendInvitationEmail(values.email);
  return {
    invitationId: data.id,
    link: invitationLink(getPublicEnv().NEXT_PUBLIC_APP_URL, token),
    emailSent,
  };
}

function codeOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

/** Cancels an invitation, so its link stops working. Undo: restore. */
export async function cancelInvitation(
  ctx: Ctx,
  invitationId: string,
): Promise<{ invitationId: string }> {
  const { organisationId } = await requireRole(ctx, "admin");
  const { data, error } = await ctx.supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("organisation_id", organisationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "invitation.cancelled",
    table: "invitations",
    recordId: invitationId,
  });
  return { invitationId };
}

/** The Undo for cancelInvitation. */
export async function restoreInvitation(
  ctx: Ctx,
  invitationId: string,
): Promise<{ invitationId: string }> {
  const { organisationId } = await requireRole(ctx, "admin");
  const { data, error } = await ctx.supabase
    .from("invitations")
    .update({ revoked_at: null })
    .eq("id", invitationId)
    .eq("organisation_id", organisationId)
    .is("accepted_at", null)
    .not("revoked_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) {
    // A newer invitation for the same address is open.
    if (codeOf(error) === "23505") {
      throw new UserFacingError(
        "There is a newer invitation for this email address.",
      );
    }
    throw error;
  }
  if (!data) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "invitation.restored",
    table: "invitations",
    recordId: invitationId,
  });
  return { invitationId };
}

const OWNER_ONLY_BY_TRANSFER =
  "The owner can only change by transferring ownership.";
const NOT_YOURSELF = "You cannot change your own role or remove yourself.";

/**
 * The active member to change, in the person's own organisation. Checks
 * the rules both owners and admins follow here: not yourself, and never
 * an owner (that is what transferring ownership is for).
 */
async function changeableMember(
  ctx: Ctx,
  organisationId: string,
  membershipId: string,
) {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("id, user_id, role")
    .eq("id", membershipId)
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);
  if (data.user_id === ctx.userId) throw new UserFacingError(NOT_YOURSELF);
  if (data.role === "owner") {
    throw new UserFacingError(OWNER_ONLY_BY_TRANSFER);
  }
  return data;
}

/** Changes a member's role (admin, manager or staff). Undo: change back. */
export async function changeMemberRole(
  ctx: Ctx,
  membershipId: string,
  role: MemberRole,
): Promise<{ membershipId: string; role: MemberRole; previousRole: string }> {
  const { organisationId } = await requireRole(ctx, "admin");
  const member = await changeableMember(ctx, organisationId, membershipId);

  const { data, error } = await ctx.supabase
    .from("memberships")
    .update({ role })
    .eq("id", membershipId)
    .eq("organisation_id", organisationId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "membership.role_changed",
    table: "memberships",
    recordId: membershipId,
    changes: { from: member.role, to: role },
  });
  return { membershipId, role, previousRole: member.role };
}

/**
 * Removes someone from the organisation. Their membership is kept, marked
 * removed, so history still shows who did what; they lose all access at
 * once. They can come back through a new invitation.
 */
export async function removeMember(
  ctx: Ctx,
  membershipId: string,
): Promise<{ membershipId: string }> {
  const { organisationId } = await requireRole(ctx, "admin");
  const member = await changeableMember(ctx, organisationId, membershipId);

  const { data, error } = await ctx.supabase
    .from("memberships")
    .update({ status: "removed" })
    .eq("id", membershipId)
    .eq("organisation_id", organisationId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "membership.removed",
    table: "memberships",
    recordId: membershipId,
    changes: { role: member.role },
  });
  return { membershipId };
}

/**
 * Makes another active member the owner; the current owner becomes an
 * admin. The database function checks again that the caller is the owner,
 * that the new owner is an active member of the same organisation, and
 * that the typed name matches; it also writes audit_log in the same
 * transaction.
 */
export async function transferOwnership(
  ctx: Ctx,
  membershipId: string,
  confirmName: string,
): Promise<{ membershipId: string }> {
  await requireRole(ctx, "owner");
  const { error } = await ctx.supabase.rpc("transfer_ownership", {
    new_owner_membership_id: membershipId,
    confirm_organisation_name: confirmName,
  });
  if (error) {
    const code = codeOf(error);
    if (code === "22023") {
      throw new UserFacingError(
        "That is not the organisation's name. Please type it exactly.",
      );
    }
    if (code === "PD004") {
      throw new UserFacingError("Choose someone who is an active member.");
    }
    if (code === "42501") {
      throw new UserFacingError("Only the account owner can do this.");
    }
    throw error;
  }
  return { membershipId };
}
