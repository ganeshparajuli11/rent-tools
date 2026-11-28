"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  cancelInvitationAction,
  restoreInvitationAction,
} from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";

/** Cancel an invitation so its link stops working. The toast has Undo. */
export function CancelInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function undo() {
    startTransition(async () => {
      const result = await restoreInvitationAction({ invitationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation back on");
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelInvitationAction({ invitationId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast("Invitation cancelled", {
        duration: 10_000,
        action: { label: "Undo", onClick: undo },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-11 gap-2 px-4 text-base"
      disabled={pending}
      onClick={cancel}
    >
      <XIcon aria-hidden="true" className="size-4.5" />
      Cancel<span className="sr-only"> the invitation for {email}</span>
    </Button>
  );
}
