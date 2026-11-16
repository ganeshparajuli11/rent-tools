import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tenantPlaceSchema, tenantSchema, type TenantInput } from "./tenants";

const base: TenantInput = {
  name: "  Amira Khan ",
  phone: " 07700 900123 ",
  email: " Amira@Example.com ",
  rent: "550",
  dueDay: "5",
  startDate: "2026-01-05",
  deposit: "",
};

/** The first message for each field, which is the one the form shows. */
function errorsOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

describe("tenantSchema", () => {
  // "Today" is fixed so the move-in date limits are the same on every run.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cleans up a tenant with no deposit", () => {
    expect(tenantSchema.parse(base)).toEqual({
      name: "Amira Khan",
      phone: "07700 900123",
      email: "amira@example.com",
      rentPence: 55_000,
      dueDay: 5,
      startDate: "2026-01-05",
      depositPence: 0,
    });
  });

  it("only needs a name, rent, due day and move-in date", () => {
    expect(
      tenantSchema.parse({ ...base, phone: "", email: "", deposit: "" }),
    ).toMatchObject({ phone: null, email: null, depositPence: 0 });
  });

  it("turns pounds into whole pence without rounding errors", () => {
    expect(
      tenantSchema.parse({ ...base, rent: "£1,250.10", deposit: "600.5" }),
    ).toMatchObject({ rentPence: 125_010, depositPence: 60_050 });
  });

  it("asks for the name, rent, due day and move-in date", () => {
    const result = tenantSchema.safeParse({
      ...base,
      name: " ",
      rent: "",
      dueDay: "",
      startDate: "",
    });
    expect(result.success).toBe(false);
    expect(errorsOf(result)).toEqual({
      name: "Enter the tenant's name",
      rent: "Enter the rent they pay each month",
      dueDay: "Choose the day it is due",
      startDate: "Enter the date they moved in",
    });
  });

  it("rejects amounts that are not money", () => {
    for (const rent of ["abc", "-5", "12.345", "1e3"]) {
      const result = tenantSchema.safeParse({ ...base, rent });
      expect(errorsOf(result).rent).toBe(
        "Enter an amount in pounds, like 650 or 650.50",
      );
    }
    expect(
      errorsOf(tenantSchema.safeParse({ ...base, deposit: "lots" })).deposit,
    ).toBe("Enter an amount in pounds, like 650 or 650.50");
  });

  it("only allows due days from 1 to 28", () => {
    for (const dueDay of ["0", "29", "31", "x"]) {
      expect(errorsOf(tenantSchema.safeParse({ ...base, dueDay })).dueDay).toBe(
        "Choose a day between 1 and 28",
      );
    }
    expect(tenantSchema.parse({ ...base, dueDay: "28" }).dueDay).toBe(28);
  });

  it("rejects an email that is not an email", () => {
    expect(
      errorsOf(tenantSchema.safeParse({ ...base, email: "amira at home" }))
        .email,
    ).toBe("Enter a valid email address, like name@example.com");
  });

  it("rejects dates that do not exist", () => {
    for (const startDate of ["2026-02-30", "05/01/2026", "yesterday"]) {
      expect(
        errorsOf(tenantSchema.safeParse({ ...base, startDate })).startDate,
      ).toBe("Enter a real date, like 5 January 2026");
    }
  });

  it("allows a move-in date up to one year ahead, and no further", () => {
    expect(
      tenantSchema.parse({ ...base, startDate: "2027-11-16" }).startDate,
    ).toBe("2027-11-16");
    expect(
      errorsOf(tenantSchema.safeParse({ ...base, startDate: "2027-11-17" }))
        .startDate,
    ).toBe("That date is too far ahead. Choose a date in the next year.");
  });

  it("rejects a move-in date in the wrong century", () => {
    expect(
      errorsOf(tenantSchema.safeParse({ ...base, startDate: "0202-01-05" }))
        .startDate,
    ).toBe("That date is too long ago. Check the year.");
    expect(
      tenantSchema.parse({ ...base, startDate: "1976-11-16" }).startDate,
    ).toBe("1976-11-16");
  });

  it("limits how long the name and phone can be", () => {
    const result = tenantSchema.safeParse({
      ...base,
      name: "a".repeat(201),
      phone: "1".repeat(41),
    });
    expect(errorsOf(result)).toEqual({
      name: "Please use 200 characters or fewer",
      phone: "Please use 40 characters or fewer",
    });
  });
});

describe("tenantPlaceSchema", () => {
  const homeId = "0b8f6a52-6f0e-4a8e-9a43-6a1d7c5f2b10";
  const roomId = "5d0c9e1b-3a44-4f0b-8f43-0c2f6a6b7e21";

  it("accepts a home, with or without a room", () => {
    expect(tenantPlaceSchema.parse({ homeId, roomId })).toEqual({
      homeId,
      roomId,
    });
    expect(tenantPlaceSchema.parse({ homeId, roomId: null })).toEqual({
      homeId,
      roomId: null,
    });
  });

  it("rejects ids that are not ids", () => {
    expect(tenantPlaceSchema.safeParse({ homeId: "1", roomId }).success).toBe(
      false,
    );
    expect(
      tenantPlaceSchema.safeParse({ homeId, roomId: "room-1" }).success,
    ).toBe(false);
    expect(tenantPlaceSchema.safeParse({ roomId }).success).toBe(false);
  });
});
