import { z } from "zod";

import { poundsSchema } from "./homes";

/**
 * Shared schema for the "Other amount" form on the rent page.
 * The SAME schema runs in the browser (React Hook Form) and in the server
 * action. The form value is what was typed in pounds; the output is whole
 * pence.
 */
export const otherAmountSchema = z
  .object({
    amount: poundsSchema("Enter the amount they paid").refine(
      (pence) => pence > 0,
      { error: "Enter an amount more than £0" },
    ),
  })
  .transform((value) => ({ amountPence: value.amount }));

export type OtherAmountInput = z.input<typeof otherAmountSchema>;
export type OtherAmountValues = z.output<typeof otherAmountSchema>;
