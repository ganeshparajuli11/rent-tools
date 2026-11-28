import "server-only";

import { pickActiveMembership } from "@/lib/active-organisation";
import { accountTypeLabel, roleLabel } from "@/lib/people";
import { hasRole } from "@/lib/roles";

import { getPreferredOrganisationId } from "./active-organisation";
import { type Ctx, MEMBERSHIP_LIMIT } from "./context";
import { getFullName } from "./organisation";

/**
 * What the app shell (sidebar, top bar, phone More sheet) shows: the user's
 * organisations, the active one with the user's role in it, and the number
 * of homes for the Properties count. Two queries, with the user's own
 * client so RLS applies.
 *
 * The active organisation follows the same rule as `getMembership` in
 * ./context.ts: the one picked in the switcher (roadmap B5) if the person
 * is still an active member of it, otherwise the first one joined.
 */

export type ShellOrganisation = {
  id: string;
  name: string;
  accountType: string;
};

export type Shell = {
  organisations: ShellOrganisation[];
  active: ShellOrganisation & {
    /** The person's role, for showing: "Owner", "Staff"... */
    role: string;
    /** Managers and above add homes and tenants; staff only look. */
    canAdd: boolean;
  };
  /** Homes that are not archived. */
  propertiesCount: number;
  /** The person's full name from their profile, if they gave one. */
  fullName: string | null;
};

/** Null when the user has no organisation yet. */
export async function getShell(ctx: Ctx): Promise<Shell | null> {
  const [memberships, preferred] = await Promise.all([
    ctx.supabase
      .from("memberships")
      .select("organisation_id, role, organisations(id, name, account_type)")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .order("organisation_id", { ascending: true })
      .limit(MEMBERSHIP_LIMIT),
    getPreferredOrganisationId(),
  ]);
  const { data, error } = memberships;
  if (error) throw error;

  const current = pickActiveMembership(data, preferred);
  if (!current) return null;

  const organisations = data.map((membership) => ({
    id: membership.organisation_id,
    name: membership.organisations?.name ?? "Your organisation",
    accountType: accountTypeLabel(membership.organisations?.account_type),
  }));

  const [{ count, error: countError }, fullName] = await Promise.all([
    ctx.supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", current.organisation_id)
      .is("archived_at", null),
    getFullName(ctx),
  ]);
  if (countError) throw countError;

  return {
    organisations,
    active: {
      ...organisations[data.indexOf(current)]!,
      role: roleLabel(current.role),
      canAdd: hasRole(current.role, "manager"),
    },
    propertiesCount: count ?? 0,
    fullName,
  };
}
