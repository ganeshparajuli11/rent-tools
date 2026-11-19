"use client";

import { EraserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { removeTenantDetailsAction } from "@/app/(app)/tenants/actions";
import { Button } from "@/components/ui/button";

/**
 * "Remove their personal details" for a tenant who has moved out.
 *
 * Everything else in the app is undone with an "Undo" toast. This cannot
 * be: once the details are gone there is nothing to put back. So the first
 * tap only opens a short explanation on the page (not a pop-up dialog), and
 * a second, clearly worded button does it.
 */
export function RemoveTenantDetails({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
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
      const result = await removeTenantDetailsAction({
        tenantId,
        confirm: true,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(
        result.data.alreadyRemoved
          ? "Their details were already removed"
          : "Their personal details have been removed",
      );
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-2 px-6 text-base sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <EraserIcon aria-hidden="true" className="size-5" />
        Remove their personal details
      </Button>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-xl border border-destructive/40 p-4">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        Remove {tenantName}&apos;s details?
      </h3>
      <p className="text-base">
        Their name, phone number, email address and any notes on their payments
        will be removed for good. This cannot be undone.
      </p>
      <p className="text-base text-muted-foreground">
        Their rent and payments stay, so your totals do not change. They will be
        shown as &ldquo;Former tenant&rdquo;.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-12 gap-2 px-6 text-base"
          disabled={pending}
          onClick={remove}
        >
          <EraserIcon aria-hidden="true" className="size-5" />
          {pending ? "Removing…" : "Yes, remove their details"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 px-6 text-base"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Keep their details
        </Button>
      </div>
    </div>
  );
}
