import { describe, expect, it } from "vitest";

import { isValidPostcode, normalisePostcode } from "./postcode";

describe("normalisePostcode", () => {
  it.each([
    ["SW1A 1AA", "SW1A 1AA"],
    ["sw1a1aa", "SW1A 1AA"],
    ["  sw1a   1aa ", "SW1A 1AA"],
    ["m11ae", "M1 1AE"],
    ["B33 8TH", "B33 8TH"],
    ["cr26xh", "CR2 6XH"],
    ["DN55 1PT", "DN55 1PT"],
    ["w1a0ax", "W1A 0AX"],
    ["ec1a 1bb", "EC1A 1BB"],
    ["M60 1NW", "M60 1NW"],
    ["gir0aa", "GIR 0AA"],
  ])("%j -> %j", (input, expected) => {
    expect(normalisePostcode(input)).toBe(expected);
    expect(isValidPostcode(input)).toBe(true);
  });

  it.each([
    "",
    "12345",
    "ABC 123",
    "SW1A 1A",
    "SW1A 1AAA",
    "QW1 1AA", // Q is never a first letter
    "SW1A 1CA", // C is never used in the last part
    "not a postcode",
  ])("rejects %j", (input) => {
    expect(normalisePostcode(input)).toBeNull();
    expect(isValidPostcode(input)).toBe(false);
  });
});
