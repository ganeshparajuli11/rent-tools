import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  changeMemberRoleSchema,
  inviteMemberSchema,
  MEMBER_ROLE_OPTIONS,
  MEMBER_ROLES,
  removeMemberSchema,
  transferOwnershipSchema,
} from "./members";

const ID = "4b0f5c1e-6a7d-4e2b-9c1f-0a1b2c3d4e5f";

describe("inviteMemberSchema", () => {
  it("tidies the email and keeps the role", () => {
    expect(
      inviteMemberSchema.parse({
        email: "  Taylor.Example@Example.com ",
        role: "manager",
      }),
    ).toEqual({ email: "taylor.example@example.com", role: "manager" });
  });

  it("never invites an owner, or an unknown role", () => {
    for (const role of ["owner", "superadmin", "", undefined]) {
      expect(
        inviteMemberSchema.safeParse({ email: "a@example.com", role }).success,
        String(role),
      ).toBe(false);
    }
  });

  it("drops anything else sent with it, like an organisation id", () => {
    expect(
      inviteMemberSchema.parse({
        email: "a@example.com",
        role: "staff",
        organisationId: ID,
      }),
    ).toEqual({ email: "a@example.com", role: "staff" });
  });

  it("refuses an email address that is not valid", () => {
    const result = inviteMemberSchema.safeParse({
      email: "not-an-email",
      role: "staff",
    });
    expect(result.success).toBe(false);
  });
});

describe("member role options", () => {
  it("lists the three roles someone can be given, highest first", () => {
    expect(MEMBER_ROLE_OPTIONS.map((option) => option.value)).toEqual([
      ...MEMBER_ROLES,
    ]);
  });
});

describe("changeMemberRoleSchema", () => {
  it("needs a membership id and a role other than owner", () => {
    expect(
      changeMemberRoleSchema.safeParse({ membershipId: ID, role: "admin" })
        .success,
    ).toBe(true);
    expect(
      changeMemberRoleSchema.safeParse({ membershipId: ID, role: "owner" })
        .success,
    ).toBe(false);
    expect(
      changeMemberRoleSchema.safeParse({ membershipId: "1", role: "staff" })
        .success,
    ).toBe(false);
  });
});

describe("removeMemberSchema", () => {
  it("needs confirm: true", () => {
    expect(
      removeMemberSchema.safeParse({ membershipId: ID, confirm: true }).success,
    ).toBe(true);
    for (const confirm of [false, "true", 1, undefined]) {
      expect(
        removeMemberSchema.safeParse({ membershipId: ID, confirm }).success,
      ).toBe(false);
    }
  });
});

describe("transferOwnershipSchema", () => {
  it("needs the organisation's name typed", () => {
    expect(
      transferOwnershipSchema.safeParse({ membershipId: ID, confirmName: " " })
        .success,
    ).toBe(false);
    expect(
      transferOwnershipSchema.parse({
        membershipId: ID,
        confirmName: " Demo Lettings ",
      }),
    ).toEqual({ membershipId: ID, confirmName: "Demo Lettings" });
  });
});

describe("acceptInvitationSchema", () => {
  it("takes an optional name; empty becomes null", () => {
    expect(
      acceptInvitationSchema.parse({ invitationId: ID, fullName: "  " }),
    ).toEqual({ invitationId: ID, fullName: null });
    expect(
      acceptInvitationSchema.parse({
        invitationId: ID,
        fullName: "Taylor Example",
      }),
    ).toEqual({ invitationId: ID, fullName: "Taylor Example" });
  });
});
