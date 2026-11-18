import { describe, expect, it } from "vitest";

import type { OverdueTenant } from "./dashboard";
import {
  appLink,
  buildOverdueDigest,
  DIGEST_MAX_LISTED,
  digestDecision,
  escapeHtml,
} from "./overdue-digest";

function tenant(overrides: Partial<OverdueTenant> = {}): OverdueTenant {
  return {
    tenancyId: "t-1",
    name: "Amira Khan",
    homeId: "home-elm",
    homeName: "7 Elm Street",
    roomName: "Room 1",
    owedPence: 55_000,
    monthsLate: 1,
    oldestDueDate: "2026-11-05",
    oldestMonth: "2026-11",
    ...overrides,
  };
}

const base = {
  organisationName: "Khan Lettings",
  today: "2026-11-18",
  appUrl: "https://rentdesk.example/",
};

describe("escapeHtml", () => {
  it("escapes every character that matters in HTML", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jo'</b>`)).toBe(
      "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jo&#39;&lt;/b&gt;",
    );
  });
});

describe("appLink", () => {
  it("joins without a double slash", () => {
    expect(appLink("https://a.example/", "/rent")).toBe(
      "https://a.example/rent",
    );
    expect(appLink("https://a.example", "/rent")).toBe(
      "https://a.example/rent",
    );
  });
});

describe("buildOverdueDigest", () => {
  it("says how many tenants owe how much, in the subject and the body", () => {
    const digest = buildOverdueDigest({
      ...base,
      overdue: [
        tenant(),
        tenant({
          tenancyId: "t-2",
          name: "Ben Jones",
          roomName: null,
          homeName: "2 Oak Road",
          owedPence: 70_050,
          oldestDueDate: "2026-10-01",
        }),
      ],
      totalPence: 125_050,
    });

    expect(digest.subject).toBe("Late rent: 2 tenants owe £1,250.50");
    expect(digest.text).toContain("Khan Lettings on 18 November 2026");
    expect(digest.text).toContain(
      "- Amira Khan (Room 1, 7 Elm Street): £550, late since 5 November 2026",
    );
    // A whole-home tenant: just the home.
    expect(digest.text).toContain(
      "- Ben Jones (2 Oak Road): £700.50, late since 1 October 2026",
    );
    expect(digest.text).toContain(
      "See late rent: https://rentdesk.example/dashboard",
    );
    expect(digest.text).toContain(
      "Record a payment: https://rentdesk.example/rent",
    );
    expect(digest.text).toContain(
      "To stop them, go to Settings: https://rentdesk.example/settings",
    );
    expect(digest.html).toContain("<strong>Amira Khan</strong>");
    expect(digest.html).toContain('href="https://rentdesk.example/settings"');
  });

  it("uses the singular for one tenant", () => {
    const digest = buildOverdueDigest({
      ...base,
      overdue: [tenant()],
      totalPence: 55_000,
    });
    expect(digest.subject).toBe("Late rent: 1 tenant owes £550");
    expect(digest.text).toContain("1 tenant owes £550 in total.");
  });

  it("never puts names in the subject, and escapes them in the HTML", () => {
    const sneaky = `<script>alert("x")</script>\nBcc: someone@example.com`;
    const digest = buildOverdueDigest({
      ...base,
      organisationName: `<img src=x onerror=alert(1)>`,
      overdue: [tenant({ name: sneaky, homeName: "A & B <House>" })],
      totalPence: 55_000,
    });

    expect(digest.subject).not.toMatch(/script|Bcc|\n/);
    expect(digest.html).not.toContain("<script>");
    expect(digest.html).not.toContain("<img");
    expect(digest.html).toContain("&lt;script&gt;");
    expect(digest.html).toContain("A &amp; B &lt;House&gt;");
  });

  it(`lists at most ${DIGEST_MAX_LISTED} tenants and counts the rest`, () => {
    const many = Array.from({ length: DIGEST_MAX_LISTED + 3 }, (_, i) =>
      tenant({ tenancyId: `t-${i}`, name: `Tenant ${i}`, owedPence: 100 }),
    );
    const digest = buildOverdueDigest({
      ...base,
      overdue: many,
      totalPence: 100 * many.length,
    });

    expect(digest.subject).toBe(
      `Late rent: ${DIGEST_MAX_LISTED + 3} tenants owe £53`,
    );
    expect(digest.text.match(/^- /gm)).toHaveLength(DIGEST_MAX_LISTED);
    expect(digest.text).toContain("And 3 more.");
    expect(digest.html.match(/<li /g)).toHaveLength(DIGEST_MAX_LISTED);
  });
});

describe("digestDecision", () => {
  const ready = {
    enabled: true,
    alreadySentToday: false,
    overdueCount: 2,
    recipientCount: 1,
  };

  it("sends when it is on, not sent today, something is late and there is someone to send to", () => {
    expect(digestDecision(ready)).toBe("send");
  });

  it("never sends when it is turned off", () => {
    expect(digestDecision({ ...ready, enabled: false })).toBe("turned-off");
  });

  it("sends at most once a day", () => {
    expect(digestDecision({ ...ready, alreadySentToday: true })).toBe(
      "already-sent",
    );
  });

  it("sends nothing when no rent is late", () => {
    expect(digestDecision({ ...ready, overdueCount: 0 })).toBe("nothing-late");
  });

  it("sends nothing when there is no owner email", () => {
    expect(digestDecision({ ...ready, recipientCount: 0 })).toBe(
      "no-recipients",
    );
  });
});
