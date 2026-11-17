"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, PencilLineIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  markRentPaidAction,
  recordPaymentAction,
  removePaymentAction,
  restorePaymentAction,
} from "@/app/(app)/rent/actions";
import { applyServerErrors, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { formatDayAndMonth } from "@/lib/rent";
import {
  otherAmountSchema,
  type OtherAmountInput,
  type OtherAmountValues,
} from "@/lib/validation/rent";
import type { RentRow } from "@/server/rent";

import { RentStatusBadge } from "./rent-status-badge";

/**
 * One tenant's rent for the month.
 *
 * The main action is one tap: "Mark as paid" records whatever is left.
 * "Other amount" opens a small form for a part payment. Nothing asks "Are
 * you sure?": every change shows a toast with Undo instead.
 */
export function RentRowItem({
  row,
  canRemovePayments,
}: {
  row: RentRow;
  /** False until the database can remove payments (then there is no Undo). */
  canRemovePayments: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [otherOpen, setOtherOpen] = useState(false);

  const place = row.roomName
    ? `${row.roomName}, ${row.homeName}`
    : row.homeName;

  async function putBack(paymentId: string) {
    const result = await restorePaymentAction(paymentId);
    if (result.ok) {
      toast.success(`${formatPence(result.data.amountPence)} put back`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function remove(paymentId: string, undoable: boolean) {
    const result = await removePaymentAction(paymentId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
    const message = `${formatPence(result.data.amountPence)} payment removed`;
    if (!undoable) {
      toast.success(message);
      return;
    }
    toast(message, {
      description: `${row.tenantName}, ${place}`,
      duration: 10_000,
      action: { label: "Undo", onClick: () => putBack(paymentId) },
    });
  }

  /** The toast after a payment is recorded, with Undo when it is possible. */
  function showRecorded(paymentId: string, amountPence: number) {
    router.refresh();
    toast(`${formatPence(amountPence)} recorded for ${row.tenantName}`, {
      description: place,
      duration: 10_000,
      action: canRemovePayments
        ? { label: "Undo", onClick: () => remove(paymentId, false) }
        : undefined,
    });
  }

  function markPaid() {
    startTransition(async () => {
      const result = await markRentPaidAction(row.chargeId);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      showRecorded(result.data.paymentId, result.data.amountPence);
    });
  }

  function removeListed(paymentId: string) {
    startTransition(() => remove(paymentId, true));
  }

  const paid = row.status === "paid";

  return (
    <li className="flex flex-col gap-4 p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-x-6">
      <div className="flex min-w-0 flex-col">
        <Link
          href={`/tenants/${row.tenantId}`}
          className="inline-flex min-h-11 items-center self-start text-lg font-semibold break-words underline underline-offset-4"
        >
          {row.tenantName}
        </Link>
        <span className="text-base text-muted-foreground">
          {place}
          {row.movedOut ? " (moved out)" : ""}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1 text-base">
        <RentStatusBadge status={row.status} />
        <span className="font-medium">
          {formatPence(row.amountPence)} due {formatDayAndMonth(row.dueDate)}
        </span>
        {row.paidPence > 0 && !paid ? (
          <span className="text-muted-foreground">
            {formatPence(row.paidPence)} paid, {formatPence(row.owedPence)} left
            to pay
          </span>
        ) : null}
      </div>

      {!paid ? (
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Button
            type="button"
            size="lg"
            className="h-12 gap-2 px-6 text-base"
            disabled={pending}
            onClick={markPaid}
            aria-label={`Mark as paid: ${row.tenantName}`}
          >
            <CheckIcon aria-hidden="true" className="size-5" />
            {pending ? "Saving…" : "Mark as paid"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 gap-2 px-6 text-base"
            aria-expanded={otherOpen}
            aria-label={`Other amount: ${row.tenantName}`}
            onClick={() => setOtherOpen((open) => !open)}
          >
            <PencilLineIcon aria-hidden="true" className="size-5" />
            Other amount
          </Button>
        </div>
      ) : (
        <span className="hidden lg:block" />
      )}

      {otherOpen && !paid ? (
        <OtherAmountForm
          row={row}
          onCancel={() => setOtherOpen(false)}
          onRecorded={(paymentId, amountPence) => {
            setOtherOpen(false);
            showRecorded(paymentId, amountPence);
          }}
        />
      ) : null}

      {row.payments.length > 0 ? (
        <details className="rounded-lg border px-4 lg:col-span-3">
          <summary className="min-h-11 cursor-pointer content-center text-base">
            Payments ({row.payments.length})
          </summary>
          <ul className="flex flex-col divide-y border-t">
            {row.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-base">
                  <span className="font-medium">
                    {formatPence(payment.amountPence)}
                  </span>{" "}
                  recorded on {formatDate(payment.paidOn)}
                </span>
                {canRemovePayments ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2 px-4 text-base"
                    disabled={pending}
                    onClick={() => removeListed(payment.id)}
                    aria-label={`Remove payment of ${formatPence(payment.amountPence)} from ${row.tenantName}`}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

/** "Other amount": one field, for a payment that is not the full rent. */
function OtherAmountForm({
  row,
  onCancel,
  onRecorded,
}: {
  row: RentRow;
  onCancel: () => void;
  onRecorded: (paymentId: string, amountPence: number) => void;
}) {
  const form = useForm<OtherAmountInput, unknown, OtherAmountValues>({
    resolver: zodResolver(otherAmountSchema),
    defaultValues: { amount: "" },
  });

  const onSubmit = form.handleSubmit(async () => {
    const result = await recordPaymentAction(row.chargeId, form.getValues());
    if (result.ok) {
      onRecorded(result.data.paymentId, result.data.amountPence);
      return;
    }
    if (!applyServerErrors(form, result.fieldErrors)) {
      form.setError("amount", { type: "server", message: result.error });
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label={`Other amount for ${row.tenantName}`}
      className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 lg:col-span-3"
    >
      <TextField
        form={form}
        name="amount"
        id={`other-amount-${row.chargeId}`}
        label="Amount paid, in pounds"
        hint={`${formatPence(row.owedPence)} is left to pay. For example 200 or 200.50`}
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        className="sm:max-w-60"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          size="lg"
          className="h-12 px-6 text-base"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save payment"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 px-6 text-base"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
