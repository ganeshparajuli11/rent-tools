import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * The user's organisation, looked up on the server from memberships.
 * We never trust an organisation id sent by the browser.
 */
export async function getOrganisationId(ctx: Ctx): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new UserFacingError("Your account is not set up yet.");
  return data.organisation_id;
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
