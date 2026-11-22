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

/**
 * Rules for a new password. Long passphrases are welcome; no rules about
 * symbols or capitals (people pick weaker passwords to satisfy them).
 * 72 is the most Supabase Auth (bcrypt) uses.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export const newPasswordField = z
  .string({ error: "Choose a password" })
  .min(1, { error: "Choose a password" })
  .min(MIN_PASSWORD_LENGTH, {
    error: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
  })
  .max(MAX_PASSWORD_LENGTH, {
    error: `Use ${MAX_PASSWORD_LENGTH} characters or fewer`,
  });

/** Sign in with an email and password. Any length is checked by Supabase. */
export const passwordSignInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Enter your password" })
    .min(1, { error: "Enter your password" })
    .max(200, { error: "That password is too long" }),
});

/** Create an account with an email and a new password. */
export const signUpSchema = z.object({
  email: emailSchema,
  password: newPasswordField,
});

/** "Forgot your password?": the email to send a reset link to. */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/** Choose a new password after following the reset link. */
export const newPasswordSchema = z
  .object({
    password: newPasswordField,
    confirm: z.string({ error: "Type the new password again" }),
  })
  .refine((values) => values.confirm === values.password, {
    error: "The two passwords are not the same",
    path: ["confirm"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
