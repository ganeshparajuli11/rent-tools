// @vitest-environment node
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  hashInvitationToken,
  invitationLink,
  invitationStatus,
  newInvitationToken,
} from "./invitations";
import { invitationTokenSchema } from "./validation/members";

describe("newInvitationToken", () => {
  it("is 43 URL-safe characters and different every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, newInvitationToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      // The page only accepts links in this shape.
      expect(invitationTokenSchema.safeParse(token).success).toBe(true);
    }
  });
});

describe("hashInvitationToken", () => {
  it("is the SHA-256 in hex, as the database works it out", async () => {
    const token = "A".repeat(43);
    expect(await hashInvitationToken(token)).toBe(
      createHash("sha256").update(token, "utf8").digest("hex"),
    );
    expect(await hashInvitationToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("invitationLink", () => {
  it("points at /invite/<token> on the site", () => {
    expect(invitationLink("https://propdesk.example", "abc_DEF-123")).toBe(
      "https://propdesk.example/invite/abc_DEF-123",
    );
    expect(invitationLink("https://propdesk.example/", "t")).toBe(
      "https://propdesk.example/invite/t",
    );
  });
});

describe("invitationStatus", () => {
  const now = new Date("2026-11-25T12:00:00Z");

  it("is pending until it expires, then expired", () => {
    expect(invitationStatus("2026-12-02T12:00:00Z", now)).toBe("pending");
    expect(invitationStatus("2026-11-25T12:00:00Z", now)).toBe("expired");
    expect(invitationStatus("2026-11-20T09:00:00Z", now)).toBe("expired");
  });
});

describe("invitationTokenSchema", () => {
  it("refuses links that are not tokens", () => {
    for (const value of [
      "",
      "short",
      "a".repeat(129),
      "../../etc",
      "a b".repeat(20),
    ]) {
      expect(invitationTokenSchema.safeParse(value).success, value).toBe(false);
    }
  });
});
