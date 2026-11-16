"use client";

import { DoorOpenIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  moveTenantOutAction,
  undoMoveTenantOutAction,
} from "@/app/(app)/tenants/actions";
import { Button } from "@/components/ui/button";

/**
 * "Tenant moved out" with an "Undo" toast instead of an "Are you sure?"
 * dialog. Nothing is deleted, so undo is always safe.
 */
export function MoveOutButton({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function moveOut() {
    startTransition(async () => {
      const result = await moveTenantOutAction(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast(`${tenantName} marked as moved out`, {
        description: "You can now add a new tenant in their place.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await undoMoveTenantOutAction(tenantId);
            if (undo.ok) {
              toast.success(`${tenantName} is a tenant again`);
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
      onClick={moveOut}
    >
      <DoorOpenIcon aria-hidden="true" className="size-5" />
      {pending ? "Saving…" : "Tenant moved out"}
    </Button>
  );
}

/** Shown on a past tenant's page, so the change can be undone at any time. */
export function UndoMoveOutButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function undo() {
    startTransition(async () => {
      const result = await undoMoveTenantOutAction(tenantId);
      if (result.ok) {
        toast.success(`${result.data.name} is a tenant again`);
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
      onClick={undo}
    >
      <Undo2Icon aria-hidden="true" className="size-5" />
      {pending ? "Saving…" : "They have not moved out"}
    </Button>
  );
}
