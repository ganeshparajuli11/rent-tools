import { describe, expect, it } from "vitest";

import {
  bottomBarItems,
  isActivePath,
  moreItems,
  NAV_GROUPS,
  type NavGroup,
  visibleNavGroups,
} from "./nav";

describe("visibleNavGroups", () => {
  it("leaves out pages that do not exist yet, and empty groups", () => {
    const groups = visibleNavGroups();
    expect(groups.map((group) => group.label)).toEqual([
      "",
      "Portfolio",
      "Money",
      "Account",
    ]);
    expect(
      groups.flatMap((group) => group.items.map((item) => item.label)),
    ).toEqual(["Today", "Properties", "Rent", "Settings"]);
  });

  it("keeps the design system's order of groups", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual([
      "",
      "Portfolio",
      "Money",
      "Work",
      "Account",
    ]);
  });

  it("shows an item as soon as it is ready", () => {
    const groups: NavGroup[] = [
      {
        label: "Work",
        items: [
          { href: "/repairs", label: "Repairs", icon: "repairs", ready: true },
        ],
      },
    ];
    expect(visibleNavGroups(groups)[0]?.items).toHaveLength(1);
  });
});

describe("bottom bar and More", () => {
  it("puts Today, Properties and Rent in the bottom bar", () => {
    expect(bottomBarItems().map((item) => item.label)).toEqual([
      "Today",
      "Properties",
      "Rent",
    ]);
  });

  it("puts the rest under More, with no item in both", () => {
    const more = moreItems().map((item) => item.label);
    expect(more).toEqual(["Settings"]);
    for (const item of bottomBarItems()) {
      expect(more).not.toContain(item.label);
    }
  });
});

describe("isActivePath", () => {
  it("matches the page and pages inside it", () => {
    expect(isActivePath("/homes", "/homes")).toBe(true);
    expect(isActivePath("/homes/abc/edit", "/homes")).toBe(true);
  });

  it("does not match a page that only starts with the same letters", () => {
    expect(isActivePath("/homesick", "/homes")).toBe(false);
    expect(isActivePath("/rent", "/homes")).toBe(false);
  });
});
