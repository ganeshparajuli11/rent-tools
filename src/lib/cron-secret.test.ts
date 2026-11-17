import { describe, expect, it } from "vitest";

import {
  isCronAuthorised,
  isCronSecretUsable,
  MIN_CRON_SECRET_LENGTH,
} from "./cron-secret";

const SECRET = "test-only-cron-secret-0123456789";

describe("isCronSecretUsable", () => {
  it("needs a secret of a safe length", () => {
    expect(isCronSecretUsable(undefined)).toBe(false);
    expect(isCronSecretUsable("")).toBe(false);
    expect(isCronSecretUsable("x".repeat(MIN_CRON_SECRET_LENGTH - 1))).toBe(
      false,
    );
    expect(isCronSecretUsable("x".repeat(MIN_CRON_SECRET_LENGTH))).toBe(true);
  });
});

describe("isCronAuthorised", () => {
  it("accepts exactly Bearer plus the secret", () => {
    expect(isCronAuthorised(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("refuses a missing or wrong header", () => {
    expect(isCronAuthorised(null, SECRET)).toBe(false);
    expect(isCronAuthorised(undefined, SECRET)).toBe(false);
    expect(isCronAuthorised("", SECRET)).toBe(false);
    expect(isCronAuthorised(SECRET, SECRET)).toBe(false);
    expect(isCronAuthorised(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isCronAuthorised(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isCronAuthorised(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(
      false,
    );
    expect(isCronAuthorised(`Bearer ${SECRET.slice(0, -1)}X`, SECRET)).toBe(
      false,
    );
    expect(isCronAuthorised("Bearer ", SECRET)).toBe(false);
  });

  it("refuses everything when no secret is set", () => {
    expect(isCronAuthorised("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorised("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorised("Bearer ", "")).toBe(false);
  });

  it("refuses everything when the secret is too short to be safe", () => {
    expect(isCronAuthorised("Bearer short", "short")).toBe(false);
  });
});
