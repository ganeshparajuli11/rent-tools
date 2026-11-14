"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { type ActionResult, GENERIC_ERROR } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  createHomeSchema,
  idSchema,
  renameRoomSchema,
  updateHomeSchema,
} from "@/lib/validation/homes";
import { getCurrentUser } from "@/server/auth";
import { type Ctx, UserFacingError } from "@/server/context";
import * as homes from "@/server/homes";

/**
 * Server actions for homes and rooms. Each one:
 *  1. checks the session,
 *  2. validates input with the shared Zod schema,
 *  3. applies the rate limiter,
 *  4. runs the data function with the user's own client (RLS applies),
 *     which derives the organisation on the server and writes audit_log.
 */

const TOO_MANY =
  "You have made a lot of changes quickly. Please wait a minute and try again.";

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

async function run<T>(
  name: string,
  fn: (ctx: Ctx) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: "You have been signed out. Please sign in again.",
    };
  }

  try {
    const limit = await rateLimit("homes-write", user.id, 60, "60 s");
    if (!limit.success) return { ok: false, error: TOO_MANY };

    const supabase = await createClient();
    const data = await fn({ supabase, userId: user.id });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error(`[homes] ${name} failed`, { code });
    return { ok: false, error: GENERIC_ERROR };
  }
}

function invalid(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Please check the answers marked below.",
    fieldErrors: fieldErrorsOf(error),
  };
}

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
