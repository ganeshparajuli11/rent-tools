import { z } from "zod";

/**
 * Shared Zod building blocks. Feature schemas reuse these.
 * Error messages are short and plain so they are easy to read on a phone.
 */

export const emailSchema = z
  .string({ error: "Enter your email address" })
  .trim()
  .toLowerCase()
  .min(1, { error: "Enter your email address" })
  .max(254, { error: "That email address is too long" })
  .pipe(
    z.email({ error: "Enter a valid email address, like name@example.com" }),
  );

/** Text that must be filled in. `message` is shown when it is empty. */
export const requiredText = (message: string, max = 200) =>
  z
    .string({ error: message })
    .trim()
    .min(1, { error: message })
    .max(max, { error: `Please use ${max} characters or fewer` });

/** Text that may be left empty. Empty becomes null. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, { error: `Please use ${max} characters or fewer` })
    .optional()
    .transform((value) => (value ? value : null));
