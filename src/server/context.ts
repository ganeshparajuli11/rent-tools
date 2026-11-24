import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hasRole, isRole, type Role, roleTooLowMessage } from "@/lib/roles";
import type { Database, Json } from "@/lib/supabase/database.types";

export type Db = SupabaseClient<Database>;

/**
 * Everything a data function needs: the signed-in user's own Supabase client
 * (so RLS applies) and their user id. Never a service-role client.
 */
export type Ctx = {
  supabase: Db;
  userId: string;
};

/** An expected problem with a message that is safe to show to the user. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const NOT_FOUND = "We could not find that. It may have been removed.";

const NO_ORGANISATION = "Please finish setting up your organisation first.";

/**
 * The user's organisation, looked up on the server from their active
 * memberships. We never trust an organisation id sent by the browser.
 */
export async function getOrganisationId(ctx: Ctx): Promise<string> {
  return (await getMembership(ctx)).organisationId;
}

export type Membership = {
  organisationId: string;
  /** Null for a role this code does not know: it can do nothing. */
  role: Role | null;
};

/**
 * The user's active membership: their organisation and their role in it.
 * The active organisation is the first one joined, until the switcher
 * (roadmap B5). One query, with the user's own client.
 */
export async function getMembership(ctx: Ctx): Promise<Membership> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .order("organisation_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new UserFacingError(NO_ORGANISATION);
  return {
    organisationId: data.organisation_id,
    role: isRole(data.role) ? data.role : null,
  };
}

/**
 * Use at the top of every data function that changes something: the
 * user's organisation, but only when their role is `min` or higher
 * (owner > admin > manager > staff). Otherwise a plain message such as
 * "Only an owner, admin or manager can do this." Row-level security
 * enforces the same rule in the database; this check is so people get a
 * clear answer instead of a change that silently does nothing.
 */
export async function requireRole(
  ctx: Ctx,
  min: Role,
): Promise<{ organisationId: string; role: Role }> {
  const membership = await getMembership(ctx);
  if (!membership.role || !hasRole(membership.role, min)) {
    throw new UserFacingError(roleTooLowMessage(min));
  }
  return { organisationId: membership.organisationId, role: membership.role };
}

/**
 * True when the user's role in their organisation is `min` or higher. For
 * showing only the actions a role can take (docs/DESIGN_SYSTEM.md §8);
 * never the only check: data functions use requireRole and RLS applies.
 */
export async function hasRoleAtLeast(ctx: Ctx, min: Role): Promise<boolean> {
  return hasRole((await getMembership(ctx)).role, min);
}

/** True when the user is an active owner of this organisation. */
export async function isOrganisationOwner(
  ctx: Ctx,
  organisationId: string,
): Promise<boolean> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data?.role === "owner";
}

/**
 * Writes an audit_log row. A failure here is logged but does not undo or
 * fail the change the user just made.
 */
export async function writeAudit(
  ctx: Ctx,
  entry: {
    organisationId: string;
    action: string;
    table: string;
    recordId: string | null;
    changes?: Json;
  },
) {
  const { error } = await ctx.supabase.from("audit_log").insert({
    organisation_id: entry.organisationId,
    user_id: ctx.userId,
    action: entry.action,
    table_name: entry.table,
    record_id: entry.recordId,
    changes: entry.changes ?? null,
  });
  if (error) {
    console.error("[audit] insert failed", {
      action: entry.action,
      code: error.code,
    });
  }
}
