"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import {
  createHomeSchema,
  idSchema,
  renameRoomSchema,
  updateHomeSchema,
} from "@/lib/validation/homes";
import type { Ctx } from "@/server/context";
import * as homes from "@/server/homes";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * Server actions for homes and rooms. Each one:
 *  1. validates input with the shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with the
 *     user's own client (RLS applies). The data function derives the
 *     organisation on the server and writes audit_log.
 */

const run = <T>(name: string, fn: (ctx: Ctx) => Promise<T>) =>
  runAction("homes", name, fn);
const invalid = invalidInput;

function refreshHomes(id?: string) {
  revalidatePath("/homes");
  if (id) revalidatePath(`/homes/${id}`);
}

export async function createHomeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createHomeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await run("createHome", (ctx) =>
    homes.createHome(ctx, parsed.data),
  );
  if (result.ok) refreshHomes(result.data.id);
  return result;
}

export async function updateHomeAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const homeId = idSchema.safeParse(id);
  if (!homeId.success)
    return { ok: false, error: "We could not find that home." };
  const parsed = updateHomeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await run("updateHome", async (ctx) => {
    await homes.updateHome(ctx, homeId.data, parsed.data);
    return undefined;
  });
  if (result.ok) refreshHomes(homeId.data);
  return result;
}

export async function archiveHomeAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  const homeId = idSchema.safeParse(id);
  if (!homeId.success)
    return { ok: false, error: "We could not find that home." };

  const result = await run("archiveHome", (ctx) =>
    homes.setHomeArchived(ctx, homeId.data, true),
  );
  if (result.ok) refreshHomes(homeId.data);
  return result;
}

export async function restoreHomeAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  const homeId = idSchema.safeParse(id);
  if (!homeId.success)
    return { ok: false, error: "We could not find that home." };

  const result = await run("restoreHome", (ctx) =>
    homes.setHomeArchived(ctx, homeId.data, false),
  );
  if (result.ok) refreshHomes(homeId.data);
  return result;
}

export async function addRoomAction(
  propertyId: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  const homeId = idSchema.safeParse(propertyId);
  if (!homeId.success)
    return { ok: false, error: "We could not find that home." };

  const result = await run("addRoom", (ctx) => homes.addRoom(ctx, homeId.data));
  if (result.ok) refreshHomes(homeId.data);
  return result;
}

export async function renameRoomAction(input: unknown): Promise<ActionResult> {
  const parsed = renameRoomSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await run("renameRoom", (ctx) =>
    homes.renameRoom(ctx, parsed.data.roomId, parsed.data.name),
  );
  if (!result.ok) return result;
  refreshHomes(result.data.propertyId);
  return { ok: true, data: undefined };
}

export async function archiveRoomAction(
  roomId: unknown,
): Promise<ActionResult<{ name: string }>> {
  return setRoomArchived(roomId, true);
}

export async function restoreRoomAction(
  roomId: unknown,
): Promise<ActionResult<{ name: string }>> {
  return setRoomArchived(roomId, false);
}

async function setRoomArchived(
  roomId: unknown,
  archived: boolean,
): Promise<ActionResult<{ name: string }>> {
  const id = idSchema.safeParse(roomId);
  if (!id.success) return { ok: false, error: "We could not find that room." };

  const result = await run(archived ? "archiveRoom" : "restoreRoom", (ctx) =>
    homes.setRoomArchived(ctx, id.data, archived),
  );
  if (!result.ok) return result;
  refreshHomes(result.data.propertyId);
  return { ok: true, data: { name: result.data.name } };
}
