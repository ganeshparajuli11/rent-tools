"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import {
  addPhotoSchema,
  photoIdSchema,
  type PhotoContentType,
  preparePhotoSchema,
} from "@/lib/validation/photos";
import * as photos from "@/server/photos";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * Server actions for photos of a home. See src/server/photos.ts for the
 * three-step upload (prepare, browser upload, add).
 */

export async function preparePhotoUploadAction(
  input: unknown,
): Promise<ActionResult<{ path: string }>> {
  const parsed = preparePhotoSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  return runAction("homes", "preparePhotoUpload", (ctx) =>
    photos.preparePhotoUpload(
      ctx,
      parsed.data.homeId,
      parsed.data.contentType as PhotoContentType,
    ),
  );
}

export async function addPhotoAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addPhotoSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("homes", "addPhoto", (ctx) =>
    photos.addPhoto(ctx, parsed.data.homeId, parsed.data.path),
  );
  if (result.ok) revalidatePath(`/homes/${parsed.data.homeId}`);
  return result;
}

export async function removePhotoAction(
  photoId: unknown,
): Promise<ActionResult> {
  const id = photoIdSchema.safeParse(photoId);
  if (!id.success) {
    return { ok: false, error: "We could not find that photo." };
  }

  const result = await runAction("homes", "removePhoto", (ctx) =>
    photos.removePhoto(ctx, id.data),
  );
  if (!result.ok) return result;
  revalidatePath(`/homes/${result.data.propertyId}`);
  return { ok: true, data: undefined };
}
