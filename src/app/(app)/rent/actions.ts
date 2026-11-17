"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { idSchema } from "@/lib/validation/homes";
import { otherAmountSchema } from "@/lib/validation/rent";
import * as rent from "@/server/rent";
import { invalidInput, runAction } from "@/server/run-action";

/**
 * Server actions for the rent page. Each one:
 *  1. validates input with a shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with the
 *     user's own client (RLS applies). The data function derives the
 *     organisation on the server and writes audit_log.
 */

const RENT_NOT_FOUND = "We could not find that rent. Please refresh the page.";
const PAYMENT_NOT_FOUND =
  "We could not find that payment. Please refresh the page.";

type PaymentResult = { paymentId: string; amountPence: number };

function refresh() {
  revalidatePath("/rent");
  revalidatePath("/dashboard");
}

/** One-tap "Mark as paid": records whatever is left for that month. */
export async function markRentPaidAction(
  chargeId: unknown,
): Promise<ActionResult<PaymentResult>> {
  const id = idSchema.safeParse(chargeId);
  if (!id.success) return { ok: false, error: RENT_NOT_FOUND };

  const result = await runAction("rent", "markRentPaid", (ctx) =>
    rent.recordPayment(ctx, id.data, "rest"),
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    data: {
      paymentId: result.data.paymentId,
      amountPence: result.data.amountPence,
    },
  };
}

/** "Other amount": a part payment typed in pounds. */
export async function recordPaymentAction(
  chargeId: unknown,
  input: unknown,
): Promise<ActionResult<PaymentResult>> {
  const id = idSchema.safeParse(chargeId);
  if (!id.success) return { ok: false, error: RENT_NOT_FOUND };
  const parsed = otherAmountSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("rent", "recordPayment", (ctx) =>
    rent.recordPayment(ctx, id.data, parsed.data.amountPence),
  );
  if (!result.ok) return result;
  refresh();
  return {
    ok: true,
    data: {
      paymentId: result.data.paymentId,
      amountPence: result.data.amountPence,
    },
  };
}

/** "Remove" a payment (also the Undo for a payment just recorded). */
export async function removePaymentAction(
  paymentId: unknown,
): Promise<ActionResult<PaymentResult>> {
  const id = idSchema.safeParse(paymentId);
  if (!id.success) return { ok: false, error: PAYMENT_NOT_FOUND };

  const result = await runAction("rent", "removePayment", (ctx) =>
    rent.removePayment(ctx, id.data),
  );
  if (result.ok) refresh();
  return result;
}

/** Undo for "Remove": the payment counts again. */
export async function restorePaymentAction(
  paymentId: unknown,
): Promise<ActionResult<PaymentResult>> {
  const id = idSchema.safeParse(paymentId);
  if (!id.success) return { ok: false, error: PAYMENT_NOT_FOUND };

  const result = await runAction("rent", "restorePayment", (ctx) =>
    rent.restorePayment(ctx, id.data),
  );
  if (result.ok) refresh();
  return result;
}
