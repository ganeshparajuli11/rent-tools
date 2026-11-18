import "server-only";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * Organisation settings. For now one: the daily late rent email.
 *
 * The switch is `organisations.overdue_email_enabled`. RLS lets every
 * member read it and only owners change it; the check here is so staff get
 * a plain message instead of a change that silently does nothing.
 *
 * The column comes from a migration that may not be applied yet (see
 * docs/PENDING_MIGRATIONS.md). Until it is, the page says the switch is not
 * ready and changing it gives a plain message.
 */

export const NOT_READY =
  "This setting is not ready yet. It will be switched on soon.";
const OWNERS_ONLY = "Only the account owner can change this.";

export type OverdueEmailSettings = {
  organisationName: string;
  isOwner: boolean;
  /** Null until the migration that adds the switch is applied. */
  enabled: boolean | null;
};

function isMissingColumn(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  return code === "42703" || code === "PGRST204";
}

async function isOwner(ctx: Ctx, organisationId: string): Promise<boolean> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === "owner";
}

export async function getOverdueEmailSettings(
  ctx: Ctx,
): Promise<OverdueEmailSettings> {
  const organisationId = await getOrganisationId(ctx);
  const owner = await isOwner(ctx, organisationId);

  const full = await ctx.supabase
    .from("organisations")
    .select("name, overdue_email_enabled")
    .eq("id", organisationId)
    .maybeSingle();
  if (!full.error) {
    if (!full.data) throw new UserFacingError(NOT_FOUND);
    return {
      organisationName: full.data.name,
      isOwner: owner,
      enabled: full.data.overdue_email_enabled,
    };
  }
  if (!isMissingColumn(full.error)) throw full.error;

  const basic = await ctx.supabase
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();
  if (basic.error) throw basic.error;
  if (!basic.data) throw new UserFacingError(NOT_FOUND);
  return { organisationName: basic.data.name, isOwner: owner, enabled: null };
}

/** Turns the daily late rent email on or off for the user's organisation. */
export async function setOverdueEmailEnabled(
  ctx: Ctx,
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  const organisationId = await getOrganisationId(ctx);
  if (!(await isOwner(ctx, organisationId))) {
    throw new UserFacingError(OWNERS_ONLY);
  }

  const { data, error } = await ctx.supabase
    .from("organisations")
    .update({ overdue_email_enabled: enabled })
    .eq("id", organisationId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) throw new UserFacingError(NOT_READY);
    throw error;
  }
  if (!data) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "organisation.overdue_email_changed",
    table: "organisations",
    recordId: organisationId,
    changes: { overdue_email_enabled: enabled },
  });
  return { enabled };
}
