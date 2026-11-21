import { describe, expect, it } from "vitest";

import { homeStatus } from "./home-status";

const base = {
  archived: false,
  roomCount: 0,
  roomsLet: 0,
  wholeHomeLet: false,
};

describe("homeStatus", () => {
  it("says Archived for an archived home, whatever else is true", () => {
    expect(
      homeStatus({ ...base, archived: true, roomCount: 3, roomsLet: 3 }),
    ).toEqual({ label: "Archived", tone: "outline" });
  });

  it("handles a home let as a whole", () => {
    expect(homeStatus({ ...base, wholeHomeLet: true })).toEqual({
      label: "Fully let",
      tone: "good",
    });
    expect(homeStatus(base)).toEqual({ label: "Empty", tone: "neutral" });
  });

  it("counts empty rooms in a home let by the room", () => {
    expect(homeStatus({ ...base, roomCount: 4, roomsLet: 4 })).toEqual({
      label: "Fully let",
      tone: "good",
    });
    expect(homeStatus({ ...base, roomCount: 4, roomsLet: 3 })).toEqual({
      label: "1 room empty",
      tone: "warn",
    });
    expect(homeStatus({ ...base, roomCount: 5, roomsLet: 2 })).toEqual({
      label: "3 rooms empty",
      tone: "warn",
    });
    expect(homeStatus({ ...base, roomCount: 3, roomsLet: 0 })).toEqual({
      label: "Empty",
      tone: "neutral",
    });
  });

  it("never reports more rooms let than there are", () => {
    expect(homeStatus({ ...base, roomCount: 2, roomsLet: 5 }).label).toBe(
      "Fully let",
    );
  });
});
