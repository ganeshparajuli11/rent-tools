"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  markRentPaidAction,
  removePaymentAction,
} from "@/app/(app)/rent/actions";
import { Button } from "@/components/ui/button";
import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * One-tap "Mark as paid" for a row of rent outside the rent page (the
 * Today page's "Rent this month"). It records whatever is left, then shows
 * a toast with Undo, which removes that payment again. Nothing asks "Are
 * you sure?". The server checks the session, the organisation and the
 * amount; this button only sends the charge's id.
 */
export function MarkPaidButton({
  chargeId,
  tenantName,
  place,
  canRemovePayments,
  className,
}: {
  chargeId: string;
  tenantName: string;
  /** "Room 2, Sample House 01", shown under the toast. */
  place: string;
  /** False until the database can remove payments (then there is no Undo). */
  canRemovePayments: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function undo(paymentId: string) {
    const result = await removePaymentAction(paymentId);
    if (result.ok) {
      toast.success(`${formatPence(result.data.amountPence)} payment removed`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function markPaid() {
    startTransition(async () => {
      const result = await markRentPaidAction(chargeId);
      router.refresh();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { paymentId, amountPence } = result.data;
      toast(`${formatPence(amountPence)} recorded for ${tenantName}`, {
        description: place,
        duration: 10_000,
        action: canRemovePayments
          ? { label: "Undo", onClick: () => void undo(paymentId) }
          : undefined,
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={markPaid}
      aria-label={`Mark as paid: ${tenantName}`}
      className={cn(
        "h-11 rounded-[10px] px-3 text-[13px] font-medium whitespace-nowrap lg:h-10",
        className,
      )}
    >
      {pending ? "Saving…" : "Mark as paid"}
    </Button>
  );
}
