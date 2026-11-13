import { z } from "zod";

/**
 * Shared Zod building blocks. Feature schemas (property, room, tenancy...)
 * will live next to this file and reuse these.
 * Error messages are short and plain so they are easy to read on a phone.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const passwordSchema = z
  .string()
  .min(8, { error: "Use at least 8 characters" })
  .max(72, { error: "Use 72 characters or fewer" });
