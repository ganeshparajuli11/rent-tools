import { describe, expect, it } from "vitest";

import {
  ACCOUNT_TYPE_OPTIONS,
  ACCOUNT_TYPES,
  organisationSetupSchema,
  switchOrganisationSchema,
} from "./organisation";

const valid = {
  fullName: "  Taylor Example ",
  organisationName: " Demo Lettings ",
  accountType: "property_manager",
  contactEmail: " Hello@Example.com ",
};

describe("organisationSetupSchema", () => {
  it("accepts a complete answer and tidies it", () => {
    expect(organisationSetupSchema.parse(valid)).toEqual({
      fullName: "Taylor Example",
      organisationName: "Demo Lettings",
      accountType: "property_manager",
      contactEmail: "hello@example.com",
    });
  });

  it("accepts both account types and nothing else", () => {
    for (const accountType of ACCOUNT_TYPES) {
      expect(
        organisationSetupSchema.safeParse({ ...valid, accountType }).success,
      ).toBe(true);
    }
    for (const accountType of ["tenant", "", null, undefined, "Landlord"]) {
      const result = organisationSetupSchema.safeParse({
        ...valid,
        accountType,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Choose the kind of account",
      );
    }
  });

  it("asks for every field in plain words", () => {
    const result = organisationSetupSchema.safeParse({
      fullName: " ",
      organisationName: "",
      accountType: "landlord",
      contactEmail: "",
    });
    expect(result.success).toBe(false);
    // The first message for each field, as the form shows it.
    const messages: Record<string, string> = {};
    for (const issue of result.error?.issues ?? []) {
      messages[String(issue.path[0])] ??= issue.message;
    }
    expect(messages).toEqual({
      fullName: "Enter your full name",
      organisationName: "Enter a name for your organisation",
      contactEmail: "Enter your email address",
    });
  });

  it("refuses an email address that is not one, and over-long names", () => {
    expect(
      organisationSetupSchema.safeParse({ ...valid, contactEmail: "not-email" })
        .success,
    ).toBe(false);
    expect(
      organisationSetupSchema.safeParse({
        ...valid,
        organisationName: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      organisationSetupSchema.safeParse({
        ...valid,
        fullName: "x".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("drops anything else sent with it, such as an organisation or user id", () => {
    expect(
      organisationSetupSchema.parse({
        ...valid,
        organisationId: "someone-else",
        userId: "someone-else",
        role: "owner",
      }),
    ).not.toHaveProperty("organisationId");
  });

  it("offers one choice per account type", () => {
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      ...ACCOUNT_TYPES,
    ]);
  });
});

describe("switchOrganisationSchema", () => {
  const id = "22222222-2222-4222-8222-222222222222";

  it("accepts an organisation id", () => {
    expect(switchOrganisationSchema.parse({ organisationId: id })).toEqual({
      organisationId: id,
    });
  });

  it("refuses anything that is not an id", () => {
    for (const organisationId of ["", "first", 4, null, undefined]) {
      expect(
        switchOrganisationSchema.safeParse({ organisationId }).success,
        String(organisationId),
      ).toBe(false);
    }
  });

  it("drops anything else sent with it, such as a role", () => {
    expect(
      switchOrganisationSchema.parse({ organisationId: id, role: "owner" }),
    ).not.toHaveProperty("role");
  });
});
