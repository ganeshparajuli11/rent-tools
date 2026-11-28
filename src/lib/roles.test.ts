import { describe, expect, it } from "vitest";

import { hasRole, isRole, ROLES, roleTooLowMessage } from "./roles";

describe("isRole", () => {
  it("knows the four roles", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it("refuses anything else", () => {
    for (const value of ["", "Owner", "superadmin", "member", null, 4]) {
      expect(isRole(value)).toBe(false);
    }
  });
});

describe("hasRole", () => {
  // Rows: the person's role. Columns: the role an action needs.
  const table: [string, Record<(typeof ROLES)[number], boolean>][] = [
    ["owner", { owner: true, admin: true, manager: true, staff: true }],
    ["admin", { owner: false, admin: true, manager: true, staff: true }],
    ["manager", { owner: false, admin: false, manager: true, staff: true }],
    ["staff", { owner: false, admin: false, manager: false, staff: true }],
  ];

  it.each(table)("%s", (role, expected) => {
    for (const min of ROLES) {
      expect(hasRole(role, min), `${role} needs ${min}`).toBe(expected[min]);
    }
  });

  it("an unknown role is never enough, even for staff actions", () => {
    for (const role of ["", "superadmin", "OWNER", undefined, null]) {
      expect(hasRole(role, "staff")).toBe(false);
    }
  });
});

describe("roleTooLowMessage", () => {
  it("says plainly who can", () => {
    expect(roleTooLowMessage("owner")).toBe(
      "Only the account owner can do this.",
    );
    expect(roleTooLowMessage("admin")).toBe(
      "Only an owner or admin can do this.",
    );
    expect(roleTooLowMessage("manager")).toBe(
      "Only an owner, admin or manager can do this.",
    );
  });
});
