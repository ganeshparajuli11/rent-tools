import { z } from "zod";

import { emailSchema, requiredText } from "./common";

/**
 * Shared schema for setting up an organisation (the /setup screen, roadmap
 * B2): the person's own name, then the organisation's name, account type
 * and contact email. The database function `create_organisation` checks
 * the same things again.
 */

/** The answer when the person already has an organisation. */
export const ALREADY_SET_UP = "Your organisation is already set up.";

export const ACCOUNT_TYPES = ["landlord", "property_manager"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** The choices on the set-up screen, in plain words. */
export const ACCOUNT_TYPE_OPTIONS: {
  value: AccountType;
  label: string;
  description: string;
}[] = [
  {
    value: "landlord",
    label: "Landlord",
    description: "You let homes you own.",
  },
  {
    value: "property_manager",
    label: "Property manager",
    description:
      "You manage homes for owners, or rent homes from owners and let them by the room.",
  },
];

export const organisationSetupSchema = z.object({
  fullName: requiredText("Enter your full name"),
  organisationName: requiredText("Enter a name for your organisation"),
  accountType: z.enum(ACCOUNT_TYPES, {
    error: "Choose the kind of account",
  }),
  contactEmail: emailSchema,
});

export type OrganisationSetupInput = z.input<typeof organisationSetupSchema>;
export type OrganisationSetupValues = z.output<typeof organisationSetupSchema>;
