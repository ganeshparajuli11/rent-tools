"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { idSchema } from "@/lib/validation/homes";
import {
  optionalHomeIdSchema,
  ownerLinkSchema,
  ownerSchema,
} from "@/lib/validation/owners";
import type { Ctx } from "@/server/context";
import * as owners from "@/server/owners";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * Server actions for owner records and their links to homes. Each one:
 *  1. validates input with the shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with the
 *     user's own client (RLS applies). The data function derives the
 *     organisation on the server, checks the role (managers and above) and
 *     writes audit_log.
 */

const run = <T>(name: string, fn: (ctx: Ctx) => Promise<T>) =>
  runAction("owners", name, fn);

const NOT_FOUND = "We could not find that owner.";

function refreshOwners(ownerId?: string, homeId?: string | null) {
  revalidatePath("/owners");
  if (ownerId) revalidatePath(`/owners/${ownerId}`);
  if (homeId) revalidatePath(`/homes/${homeId}`);
}

export async function createOwnerAction(
  input: unknown,
  homeId?: unknown,
): Promise<ActionResult<{ id: string; homeId: string | null }>> {
  const parsed = ownerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const home = optionalHomeIdSchema.safeParse(homeId);
  if (!home.success)
    return { ok: false, error: "We could not find that home." };

  const result = await run("createOwner", (ctx) =>
    owners.createOwner(ctx, parsed.data, home.data),
  );
  if (result.ok) refreshOwners(result.data.id, result.data.homeId);
  return result;
}

export async function updateOwnerAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const ownerId = idSchema.safeParse(id);
  if (!ownerId.success) return { ok: false, error: NOT_FOUND };
  const parsed = ownerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await run("updateOwner", async (ctx) => {
    await owners.updateOwner(ctx, ownerId.data, parsed.data);
    return undefined;
  });
  if (result.ok) {
    // The name shows on every home they own.
    revalidatePath("/homes", "layout");
    refreshOwners(ownerId.data);
  }
  return result;
}

export async function archiveOwnerAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  return setOwnerArchived(id, true);
}

export async function restoreOwnerAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  return setOwnerArchived(id, false);
}

async function setOwnerArchived(
  id: unknown,
  archived: boolean,
): Promise<ActionResult<{ name: string }>> {
  const ownerId = idSchema.safeParse(id);
  if (!ownerId.success) return { ok: false, error: NOT_FOUND };

  const result = await run(archived ? "archiveOwner" : "restoreOwner", (ctx) =>
    owners.setOwnerArchived(ctx, ownerId.data, archived),
  );
  if (result.ok) refreshOwners(ownerId.data);
  return result;
}

export async function linkOwnerAction(
  input: unknown,
): Promise<ActionResult<{ name: string }>> {
  const parsed = ownerLinkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await run("linkOwner", (ctx) =>
    owners.linkOwner(ctx, parsed.data.homeId, parsed.data.ownerId),
  );
  if (result.ok) refreshOwners(parsed.data.ownerId, parsed.data.homeId);
  return result;
}

export async function unlinkOwnerAction(
  input: unknown,
): Promise<ActionResult<{ name: string }>> {
  const parsed = ownerLinkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await run("unlinkOwner", (ctx) =>
    owners.unlinkOwner(ctx, parsed.data.homeId, parsed.data.ownerId),
  );
  if (result.ok) refreshOwners(parsed.data.ownerId, parsed.data.homeId);
  return result;
}
