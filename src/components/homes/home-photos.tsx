"use client";

import { ImageIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addPhotoAction,
  preparePhotoUploadAction,
  removePhotoAction,
} from "@/app/(app)/homes/photo-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  isPhotoContentType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_HOME,
  PHOTO_BUCKET,
  PHOTO_MAX_DIMENSION,
  type PhotoContentType,
} from "@/lib/validation/photos";

type Photo = { id: string; url: string | null };

const WRONG_TYPE = "Please choose a photo (JPG, PNG or WebP).";
const TOO_BIG = "That photo is too big. Please choose one under 5 MB.";

/**
 * Makes a photo smaller before upload: fits it inside PHOTO_MAX_DIMENSION
 * pixels and saves it as a JPEG. Phone photos are often 4 to 10 MB; this
 * keeps them small and quick to load. Falls back to the original file when
 * the browser cannot read it, as long as it is an allowed type and size.
 */
async function preparePhotoFile(
  file: File,
): Promise<{ blob: Blob; contentType: PhotoContentType }> {
  const original =
    isPhotoContentType(file.type) && file.size <= MAX_PHOTO_BYTES
      ? { blob: file as Blob, contentType: file.type }
      : null;

  if (!file.type.startsWith("image/")) throw new Error(WRONG_TYPE);

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1 && original && file.size <= 1024 * 1024) {
      bitmap.close();
      return original;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("no blob");
    if (blob.size > MAX_PHOTO_BYTES) throw new Error(TOO_BIG);
    return { blob, contentType: "image/jpeg" };
  } catch (error) {
    if (original) return original;
    if (error instanceof Error && error.message === TOO_BIG) throw error;
    throw new Error(file.size > MAX_PHOTO_BYTES ? TOO_BIG : WRONG_TYPE);
  }
}

export function HomePhotos({
  homeId,
  homeName,
  photos,
  readOnly,
}: {
  homeId: string;
  homeName: string;
  photos: Photo[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [viewing, setViewing] = useState<{
    photo: Photo;
    index: number;
  } | null>(null);

  const spaceLeft = MAX_PHOTOS_PER_HOME - photos.length;

  async function uploadOne(file: File): Promise<string | null> {
    let prepared;
    try {
      prepared = await preparePhotoFile(file);
    } catch (error) {
      return error instanceof Error ? error.message : WRONG_TYPE;
    }

    const slot = await preparePhotoUploadAction({
      homeId,
      contentType: prepared.contentType,
    });
    if (!slot.ok) return slot.error;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(slot.data.path, prepared.blob, {
        contentType: prepared.contentType,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      return "Sorry, that photo could not be uploaded. Please try again.";
    }

    const saved = await addPhotoAction({ homeId, path: slot.data.path });
    return saved.ok ? null : saved.error;
  }

  async function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    if (files.length > spaceLeft) {
      toast.error(
        spaceLeft <= 0
          ? `A home can have up to ${MAX_PHOTOS_PER_HOME} photos. Remove one first.`
          : `You can add ${spaceLeft} more ${spaceLeft === 1 ? "photo" : "photos"} to this home.`,
      );
      return;
    }

    setUploading(true);
    let added = 0;
    let lastError: string | null = null;
    for (const file of files) {
      const error = await uploadOne(file);
      if (error) lastError = error;
      else added += 1;
    }
    setUploading(false);

    if (added > 0) {
      toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      router.refresh();
    }
    if (lastError) toast.error(lastError);
  }

  function removePhoto(photo: Photo) {
    startTransition(async () => {
      const result = await removePhotoAction(photo.id);
      if (result.ok) {
        toast.success("Photo removed");
        setViewing(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-3">
      <h2 id="photos-heading" className="text-xl font-semibold">
        Photos
      </h2>

      {photos.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No photos of this home yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setViewing({ photo, index })}
                className="block aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Open photo ${index + 1} of ${homeName}`}
              >
                {photo.url ? (
                  // Signed Supabase links change on every load, so next/image
                  // (which caches by URL) is not used here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted-foreground">
                    <ImageIcon aria-hidden="true" className="size-8" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onFilesChosen}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-6 text-base sm:self-start"
            disabled={uploading || spaceLeft <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlusIcon aria-hidden="true" className="size-5" />
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
          {spaceLeft <= 0 ? (
            <p className="text-base text-muted-foreground">
              This home has {MAX_PHOTOS_PER_HOME} photos, the most it can have.
            </p>
          ) : null}
        </>
      ) : null}

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => (!open ? setViewing(null) : undefined)}
      >
        <DialogContent className="sm:max-w-3xl">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Photo {viewing.index + 1} of {photos.length}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {homeName}
                </DialogDescription>
              </DialogHeader>
              {viewing.photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.photo.url}
                  alt={`Photo ${viewing.index + 1} of ${homeName}`}
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : (
                <p className="text-base text-muted-foreground">
                  This photo could not be loaded.
                </p>
              )}
              <DialogFooter className="gap-2">
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 gap-2 px-6 text-base"
                    disabled={pending}
                    onClick={() => removePhoto(viewing.photo)}
                  >
                    <Trash2Icon aria-hidden="true" className="size-5" />
                    {pending ? "Removing…" : "Remove photo"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-12 px-6 text-base"
                  onClick={() => setViewing(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
