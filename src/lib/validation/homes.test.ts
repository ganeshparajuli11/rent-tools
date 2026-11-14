import { describe, expect, it } from "vitest";

import {
  createHomeSchema,
  renameRoomSchema,
  updateHomeSchema,
  type CreateHomeInput,
} from "./homes";

const base: CreateHomeInput = {
  name: " 12 Oak Road ",
  addressLine1: "12 Oak Road",
  addressLine2: "",
  city: "Leeds",
  postcode: "ls61aa",
  letType: "whole_home",
  roomCount: "",
  hasOwner: "no",
  ownerName: "",
  ownerPhone: "",
  ownerRent: "",
  ownerDueDay: "",
};

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

describe("createHomeSchema", () => {
  it("cleans up a whole-home let with no owner", () => {
    expect(createHomeSchema.parse(base)).toEqual({
      name: "12 Oak Road",
      addressLine1: "12 Oak Road",
      addressLine2: null,
      city: "Leeds",
      postcode: "LS6 1AA",
      letType: "whole_home",
      roomCount: null,
      owner: null,
    });
  });

  it("needs a room count when letting by the room", () => {
    const result = createHomeSchema.safeParse({ ...base, letType: "by_room" });
    expect(result.success).toBe(false);
    expect(errorsOf(result)).toEqual({ roomCount: "Enter how many rooms" });
  });

  it("accepts 1 to 30 rooms", () => {
    expect(
      createHomeSchema.parse({ ...base, letType: "by_room", roomCount: "4" })
        .roomCount,
    ).toBe(4);
    for (const bad of ["0", "31", "two", "1.5"]) {
      const result = createHomeSchema.safeParse({
        ...base,
        letType: "by_room",
        roomCount: bad,
      });
      expect(errorsOf(result).roomCount).toBe("Enter a number from 1 to 30");
    }
  });

  it("ignores room count for a whole-home let", () => {
    expect(
      createHomeSchema.parse({ ...base, roomCount: "abc" }).roomCount,
    ).toBeNull();
  });

  it("reads owner lease details in pounds and stores pence", () => {
    const result = createHomeSchema.parse({
      ...base,
      hasOwner: "yes",
      ownerName: " Mr Patel ",
      ownerPhone: "07700 900123",
      ownerRent: "650.50",
      ownerDueDay: "1",
    });
    expect(result.owner).toEqual({
      name: "Mr Patel",
      phone: "07700 900123",
      rentPence: 65_050,
      dueDay: 1,
    });
  });

  it("explains every missing owner field", () => {
    const result = createHomeSchema.safeParse({ ...base, hasOwner: "yes" });
    expect(errorsOf(result)).toEqual({
      ownerName: "Enter the owner's name",
      ownerRent: "Enter the monthly rent you pay the owner",
      ownerDueDay: "Choose the day it is due",
    });
  });

  it("rejects bad money and due days", () => {
    const result = createHomeSchema.safeParse({
      ...base,
      hasOwner: "yes",
      ownerName: "Owner",
      ownerRent: "six hundred",
      ownerDueDay: "29",
    });
    expect(errorsOf(result)).toEqual({
      ownerRent: "Enter an amount in pounds, like 650 or 650.50",
      ownerDueDay: "Choose a day between 1 and 28",
    });
  });

  it("requires name, address and a real postcode", () => {
    const result = createHomeSchema.safeParse({
      ...base,
      name: " ",
      addressLine1: "",
      postcode: "12345",
    });
    expect(errorsOf(result)).toEqual({
      name: "Enter a name for the home, like 12 Oak Road",
      addressLine1: "Enter the first line of the address",
      postcode: "Enter a real UK postcode, like SW1A 1AA",
    });
  });

  it("requires a let type choice", () => {
    const result = createHomeSchema.safeParse({ ...base, letType: undefined });
    expect(errorsOf(result).letType).toBe("Choose how you let this home");
  });
});

describe("updateHomeSchema", () => {
  it("does not require a room count when switching to by the room", () => {
    const result = updateHomeSchema.parse({ ...base, letType: "by_room" });
    expect(result.roomCount).toBeNull();
  });

  it("checks the room count if one is given", () => {
    const result = updateHomeSchema.safeParse({
      ...base,
      letType: "by_room",
      roomCount: "99",
    });
    expect(errorsOf(result).roomCount).toBe("Enter a number from 1 to 30");
  });
});

describe("renameRoomSchema", () => {
  it("trims the new name", () => {
    expect(
      renameRoomSchema.parse({
        roomId: "4b0f5c1e-6a7d-4e2b-9c1f-0a1b2c3d4e5f",
        name: "  Front bedroom ",
      }).name,
    ).toBe("Front bedroom");
  });

  it("rejects an empty name and a bad id", () => {
    const result = renameRoomSchema.safeParse({ roomId: "nope", name: " " });
    expect(errorsOf(result)).toEqual({
      roomId: "That item could not be found",
      name: "Enter a name for the room",
    });
  });
});
