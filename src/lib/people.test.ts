import { describe, expect, it } from "vitest";

import { accountTypeLabel, initialsOf, roleLabel } from "./people";

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

  it("is Property manager until account types are stored (D-5)", () => {
    expect(accountTypeLabel(undefined)).toBe("Property manager");
    expect(accountTypeLabel(null)).toBe("Property manager");
    expect(accountTypeLabel("unknown")).toBe("Property manager");
  });
});
