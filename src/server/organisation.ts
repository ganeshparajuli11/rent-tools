import "server-only";

import {
  ALREADY_SET_UP,
  type OrganisationSetupValues,
} from "@/lib/validation/organisation";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  UserFacingError,
} from "./context";

/**
 * Setting up an organisation and reading the person's profile (roadmap B2).
 *
 * A new account has a profile but no organisation. The /setup screen asks
 * for the person's name and the organisation's name, account type and
 * contact email, then calls the database function `create_organisation`.
 * That function checks the session again, refuses a second organisation,
 * makes the organisation, makes the caller its owner, saves their name and
 * writes audit_log, all in one transaction. Nothing here trusts an id from
 * the browser: the function works out who is calling from the session.
 *
 * The migration that adds all this may not be applied yet (see
 * docs/PENDING_MIGRATIONS.md); readers fall back quietly until it is.
 */

const NOT_READY =
  "Setting up an organisation is not ready yet. Please try again later.";

function codeOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

/** A missing table, column or function: the B2 migration is not applied. */
function isNotMigrated(error: unknown): boolean {
  const code = codeOf(error);
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST204" ||
    code === "PGRST205"
  );
}

/** True when the signed-in person belongs to at least one organisation. */
export async function hasOrganisation(ctx: Ctx): Promise<boolean> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", ctx.userId)
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}

/**
 * The signed-in person's full name, or null when they have not given one.
 * Best effort: the name only decorates pages, so a failed lookup (or a
 * missing profiles table) gives null instead of taking the page down.
 */
export async function getFullName(ctx: Ctx): Promise<string | null> {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) {
    if (!isNotMigrated(error)) {
      console.error("[profile] read failed", { code: codeOf(error) });
    }
    return null;
  }
  return data?.full_name ?? null;
}

/**
 * Makes the organisation, with the signed-in person as its owner. Called
 * only by the setup action, after its Zod check.
 */
export async function setUpOrganisation(
  ctx: Ctx,
  values: OrganisationSetupValues,
): Promise<{ organisationId: string }> {
  const { data, error } = await ctx.supabase.rpc("create_organisation", {
    org_name: values.organisationName,
    org_account_type: values.accountType,
    org_contact_email: values.contactEmail,
    creator_full_name: values.fullName,
  });
  if (error) {
    const code = codeOf(error);
    if (code === "PD001") throw new UserFacingError(ALREADY_SET_UP);
    if (code === "22023") {
      throw new UserFacingError("Please check your answers and try again.");
    }
    if (isNotMigrated(error)) throw new UserFacingError(NOT_READY);
    throw error;
  }
  if (typeof data !== "string") throw new Error("create_organisation: no id");
  return { organisationId: data };
}

export type OrganisationDetails = {
  name: string;
  /** "landlord" or "property_manager"; null before the migration. */
  accountType: string | null;
  contactEmail: string | null;
};

/** The active organisation's name, account type and contact email. */
export async function getOrganisationDetails(
  ctx: Ctx,
): Promise<OrganisationDetails> {
  const organisationId = await getOrganisationId(ctx);

  const full = await ctx.supabase
    .from("organisations")
    .select("name, account_type, contact_email")
    .eq("id", organisationId)
    .maybeSingle();
  if (!full.error) {
    if (!full.data) throw new UserFacingError(NOT_FOUND);
    return {
      name: full.data.name,
      accountType: full.data.account_type,
      contactEmail: full.data.contact_email,
    };
  }
  if (!isNotMigrated(full.error)) throw full.error;

  const basic = await ctx.supabase
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();
  if (basic.error) throw basic.error;
  if (!basic.data) throw new UserFacingError(NOT_FOUND);
  return { name: basic.data.name, accountType: null, contactEmail: null };
}
