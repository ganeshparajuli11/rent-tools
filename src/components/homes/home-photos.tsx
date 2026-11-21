"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  ImagePlusIcon,
  Trash2Icon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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

  function step(by: number) {
    setViewing((current) => {
      if (!current || photos.length === 0) return current;
      const index = (current.index + by + photos.length) % photos.length;
      return { photo: photos[index]!, index };
    });
  }

  const addButton = !readOnly ? (
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
        className="h-11 gap-2 px-4 text-base"
        disabled={uploading || spaceLeft <= 0}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlusIcon aria-hidden="true" className="size-5" />
        {uploading ? "Uploading…" : "Add photos"}
      </Button>
    </>
  ) : null;

  // Up to 5 photos show in the gallery; the last tile says how many more.
  const shown = photos.slice(0, 5);
  const hidden = photos.length - shown.length;

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="photos-heading"
          className="text-xl font-semibold tracking-[-0.02em]"
        >
          Photos
          {photos.length > 0 ? (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {photos.length}
            </span>
          ) : null}
        </h2>
        {photos.length > 0 ? addButton : null}
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/40 px-4 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-foreground/10">
            <ImageIcon aria-hidden="true" className="size-7" />
          </span>
          <p className="text-base text-muted-foreground">
            No photos of this home yet.
          </p>
          {addButton}
        </div>
      ) : (
        <ul
          className={cn(
            "grid gap-2 overflow-hidden rounded-2xl",
            shown.length === 1 && "grid-cols-1",
            shown.length === 2 && "grid-cols-2",
            shown.length >= 3 &&
              "grid-cols-2 sm:h-[26rem] sm:grid-cols-4 sm:grid-rows-2",
          )}
        >
          {shown.map((photo, index) => {
            const isLead = index === 0 && shown.length >= 3;
            const moreLabel =
              hidden > 0 && index === shown.length - 1 ? `+${hidden}` : null;
            return (
              <li
                key={photo.id}
                className={cn(
                  "relative",
                  isLead && "col-span-2 sm:row-span-2",
                  shown.length === 3 && index > 0 && "sm:col-span-2",
                  shown.length === 4 && index === 3 && "sm:col-span-2",
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewing({ photo, index })}
                  className={cn(
                    "group block w-full overflow-hidden bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    shown.length >= 3
                      ? "aspect-[4/3] sm:aspect-auto sm:h-full"
                      : "aspect-[16/10]",
                    isLead && "aspect-[16/10]",
                  )}
                  aria-label={`Open photo ${index + 1} of ${photos.length}`}
                >
                  {photo.url ? (
                    // Signed Supabase links change on every load, so next/image
                    // (which caches by URL) is not used here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt=""
                      loading={index === 0 ? "eager" : "lazy"}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImageIcon aria-hidden="true" className="size-8" />
                    </span>
                  )}
                  {moreLabel ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                      {moreLabel}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && spaceLeft <= 0 ? (
        <p className="text-base text-muted-foreground">
          This home has {MAX_PHOTOS_PER_HOME} photos, the most it can have.
        </p>
      ) : null}

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => (!open ? setViewing(null) : undefined)}
      >
        <DialogContent className="sm:max-w-4xl">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{homeName}</DialogTitle>
                <DialogDescription className="text-base">
                  Photo {viewing.index + 1} of {photos.length}
                </DialogDescription>
              </DialogHeader>
              <div className="relative overflow-hidden rounded-xl bg-muted">
                {viewing.photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewing.photo.url}
                    alt={`Photo ${viewing.index + 1} of ${homeName}`}
                    className="max-h-[65vh] w-full object-contain"
                  />
                ) : (
                  <p className="p-8 text-center text-base text-muted-foreground">
                    This photo could not be loaded.
                  </p>
                )}
                {photos.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute top-1/2 left-2 size-11 -translate-y-1/2 rounded-full bg-background/90"
                      onClick={() => step(-1)}
                      aria-label="Previous photo"
                    >
                      <ChevronLeftIcon aria-hidden="true" className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute top-1/2 right-2 size-11 -translate-y-1/2 rounded-full bg-background/90"
                      onClick={() => step(1)}
                      aria-label="Next photo"
                    >
                      <ChevronRightIcon aria-hidden="true" className="size-5" />
                    </Button>
                  </>
                ) : null}
              </div>
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
