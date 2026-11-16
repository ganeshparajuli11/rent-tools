import { describe, expect, it } from "vitest";

import {
  ariaSortFor,
  DEFAULT_HOMES_SORT,
  homesListHref,
  nextHomesSort,
  parseHomesSort,
  parsePageNumber,
} from "./homes-sort";

describe("parsePageNumber", () => {
  it("reads a whole number of 1 or more", () => {
    expect(parsePageNumber("1")).toBe(1);
    expect(parsePageNumber("12")).toBe(12);
    expect(parsePageNumber(["3", "9"])).toBe(3);
  });

  it("falls back to page 1 for anything else", () => {
    for (const value of [undefined, "", "0", "-2", "1.5", "abc", "1e3", " 2"]) {
      expect(parsePageNumber(value)).toBe(1);
    }
    expect(parsePageNumber("99999999999999999999")).toBe(1);
  });
});

describe("parseHomesSort", () => {
  it("defaults to name, A to Z", () => {
    expect(parseHomesSort({})).toEqual(DEFAULT_HOMES_SORT);
    expect(DEFAULT_HOMES_SORT).toEqual({ key: "name", direction: "asc" });
  });

  it("reads a known column and direction", () => {
    expect(parseHomesSort({ sort: "postcode", dir: "desc" })).toEqual({
      key: "postcode",
      direction: "desc",
    });
    expect(parseHomesSort({ sort: ["address"], dir: ["asc"] })).toEqual({
      key: "address",
      direction: "asc",
    });
  });

  it("ignores columns and directions it does not know", () => {
    expect(
      parseHomesSort({ sort: "organisation_id", dir: "sideways" }),
    ).toEqual(DEFAULT_HOMES_SORT);
    expect(parseHomesSort({ sort: "name; drop table", dir: "desc" })).toEqual({
      key: "name",
      direction: "desc",
    });
  });
});

describe("nextHomesSort", () => {
  it("starts a new column A to Z", () => {
    expect(
      nextHomesSort({ key: "name", direction: "desc" }, "postcode"),
    ).toEqual({ key: "postcode", direction: "asc" });
  });

  it("flips the direction of the current column", () => {
    expect(nextHomesSort({ key: "name", direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "desc",
    });
    expect(nextHomesSort({ key: "name", direction: "desc" }, "name")).toEqual({
      key: "name",
      direction: "asc",
    });
  });
});

describe("ariaSortFor", () => {
  it("describes the sorted column only", () => {
    const sort = { key: "address", direction: "desc" } as const;
    expect(ariaSortFor(sort, "address")).toBe("descending");
    expect(ariaSortFor(sort, "name")).toBe("none");
    expect(ariaSortFor({ key: "name", direction: "asc" }, "name")).toBe(
      "ascending",
    );
  });
});

describe("homesListHref", () => {
  it("leaves out defaults", () => {
    expect(homesListHref({})).toBe("/homes");
    expect(homesListHref({ page: 1, archived: false })).toBe("/homes");
  });

  it("keeps the sort, page and archived filter together", () => {
    expect(
      homesListHref({
        page: 2,
        archived: true,
        sort: { key: "postcode", direction: "desc" },
      }),
    ).toBe("/homes?sort=postcode&dir=desc&page=2&archived=1");
    expect(homesListHref({ sort: { key: "name", direction: "desc" } })).toBe(
      "/homes?dir=desc",
    );
  });

  it("round-trips through parseHomesSort", () => {
    const sort = { key: "address", direction: "desc" } as const;
    const url = new URL(homesListHref({ sort, page: 4 }), "http://x");
    expect(
      parseHomesSort({
        sort: url.searchParams.get("sort") ?? undefined,
        dir: url.searchParams.get("dir") ?? undefined,
      }),
    ).toEqual(sort);
    expect(parsePageNumber(url.searchParams.get("page") ?? undefined)).toBe(4);
  });
});
