import { z } from "zod";

import { emailSchema, optionalText, requiredText } from "./common";

/**
 * Shared schemas for Settings › Members and invitations (roadmap B4).
 * The database checks the same things again: the invitations table only
 * takes these roles, and accept_invitation / transfer_ownership check who
 * is calling from the session.
 */

/**
 * The roles someone can be invited with or changed to. Never "owner":
 * ownership only moves through the transfer, which needs its own confirm.
 */
export const MEMBER_ROLES = ["admin", "manager", "staff"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

/** The role choices, highest first, in plain words. */
export const MEMBER_ROLE_OPTIONS: {
  value: MemberRole;
  label: string;
  description: string;
}[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Runs everything and manages members, but not the owner.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Adds and changes homes, tenants and rent.",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Sees everything and records rent payments.",
  },
];

const memberRole = z.enum(MEMBER_ROLES, { error: "Choose a role" });

const membershipId = z.uuid({ error: "We could not find that person." });

const invitationId = z.uuid({ error: "We could not find that invitation." });

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: memberRole,
});

export type InviteMemberInput = z.input<typeof inviteMemberSchema>;
export type InviteMemberValues = z.output<typeof inviteMemberSchema>;

export const changeMemberRoleSchema = z.object({
  membershipId,
  role: memberRole,
});

export const removeMemberSchema = z.object({
  membershipId,
  // Removing someone is confirmed on the page first.
  confirm: z.literal(true, {
    error: "Please confirm that you want to remove them.",
  }),
});

export const invitationIdSchema = z.object({ invitationId });

export const transferOwnershipSchema = z.object({
  membershipId,
  confirmName: requiredText("Type the organisation's name to confirm"),
});

export type TransferOwnershipInput = z.input<typeof transferOwnershipSchema>;

export const acceptInvitationSchema = z.object({
  invitationId,
  // Only asked for when the person has not given their name yet.
  fullName: optionalText(),
});

/** `/invite/<token>`: the token from the link, before it is looked up. */
export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{32,128}$/, { error: "That link is not valid." });
