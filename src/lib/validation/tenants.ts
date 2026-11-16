import { z } from "zod";

import { addYears, isValidDateString, todayInLondon } from "@/lib/dates";

import { emailSchema, optionalText, requiredText } from "./common";
import { dueDaySchema, idSchema, poundsSchema } from "./homes";

/**
 * Shared schemas for tenants (database: tenancies).
 * The SAME schemas run in the browser (React Hook Form) and in server actions.
 * Form values are strings; the output is clean data: trimmed text, whole
 * pence, a day number and a "YYYY-MM-DD" date.
 */

/** Move-in dates can be up to this many years back or one year ahead. */
export const MAX_YEARS_BACK = 50;

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message:
          result.error.issues[0]?.message ?? "Enter a valid email address",
      });
      return z.NEVER;
    }
    return result.data;
  });

/** A deposit is optional. Left empty, it is stored as £0. */
const optionalPounds = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return 0;
    const result = poundsSchema("Enter the deposit").safeParse(value);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message:
          result.error.issues[0]?.message ??
          "Enter an amount in pounds, like 650 or 650.50",
      });
      return z.NEVER;
    }
    return result.data;
  });

/** Move-in date as "YYYY-MM-DD" (what a date input gives us). */
export const startDateSchema = z
  .string({ error: "Enter the date they moved in" })
  .trim()
  .min(1, { error: "Enter the date they moved in" })
  .refine(isValidDateString, {
    error: "Enter a real date, like 5 January 2026",
  })
  .refine(
    (value) =>
      !isValidDateString(value) || value <= addYears(todayInLondon(), 1),
    { error: "That date is too far ahead. Choose a date in the next year." },
  )
  .refine(
    (value) =>
      !isValidDateString(value) ||
      value >= addYears(todayInLondon(), -MAX_YEARS_BACK),
    { error: "That date is too long ago. Check the year." },
  );

/** Add or edit a tenant: contact details, rent, and an optional deposit. */
export const tenantSchema = z
  .object({
    name: requiredText("Enter the tenant's name"),
    phone: optionalText(40),
    email: optionalEmail,
    rent: poundsSchema("Enter the rent they pay each month"),
    dueDay: dueDaySchema,
    startDate: startDateSchema,
    deposit: optionalPounds,
  })
  .transform((value) => ({
    name: value.name,
    phone: value.phone,
    email: value.email,
    rentPence: value.rent,
    dueDay: value.dueDay,
    startDate: value.startDate,
    depositPence: value.deposit,
  }));

/** Field names for each step of "Add a tenant". */
export const TENANT_STEP_FIELDS = {
  1: ["name", "phone", "email"],
  2: ["rent", "dueDay", "startDate"],
  3: ["deposit"],
} as const;

/** Where the tenant lives: a home, and a room when the home is let by room. */
export const tenantPlaceSchema = z.object({
  homeId: idSchema,
  roomId: idSchema.nullable(),
});

export type TenantInput = z.input<typeof tenantSchema>;
export type TenantValues = z.output<typeof tenantSchema>;
export type TenantPlace = z.output<typeof tenantPlaceSchema>;
