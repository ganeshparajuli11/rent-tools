import { z } from "zod";

import { emailSchema } from "./common";

/** Step 1: the person types their email to get a sign-in code. */
export const signInSchema = z.object({
  email: emailSchema,
});

/**
 * Step 2: the code from the email. Supabase sends 6 digits by default (the
 * length can be changed in the dashboard, so 6 to 10 digits are accepted).
 * Spaces are removed, because people often copy "123 456".
 */
export const verifyCodeSchema = z.object({
  code: z
    .string({ error: "Enter the code from your email" })
    .transform((value) => value.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .min(1, { error: "Enter the code from your email" })
        .regex(/^\d{6,10}$/, {
          error: "The code is the 6 numbers in the email we sent you",
        }),
    ),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
