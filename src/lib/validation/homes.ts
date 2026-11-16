import { z } from "zod";

import { poundsToPence } from "@/lib/money";
import { normalisePostcode } from "@/lib/postcode";

import { optionalText, requiredText } from "./common";

/**
 * Shared schemas for homes (database: properties) and rooms.
 * The SAME schemas run in the browser (React Hook Form) and in server actions.
 * Form values are strings (what inputs give us); the output is clean data:
 * trimmed text, a normalised postcode, whole pence, numbers.
 */

export const MAX_ROOMS = 30;

export const postcodeSchema = z
  .string({ error: "Enter the postcode" })
  .trim()
  .min(1, { error: "Enter the postcode" })
  .transform((value, ctx) => {
    const normalised = normalisePostcode(value);
    if (!normalised) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a real UK postcode, like SW1A 1AA",
      });
      return z.NEVER;
    }
    return normalised;
  });

/** Money typed in pounds ("650" or "650.50"), output as integer pence. */
export const poundsSchema = (emptyMessage: string) =>
  z
    .string({ error: emptyMessage })
    .trim()
    .min(1, { error: emptyMessage })
    .transform((value, ctx) => {
      const pence = poundsToPence(value);
      if (pence === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter an amount in pounds, like 650 or 650.50",
        });
        return z.NEVER;
      }
      return pence;
    });

export const dueDaySchema = z
  .string({ error: "Choose the day it is due" })
  .trim()
  .min(1, { error: "Choose the day it is due" })
  .regex(/^\d{1,2}$/, { error: "Choose a day between 1 and 28" })
  .transform(Number)
  .refine((day) => day >= 1 && day <= 28, {
    error: "Choose a day between 1 and 28",
  });

export const roomCountSchema = z
  .string({ error: "Enter how many rooms" })
  .trim()
  .min(1, { error: "Enter how many rooms" })
  .regex(/^\d{1,2}$/, { error: `Enter a number from 1 to ${MAX_ROOMS}` })
  .transform(Number)
  .refine((count) => count >= 1 && count <= MAX_ROOMS, {
    error: `Enter a number from 1 to ${MAX_ROOMS}`,
  });

export const roomNameSchema = requiredText("Enter a name for the room", 100);

export const LET_TYPES = ["whole_home", "by_room"] as const;
export type LetType = (typeof LET_TYPES)[number];

// --- Field groups (one per step of "Add a home") ----------------------------

const detailsShape = {
  name: requiredText("Enter a name for the home, like 12 Oak Road", 100),
  addressLine1: requiredText("Enter the first line of the address"),
  addressLine2: optionalText(),
  city: optionalText(100),
  postcode: postcodeSchema,
};

/** Step 2 fields. roomCount is only checked when letting by the room. */
const letShape = {
  letType: z.enum(LET_TYPES, {
    error: "Choose how you let this home",
  }),
  roomCount: z.string().optional(),
};

/** Step 3 fields. Owner fields are only checked when hasOwner is "yes". */
const ownerShape = {
  hasOwner: z.enum(["yes", "no"], {
    error: "Choose yes or no",
  }),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerRent: z.string().optional(),
  ownerDueDay: z.string().optional(),
};

type Ctx = z.RefinementCtx;

/** Adds a field error from a sub-schema, so messages stay in one place. */
function check<T extends z.ZodType>(
  schema: T,
  value: unknown,
  path: string,
  ctx: Ctx,
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

const ownerNameSchema = requiredText("Enter the owner's name", 200);
const ownerPhoneSchema = optionalText(40);

type HomeFormFields = z.infer<z.ZodObject<typeof letShape & typeof ownerShape>>;

function refineHome(
  value: HomeFormFields,
  ctx: Ctx,
  { roomCountRequired }: { roomCountRequired: boolean },
) {
  const roomCount =
    value.letType === "by_room" && roomCountRequired
      ? check(roomCountSchema, value.roomCount, "roomCount", ctx)
      : undefined;

  let owner: {
    name: string;
    phone: string | null;
    rentPence: number;
    dueDay: number;
  } | null = null;

  if (value.hasOwner === "yes") {
    const name = check(ownerNameSchema, value.ownerName, "ownerName", ctx);
    const phone = check(ownerPhoneSchema, value.ownerPhone, "ownerPhone", ctx);
    const rentPence = check(
      poundsSchema("Enter the monthly rent you pay the owner"),
      value.ownerRent,
      "ownerRent",
      ctx,
    );
    const dueDay = check(dueDaySchema, value.ownerDueDay, "ownerDueDay", ctx);
    if (
      name !== undefined &&
      phone !== undefined &&
      rentPence !== undefined &&
      dueDay !== undefined
    ) {
      owner = { name, phone, rentPence, dueDay };
    }
  }

  return { roomCount: roomCount ?? null, owner };
}

/** "Add a home": all three steps. */
export const createHomeSchema = z
  .object({ ...detailsShape, ...letShape, ...ownerShape })
  .transform((value, ctx) => {
    const { roomCount, owner } = refineHome(value, ctx, {
      roomCountRequired: true,
    });
    return {
      name: value.name,
      addressLine1: value.addressLine1,
      addressLine2: value.addressLine2,
      city: value.city,
      postcode: value.postcode,
      letType: value.letType,
      roomCount,
      owner,
    };
  });

/**
 * "Edit home": the same fields on one page. roomCount is only needed when
 * switching a home with no rooms to "by the room"; the server decides that,
 * so here it is checked only if filled in.
 */
export const updateHomeSchema = z
  .object({ ...detailsShape, ...letShape, ...ownerShape })
  .transform((value, ctx) => {
    const { roomCount, owner } = refineHome(value, ctx, {
      roomCountRequired: Boolean(value.roomCount?.trim()),
    });
    return {
      name: value.name,
      addressLine1: value.addressLine1,
      addressLine2: value.addressLine2,
      city: value.city,
      postcode: value.postcode,
      letType: value.letType,
      roomCount,
      owner,
    };
  });

/** Field names for each step of "Add a home", used to validate one step at a time. */
export const HOME_STEP_FIELDS = {
  1: ["name", "addressLine1", "addressLine2", "city", "postcode"],
  2: ["letType", "roomCount"],
  3: ["hasOwner", "ownerName", "ownerPhone", "ownerRent", "ownerDueDay"],
} as const;

export const idSchema = z.uuid({ error: "That item could not be found" });

export const renameRoomSchema = z.object({
  roomId: idSchema,
  name: roomNameSchema,
});

export type CreateHomeInput = z.input<typeof createHomeSchema>;
export type CreateHomeValues = z.output<typeof createHomeSchema>;
export type UpdateHomeInput = z.input<typeof updateHomeSchema>;
export type UpdateHomeValues = z.output<typeof updateHomeSchema>;
