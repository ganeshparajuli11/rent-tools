import { z } from "zod";

/**
 * Photos of a home. Shared by the browser (before uploading) and the server
 * (before recording a photo).
 *
 * Files live in the private "property-photos" Storage bucket at
 *   <organisation_id>/<property_id>/<uuid>.<jpg|png|webp>
 */

export const PHOTO_BUCKET = "property-photos";

/** Most photos one home can have. */
export const MAX_PHOTOS_PER_HOME = 20;

/** Biggest file we accept. The bucket enforces the same limit. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Photos are shrunk in the browser to fit inside this many pixels. */
export const PHOTO_MAX_DIMENSION = 1600;

export const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PhotoContentType = keyof typeof PHOTO_TYPES;

export function isPhotoContentType(value: string): value is PhotoContentType {
  return Object.hasOwn(PHOTO_TYPES, value);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH = new RegExp(
  `^(${UUID})/(${UUID})/(${UUID})\\.(jpg|png|webp)$`,
);

/**
 * Splits a photo path into its parts, or returns null when it is not a
 * well-formed photo path (wrong shape, other folders, "..", and so on).
 */
export function parsePhotoPath(path: string): {
  organisationId: string;
  propertyId: string;
  fileId: string;
  extension: string;
} | null {
  const match = PHOTO_PATH.exec(path);
  if (!match) return null;
  return {
    organisationId: match[1]!,
    propertyId: match[2]!,
    fileId: match[3]!,
    extension: match[4]!,
  };
}

/** Builds the path for a new photo. */
export function buildPhotoPath(
  organisationId: string,
  propertyId: string,
  fileId: string,
  contentType: PhotoContentType,
): string {
  return `${organisationId}/${propertyId}/${fileId}.${PHOTO_TYPES[contentType]}`;
}

export const preparePhotoSchema = z.object({
  homeId: z.uuid({ error: "We could not find that home." }),
  contentType: z.string().refine(isPhotoContentType, {
    error: "Please choose a JPG, PNG or WebP photo.",
  }),
});

export const addPhotoSchema = z.object({
  homeId: z.uuid({ error: "We could not find that home." }),
  path: z
    .string()
    .max(300)
    .refine((value) => parsePhotoPath(value) !== null, {
      error: "That photo could not be saved. Please try again.",
    }),
});

export const photoIdSchema = z.uuid({ error: "We could not find that photo." });
