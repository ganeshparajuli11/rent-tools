import { describe, expect, it } from "vitest";

import {
  homesCountLabel,
  monthlyRentToOwner,
  oneLineAddress,
  ownerDisplayName,
  ownersListHref,
  ownerTypeLabel,
  parseArchivedParam,
} from "./owners";

describe("ownerDisplayName", () => {
  it("uses a person's name and a company's name", () => {
    expect(
      ownerDisplayName({
        ownerType: "individual",
        fullName: "Taylor Example",
        companyName: null,
      }),
    ).toBe("Taylor Example");
    expect(
      ownerDisplayName({
        ownerType: "company",
        fullName: "Sam Sample",
        companyName: "Demo Estates Ltd",
      }),
    ).toBe("Demo Estates Ltd");
  });

  it("falls back to whatever name there is", () => {
    expect(
      ownerDisplayName({
        ownerType: "company",
        fullName: "Sam Sample",
        companyName: null,
      }),
    ).toBe("Sam Sample");
    expect(
      ownerDisplayName({
        ownerType: "individual",
        fullName: " ",
        companyName: null,
      }),
    ).toBe("Unnamed owner");
  });
});

describe("ownerTypeLabel", () => {
  it("says Person or Company", () => {
    expect(ownerTypeLabel("individual")).toBe("Person");
    expect(ownerTypeLabel("company")).toBe("Company");
    expect(ownerTypeLabel("anything else")).toBe("Person");
  });
});

describe("monthlyRentToOwner", () => {
  it("adds up current leases only, in pence", () => {
    expect(
      monthlyRentToOwner([
        { rent_pence: 65_050, end_date: null },
        { rent_pence: 50_000, end_date: null },
        { rent_pence: 40_000, end_date: "2025-12-31" },
      ]),
    ).toBe(115_050);
    expect(monthlyRentToOwner([])).toBe(0);
  });
});

describe("homesCountLabel", () => {
  it("says home or homes", () => {
    expect(homesCountLabel(0)).toBe("0 homes");
    expect(homesCountLabel(1)).toBe("1 home");
    expect(homesCountLabel(3)).toBe("3 homes");
  });
});

describe("oneLineAddress", () => {
  it("leaves out empty parts", () => {
    expect(
      oneLineAddress(["1 Sample Street", null, " ", "Leeds", "LS6 1AA"]),
    ).toBe("1 Sample Street, Leeds, LS6 1AA");
    expect(oneLineAddress([null, undefined])).toBe("");
  });
});

describe("owners list address", () => {
  it("builds and reads the archived filter and page", () => {
    expect(ownersListHref({})).toBe("/owners");
    expect(ownersListHref({ page: 1, archived: false })).toBe("/owners");
    expect(ownersListHref({ page: 2, archived: true })).toBe(
      "/owners?archived=1&page=2",
    );
    expect(parseArchivedParam("1")).toBe(true);
    expect(parseArchivedParam(["1", "0"])).toBe(true);
    expect(parseArchivedParam("yes")).toBe(false);
    expect(parseArchivedParam(undefined)).toBe(false);
  });
});
