import { z } from "zod";

import { normalisePostcode } from "@/lib/postcode";

import { emailSchema, optionalText, requiredText } from "./common";
import { idSchema } from "./homes";

/**
 * Shared schemas for owner records (database: property_owners) and the
 * links between owners and homes (property_owner_links). The SAME schemas
 * run in the browser (React Hook Form) and in server actions.
 *
 * An owner is a person or a company. A person needs their name; a company
 * needs its company name, and the name of a contact there is optional.
 * Everything else is optional: collect only what the work needs.
 */

export const OWNER_TYPES = ["individual", "company"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const MAX_OWNER_NOTES = 2000;

const fullNameSchema = requiredText("Enter the owner's name", 200);
const companyNameSchema = requiredText("Enter the company's name", 200);
const contactNameSchema = optionalText(200);

/** Optional email: empty is fine, anything else must look like an email. */
const optionalEmailSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const text = value?.trim() ?? "";
    if (!text) return null;
    const result = emailSchema.safeParse(text);
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

/** Optional UK postcode: empty is fine, anything else is normalised. */
const optionalPostcodeSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const text = value?.trim() ?? "";
    if (!text) return null;
    const normalised = normalisePostcode(text);
    if (!normalised) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a real UK postcode, like SW1A 1AA",
      });
      return z.NEVER;
    }
    return normalised;
  });

/** Adds a field error from a sub-schema, so messages stay in one place. */
function check<T extends z.ZodType>(
  schema: T,
  value: unknown,
  path: string,
  ctx: z.RefinementCtx,
): z.output<T> | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: result.error.issues[0]?.message ?? "Check this answer",
    });
    return undefined;
  }
  return result.data;
}

/** "Add an owner" and "Edit owner". */
export const ownerSchema = z
  .object({
    ownerType: z.enum(OWNER_TYPES, {
      error: "Choose a person or a company",
    }),
    fullName: z.string().optional(),
    companyName: z.string().optional(),
    email: optionalEmailSchema,
    phone: optionalText(40),
    addressLine1: optionalText(200),
    addressLine2: optionalText(200),
    city: optionalText(100),
    postcode: optionalPostcodeSchema,
    notes: optionalText(MAX_OWNER_NOTES),
  })
  .transform((value, ctx) => {
    const company = value.ownerType === "company";
    const fullName = company
      ? check(contactNameSchema, value.fullName, "fullName", ctx)
      : check(fullNameSchema, value.fullName, "fullName", ctx);
    const companyName = company
      ? check(companyNameSchema, value.companyName, "companyName", ctx)
      : null;
    return {
      ownerType: value.ownerType,
      fullName: fullName ?? null,
      companyName: companyName ?? null,
      email: value.email,
      phone: value.phone,
      addressLine1: value.addressLine1,
      addressLine2: value.addressLine2,
      city: value.city,
      postcode: value.postcode,
      notes: value.notes,
    };
  });

export type OwnerInput = z.input<typeof ownerSchema>;
export type OwnerValues = z.output<typeof ownerSchema>;

export const EMPTY_OWNER_FORM: OwnerInput = {
  ownerType: "individual",
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  notes: "",
};

/** Link an owner to a home, or unlink them. */
export const ownerLinkSchema = z.object({
  homeId: idSchema,
  ownerId: idSchema,
});

export type OwnerLink = z.output<typeof ownerLinkSchema>;

/** "Add an owner" opened from a home: link the new owner to it. */
export const optionalHomeIdSchema = z
  .union([z.literal(""), idSchema])
  .optional()
  .transform((value) => (value ? value : null));
