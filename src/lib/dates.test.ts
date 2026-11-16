import { describe, expect, it } from "vitest";

import {
  addYears,
  formatDate,
  isValidDateString,
  laterDate,
  ordinal,
  todayInLondon,
} from "./dates";

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

describe("isValidDateString", () => {
  it("accepts real dates", () => {
    expect(isValidDateString("2026-01-05")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true);
    expect(isValidDateString("2026-12-31")).toBe(true);
  });

  it("rejects dates that do not exist or are written another way", () => {
    for (const value of [
      "2026-02-30",
      "2026-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-04-31",
      "05/01/2026",
      "2026-1-5",
      "",
      "today",
    ]) {
      expect(isValidDateString(value)).toBe(false);
    }
  });
});

describe("addYears", () => {
  it("moves a date by whole years", () => {
    expect(addYears("2026-11-16", 1)).toBe("2027-11-16");
    expect(addYears("2026-11-16", -30)).toBe("1996-11-16");
  });

  it("moves 29 February to 28 February outside leap years", () => {
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });
});

describe("formatDate", () => {
  it("writes the date in plain British English", () => {
    expect(formatDate("2026-01-05")).toBe("5 January 2026");
    expect(formatDate("2026-07-31")).toBe("31 July 2026");
  });

  it("does not shift the day across time zones", () => {
    // Midnight dates are where time-zone bugs show up.
    expect(formatDate("2026-03-29")).toBe("29 March 2026");
    expect(formatDate("2026-10-25")).toBe("25 October 2026");
  });

  it("returns the text unchanged when it is not a date", () => {
    expect(formatDate("soon")).toBe("soon");
  });
});

describe("laterDate", () => {
  it("picks the later of two dates", () => {
    expect(laterDate("2026-01-05", "2026-11-16")).toBe("2026-11-16");
    expect(laterDate("2027-01-05", "2026-11-16")).toBe("2027-01-05");
    expect(laterDate("2026-01-05", "2026-01-05")).toBe("2026-01-05");
  });
});
