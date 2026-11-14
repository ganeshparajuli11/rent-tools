import { describe, expect, it } from "vitest";

import {
  formatPence,
  MAX_PENCE,
  penceToPoundsInput,
  poundsToPence,
} from "./money";

describe("poundsToPence", () => {
  it.each([
    ["650", 65_000],
    ["650.5", 65_050],
    ["650.50", 65_050],
    ["0.01", 1],
    ["0", 0],
    [" 650 ", 65_000],
    ["£650", 65_000],
    ["£ 1,250.99", 125_099],
    [650, 65_000],
  ])("%s -> %i pence", (input, pence) => {
    expect(poundsToPence(input)).toBe(pence);
  });

  it("avoids floating-point errors (0.1 + 0.2 style)", () => {
    expect(poundsToPence("0.29")).toBe(29);
    expect(poundsToPence("1.15")).toBe(115);
    expect(poundsToPence("4.35")).toBe(435);
  });

  it.each(["", "abc", "-5", "650.505", "6,50.00x", "1e3", ".5", "650."])(
    "rejects %j",
    (input) => {
      expect(poundsToPence(input)).toBeNull();
    },
  );

  it("rejects amounts above the maximum", () => {
    expect(poundsToPence("1000000")).toBe(MAX_PENCE);
    expect(poundsToPence("1000000.01")).toBeNull();
  });
});

describe("formatPence", () => {
  it("drops .00 for whole pounds", () => {
    expect(formatPence(65_000)).toBe("£650");
  });

  it("shows pence when there are some", () => {
    expect(formatPence(65_050)).toBe("£650.50");
    expect(formatPence(5)).toBe("£0.05");
  });

  it("adds thousands separators", () => {
    expect(formatPence(125_000)).toBe("£1,250");
  });

  it("refuses non-integer pence", () => {
    expect(() => formatPence(1.5)).toThrow();
  });
});

describe("penceToPoundsInput", () => {
  it.each([
    [65_000, "650"],
    [65_050, "650.50"],
    [65_005, "650.05"],
    [0, "0"],
  ])("%i -> %s", (pence, text) => {
    expect(penceToPoundsInput(pence)).toBe(text);
    expect(poundsToPence(text)).toBe(pence);
  });
});
