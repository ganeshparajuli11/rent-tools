import "server-only";

import { accountTypeLabel, roleLabel } from "@/lib/people";

import type { Ctx } from "./context";

/**
 * What the app shell (sidebar, top bar, phone More sheet) shows: the user's
 * organisations, the active one with the user's role in it, and the number
 * of homes for the Properties count. Two queries, with the user's own
 * client so RLS applies.
 *
 * The active organisation is the first membership, the same rule as
 * `getOrganisationId`, until the switcher arrives in roadmap item B5.
 */

export type ShellOrganisation = {
  id: string;
  name: string;
  accountType: string;
};

export type Shell = {
  organisations: ShellOrganisation[];
  active: ShellOrganisation & { role: string };
  /** Homes that are not archived. */
  propertiesCount: number;
};

/** Null when the user has no organisation yet. */
export async function getShell(ctx: Ctx): Promise<Shell | null> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("organisation_id, role, organisations(id, name)")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .order("organisation_id", { ascending: true })
    .limit(50);
  if (error) throw error;

  const first = data[0];
  if (!first) return null;

  const organisations = data.map((membership) => ({
    id: membership.organisation_id,
    name: membership.organisations?.name ?? "Your organisation",
    // Account types are stored from roadmap item B2 (D-5 until then).
    accountType: accountTypeLabel(null),
  }));

  const { count, error: countError } = await ctx.supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", first.organisation_id)
    .is("archived_at", null);
  if (countError) throw countError;

  return {
    organisations,
    active: { ...organisations[0]!, role: roleLabel(first.role) },
    propertiesCount: count ?? 0,
  };
}
