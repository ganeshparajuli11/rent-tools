import { describe, expect, it } from "vitest";

import { accountTypeLabel, firstNameOf, initialsOf, roleLabel } from "./people";

describe("initialsOf", () => {
  it("takes the first and last word's first letters", () => {
    expect(initialsOf("Demo Lettings")).toBe("DL");
    expect(initialsOf("Taylor Sam Example")).toBe("TE");
  });

  it("uses the part of an email address before the @", () => {
    expect(initialsOf("taylor.example@example.com")).toBe("TE");
    expect(initialsOf("alex@example.com")).toBe("AL");
  });

  it("copes with a single short word, symbols and empty text", () => {
    expect(initialsOf("a")).toBe("A");
    expect(initialsOf("  --  ")).toBe("?");
    expect(initialsOf("")).toBe("?");
  });
});

describe("roleLabel", () => {
  it("names every role", () => {
    expect(roleLabel("owner")).toBe("Owner");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("manager")).toBe("Manager");
    expect(roleLabel("staff")).toBe("Staff");
  });

  it("falls back to Member", () => {
    expect(roleLabel("something-else")).toBe("Member");
  });
});

describe("accountTypeLabel", () => {
  it("names both account types", () => {
    expect(accountTypeLabel("landlord")).toBe("Landlord");
    expect(accountTypeLabel("property_manager")).toBe("Property manager");
  });

  it("is Property manager when missing or unknown (D-5)", () => {
    expect(accountTypeLabel(undefined)).toBe("Property manager");
    expect(accountTypeLabel(null)).toBe("Property manager");
    expect(accountTypeLabel("unknown")).toBe("Property manager");
  });
});

describe("firstNameOf", () => {
  it("takes the first word of a full name", () => {
    expect(firstNameOf("Taylor Example")).toBe("Taylor");
    expect(firstNameOf("  Sam   Sample  ")).toBe("Sam");
    expect(firstNameOf("Alex")).toBe("Alex");
  });

  it("is null when there is no name", () => {
    expect(firstNameOf(null)).toBe(null);
    expect(firstNameOf(undefined)).toBe(null);
    expect(firstNameOf("   ")).toBe(null);
  });
});
