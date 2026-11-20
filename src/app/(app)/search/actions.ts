"use server";

import type { ActionResult } from "@/lib/action-result";
import { searchQuerySchema } from "@/lib/validation/search";
import { invalidInput, runAction } from "@/server/run-action";
import * as search from "@/server/search";

/**
 * The ⌘K search box. Validates with the shared Zod schema (which also
 * cleans the term), then goes through runAction (session check, rate limit,
 * the user's own client so RLS applies). The data function derives the
 * organisation on the server. Read-only, so it writes no audit_log row.
 */
export async function searchAction(
  input: unknown,
): Promise<ActionResult<search.SearchResults>> {
  const parsed = searchQuerySchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  return runAction("search", "search", (ctx) =>
    search.searchRecords(ctx, parsed.data.query),
  );
}
