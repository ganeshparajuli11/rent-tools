import { describe, expect, it } from "vitest";

import {
  parseActiveOrganisationCookie,
  pickActiveMembership,
} from "./active-organisation";

const FIRST = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";
const ELSEWHERE = "33333333-3333-4333-8333-333333333333";

const memberships = [
  { organisation_id: FIRST, role: "owner" },
  { organisation_id: SECOND, role: "staff" },
];

describe("parseActiveOrganisationCookie", () => {
  it("accepts an organisation id", () => {
    expect(parseActiveOrganisationCookie(SECOND)).toBe(SECOND);
  });

  it("tidies spaces and capitals", () => {
    expect(parseActiveOrganisationCookie(` ${SECOND.toUpperCase()} `)).toBe(
      SECOND,
    );
  });

  it("refuses anything that is not an id", () => {
    for (const value of [
      undefined,
      null,
      "",
      "first",
      `${SECOND}x`,
      `${SECOND},${FIRST}`,
      "' or 1=1 --",
    ]) {
      expect(parseActiveOrganisationCookie(value), String(value)).toBeNull();
    }
  });
});

describe("pickActiveMembership", () => {
  it("uses the first organisation joined when nothing was picked", () => {
    expect(pickActiveMembership(memberships, null)?.organisation_id).toBe(
      FIRST,
    );
  });

  it("uses the picked organisation when the person is in it", () => {
    expect(pickActiveMembership(memberships, SECOND)).toEqual({
      organisation_id: SECOND,
      role: "staff",
    });
  });

  it("ignores a pick for an organisation the person is not in", () => {
    // For example after they were removed, or a cookie copied from
    // someone else: the cookie never grants anything.
    expect(pickActiveMembership(memberships, ELSEWHERE)?.organisation_id).toBe(
      FIRST,
    );
  });

  it("gives nothing for someone with no organisation", () => {
    expect(pickActiveMembership([], SECOND)).toBeUndefined();
  });
});
