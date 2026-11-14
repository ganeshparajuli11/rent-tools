import { describe, expect, it } from "vitest";

import { ordinal, todayInLondon } from "./dates";

describe("todayInLondon", () => {
  it("uses London time in winter (GMT = UTC)", () => {
    expect(todayInLondon(new Date("2026-01-15T23:59:59Z"))).toBe("2026-01-15");
    expect(todayInLondon(new Date("2026-01-16T00:00:00Z"))).toBe("2026-01-16");
  });

  it("uses London time in summer (BST = UTC+1)", () => {
    // 23:30 UTC on 1 July is already 00:30 on 2 July in London.
    expect(todayInLondon(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(todayInLondon(new Date("2026-07-01T22:59:59Z"))).toBe("2026-07-01");
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [28, "28th"],
  ])("%i -> %s", (day, text) => {
    expect(ordinal(day)).toBe(text);
  });
});
