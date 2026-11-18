import "server-only";

import { randomUUID } from "node:crypto";

import {
  buildPhotoPath,
  MAX_PHOTOS_PER_HOME,
  parsePhotoPath,
  PHOTO_BUCKET,
  type PhotoContentType,
} from "@/lib/validation/photos";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * Photos of a home (database: property_photos, files in the private
 * "property-photos" Storage bucket).
 *
 * Adding a photo takes three steps, so the file never passes through our
 * server (Vercel limits request size):
 *   1. preparePhotoUpload: the server checks the home and picks the path,
 *      inside the user's own organisation folder.
 *   2. The browser uploads the file to that path with the user's own
 *      session. Storage policies only allow their organisation's folder.
 *   3. addPhoto: the server checks the path again and records the row.
 *
 * Every function uses the signed-in user's own client, so RLS applies.
 */

/** Signed photo links last this long (seconds). Pages re-sign on each load. */
const SIGNED_URL_SECONDS = 60 * 60;

export type HomePhoto = {
  id: string;
  /** Short-lived signed link, or null if the file could not be signed. */
  url: string | null;
};

const TOO_MANY_PHOTOS = `A home can have up to ${MAX_PHOTOS_PER_HOME} photos. Remove one before you add another.`;

async function findHome(ctx: Ctx, organisationId: string, homeId: string) {
  const { data, error } = await ctx.supabase
    .from("properties")
    .select("id, archived_at")
    .eq("id", homeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);
  if (data.archived_at !== null) {
    throw new UserFacingError(
      "This home is archived. Bring it back before you add photos.",
    );
  }
  return data;
}

async function countPhotos(ctx: Ctx, organisationId: string, homeId: string) {
  const { count, error } = await ctx.supabase
    .from("property_photos")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("property_id", homeId);
  if (error) throw error;
  return count ?? 0;
}

/** Photos of one home, oldest first, each with a signed link. */
export async function listHomePhotos(
  ctx: Ctx,
  homeId: string,
): Promise<HomePhoto[]> {
  const organisationId = await getOrganisationId(ctx);

  const { data, error } = await ctx.supabase
    .from("property_photos")
    .select("id, storage_path")
    .eq("organisation_id", organisationId)
    .eq("property_id", homeId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(MAX_PHOTOS_PER_HOME);
  if (error) throw error;
  if (!data.length) return [];

  const { data: signed, error: signError } = await ctx.supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(
      data.map((photo) => photo.storage_path),
      SIGNED_URL_SECONDS,
    );
  if (signError) {
    console.error("[photos] signing failed", { name: signError.name });
  }
  const urlByPath = new Map(
    (signed ?? []).flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );

  return data.map((photo) => ({
    id: photo.id,
    url: urlByPath.get(photo.storage_path) ?? null,
  }));
}

/** Step 1: check the home and choose where the browser should upload. */
export async function preparePhotoUpload(
  ctx: Ctx,
  homeId: string,
  contentType: PhotoContentType,
): Promise<{ path: string }> {
  const organisationId = await getOrganisationId(ctx);
  await findHome(ctx, organisationId, homeId);
  if ((await countPhotos(ctx, organisationId, homeId)) >= MAX_PHOTOS_PER_HOME) {
    throw new UserFacingError(TOO_MANY_PHOTOS);
  }
  return {
    path: buildPhotoPath(organisationId, homeId, randomUUID(), contentType),
  };
}

/** Step 3: record a photo the browser has uploaded. */
export async function addPhoto(
  ctx: Ctx,
  homeId: string,
  path: string,
): Promise<{ id: string }> {
  const organisationId = await getOrganisationId(ctx);
  const parts = parsePhotoPath(path);
  // The path must be in this organisation's folder for this home.
  if (
    !parts ||
    parts.organisationId !== organisationId ||
    parts.propertyId !== homeId
  ) {
    throw new UserFacingError(
      "That photo could not be saved. Please try again.",
    );
  }
  await findHome(ctx, organisationId, homeId);
  if ((await countPhotos(ctx, organisationId, homeId)) >= MAX_PHOTOS_PER_HOME) {
    await ctx.supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw new UserFacingError(TOO_MANY_PHOTOS);
  }

  const { data, error } = await ctx.supabase
    .from("property_photos")
    .insert({
      organisation_id: organisationId,
      property_id: homeId,
      storage_path: path,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) {
    // Don't leave an unused file behind.
    await ctx.supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw error;
  }

  await writeAudit(ctx, {
    organisationId,
    action: "photo.added",
    table: "property_photos",
    recordId: data.id,
    changes: { after: { propertyId: homeId } },
  });
  return { id: data.id };
}

/** Removes a photo: the row first, then the file. */
export async function removePhoto(
  ctx: Ctx,
  photoId: string,
): Promise<{ propertyId: string }> {
  const organisationId = await getOrganisationId(ctx);

  const { data, error } = await ctx.supabase
    .from("property_photos")
    .delete()
    .eq("id", photoId)
    .eq("organisation_id", organisationId)
    .select("property_id, storage_path");
  if (error) throw error;
  const removed = data[0];
  if (!removed) throw new UserFacingError(NOT_FOUND);

  const { error: fileError } = await ctx.supabase.storage
    .from(PHOTO_BUCKET)
    .remove([removed.storage_path]);
  if (fileError) {
    // The photo is already gone from the app; log the leftover file.
    console.error("[photos] file remove failed", { name: fileError.name });
  }

  await writeAudit(ctx, {
    organisationId,
    action: "photo.removed",
    table: "property_photos",
    recordId: photoId,
    changes: { before: { propertyId: removed.property_id } },
  });
  return { propertyId: removed.property_id };
}
