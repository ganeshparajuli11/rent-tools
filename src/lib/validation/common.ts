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
