"use client";

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  archiveHomeAction,
  restoreHomeAction,
} from "@/app/(app)/homes/actions";
import { Button } from "@/components/ui/button";

/**
 * Archive with an "Undo" toast instead of an "Are you sure?" dialog.
 * Nothing is deleted, so undo is always safe.
 */
export function ArchiveHomeButton({
  homeId,
  homeName,
}: {
  homeId: string;
  homeName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function archive() {
    startTransition(async () => {
      const result = await archiveHomeAction(homeId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/homes");
      toast(`${homeName} archived`, {
        description: "It is hidden from your homes list.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await restoreHomeAction(homeId);
            if (undo.ok) {
              toast.success(`${homeName} is back`);
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
      {pending ? "Archiving…" : "Archive this home"}
    </Button>
  );
}

export function RestoreHomeButton({ homeId }: { homeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreHomeAction(homeId);
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
      {pending ? "Bringing it back…" : "Bring it back"}
    </Button>
  );
}
