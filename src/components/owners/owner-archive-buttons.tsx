"use client";

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  archiveOwnerAction,
  restoreOwnerAction,
} from "@/app/(app)/owners/actions";
import { Button } from "@/components/ui/button";

/**
 * Archive with an "Undo" toast instead of an "Are you sure?" dialog.
 * Nothing is deleted: their homes, rent history and notes stay.
 */
export function ArchiveOwnerButton({
  ownerId,
  ownerName,
}: {
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function archive() {
    startTransition(async () => {
      const result = await archiveOwnerAction(ownerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/owners");
      toast(`${ownerName} archived`, {
        description: "They are hidden from your owners list.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await restoreOwnerAction(ownerId);
            if (undo.ok) {
              toast.success(`${ownerName} is back`);
              router.refresh();
            } else {
              toast.error(undo.error);
            }
          },
        },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-12 w-full gap-2 px-6 text-base sm:w-auto"
      disabled={pending}
      onClick={archive}
    >
      <ArchiveIcon aria-hidden="true" className="size-5" />
      {pending ? "Archiving…" : "Archive this owner"}
    </Button>
  );
}

export function RestoreOwnerButton({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreOwnerAction(ownerId);
      if (result.ok) {
        toast.success(`${result.data.name} is back in your list`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      size="lg"
      className="h-12 w-full gap-2 px-6 text-base sm:w-auto"
      disabled={pending}
      onClick={restore}
    >
      <ArchiveRestoreIcon aria-hidden="true" className="size-5" />
      {pending ? "Bringing them back…" : "Bring them back"}
    </Button>
  );
}
