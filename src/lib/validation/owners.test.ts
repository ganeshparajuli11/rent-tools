import { describe, expect, it } from "vitest";

import {
  EMPTY_OWNER_FORM,
  optionalHomeIdSchema,
  ownerLinkSchema,
  ownerSchema,
  type OwnerInput,
} from "./owners";

const person: OwnerInput = {
  ...EMPTY_OWNER_FORM,
  fullName: "  Taylor Example ",
  phone: " 07700 900123 ",
};

const HOME_ID = "4b7c1d2e-8f90-4a1b-9c2d-3e4f5a6b7c8d";
const OWNER_ID = "0f1e2d3c-4b5a-4968-8776-655443322110";

function errorsOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      issue.path.join("."),
      issue.message,
    ]),
  );
}

describe("ownerSchema", () => {
  it("cleans up a person with only a name and phone", () => {
    expect(ownerSchema.parse(person)).toEqual({
      ownerType: "individual",
      fullName: "Taylor Example",
      companyName: null,
      email: null,
      phone: "07700 900123",
      addressLine1: null,
      addressLine2: null,
      city: null,
      postcode: null,
      notes: null,
    });
  });

  it("needs a person's name", () => {
    const result = ownerSchema.safeParse({ ...person, fullName: "  " });
    expect(errorsOf(result)).toEqual({ fullName: "Enter the owner's name" });
  });

  it("needs a company's name, but not a contact name", () => {
    const missing = ownerSchema.safeParse({
      ...EMPTY_OWNER_FORM,
      ownerType: "company",
    });
    expect(errorsOf(missing)).toEqual({
      companyName: "Enter the company's name",
    });

    const company = ownerSchema.parse({
      ...EMPTY_OWNER_FORM,
      ownerType: "company",
      companyName: " Demo Estates Ltd ",
    });
    expect(company.companyName).toBe("Demo Estates Ltd");
    expect(company.fullName).toBeNull();
  });

  it("keeps a company's contact name", () => {
    const company = ownerSchema.parse({
      ...EMPTY_OWNER_FORM,
      ownerType: "company",
      companyName: "Demo Estates Ltd",
      fullName: "Sam Sample",
    });
    expect(company.fullName).toBe("Sam Sample");
  });

  it("drops a company name typed for a person", () => {
    const result = ownerSchema.parse({ ...person, companyName: "Old Ltd" });
    expect(result.companyName).toBeNull();
  });

  it("checks an email only when one is typed, and lowercases it", () => {
    expect(
      ownerSchema.parse({ ...person, email: " Taylor@Example.COM " }).email,
    ).toBe("taylor@example.com");
    const bad = ownerSchema.safeParse({ ...person, email: "not an email" });
    expect(errorsOf(bad)).toEqual({
      email: "Enter a valid email address, like name@example.com",
    });
  });

  it("normalises an optional postcode and refuses a made-up one", () => {
    expect(ownerSchema.parse({ ...person, postcode: "ls61aa" }).postcode).toBe(
      "LS6 1AA",
    );
    const bad = ownerSchema.safeParse({ ...person, postcode: "12345" });
    expect(errorsOf(bad)).toEqual({
      postcode: "Enter a real UK postcode, like SW1A 1AA",
    });
  });

  it("limits the notes", () => {
    const result = ownerSchema.safeParse({
      ...person,
      notes: "x".repeat(2001),
    });
    expect(errorsOf(result)).toEqual({
      notes: "Please use 2000 characters or fewer",
    });
  });

  it("refuses an unknown owner type", () => {
    const result = ownerSchema.safeParse({ ...person, ownerType: "trust" });
    expect(errorsOf(result)).toEqual({
      ownerType: "Choose a person or a company",
    });
  });
});

describe("ownerLinkSchema", () => {
  it("needs a home id and an owner id", () => {
    expect(
      ownerLinkSchema.parse({ homeId: HOME_ID, ownerId: OWNER_ID }),
    ).toEqual({ homeId: HOME_ID, ownerId: OWNER_ID });
    expect(
      ownerLinkSchema.safeParse({ homeId: HOME_ID, ownerId: "nope" }).success,
    ).toBe(false);
  });
});

describe("optionalHomeIdSchema", () => {
  it("turns empty into null and keeps a real id", () => {
    expect(optionalHomeIdSchema.parse("")).toBeNull();
    expect(optionalHomeIdSchema.parse(undefined)).toBeNull();
    expect(optionalHomeIdSchema.parse(HOME_ID)).toBe(HOME_ID);
    expect(optionalHomeIdSchema.safeParse("../homes").success).toBe(false);
  });
});
