"use client";

import { UserMinusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removeMemberAction } from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";

/**
 * "Remove" for a member. They lose access at once, so the first tap opens
 * a short explanation on the page and a second, clearly worded button
 * does it. (They can come back through a new invitation.)
 */
export function RemoveMember({
  membershipId,
  name,
}: {
  membershipId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction({ membershipId, confirm: true });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`${name} has been removed`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 gap-2 px-4 text-base"
        onClick={() => setOpen(true)}
      >
        <UserMinusIcon aria-hidden="true" className="size-4.5" />
        Remove<span className="sr-only"> {name}</span>
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-destructive/40 p-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        Remove {name}?
      </h3>
      <p className="text-base">
        They will lose access to this organisation straight away. What they did
        stays in the history. To bring them back, invite them again.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-11 gap-2 px-4 text-base"
          disabled={pending}
          onClick={remove}
        >
          <UserMinusIcon aria-hidden="true" className="size-4.5" />
          {pending ? "Removing…" : `Yes, remove ${name}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4 text-base"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Keep them
        </Button>
      </div>
    </div>
  );
}
