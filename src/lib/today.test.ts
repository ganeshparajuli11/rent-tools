import { describe, expect, it } from "vitest";

import type { DashboardCharge, DashboardHome } from "./dashboard";
import {
  activityWhen,
  daysBetween,
  describeActivity,
  emptyForWords,
  filterRentRows,
  formatShortDate,
  formatTodayLine,
  greetingFor,
  greetingLine,
  homeCards,
  londonHour,
  longEmptyPlaces,
  monthRentRows,
  needsYouItems,
  needsYouSentence,
  occupancy,
  parseRentFilter,
  rentFilterCounts,
  todayRentHref,
} from "./today";

const TODAY = "2026-11-17";

/** Shared house: three rooms in use, two let, one archived room. */
const sampleHouse: DashboardHome = {
  id: "home-sample",
  name: "Sample House 01",
  archived: false,
  createdOn: "2026-01-01",
  rooms: [
    { id: "r-front", name: "Front bedroom", archived: false },
    { id: "r-back", name: "Back bedroom", archived: false },
    { id: "r-box", name: "Box room", archived: false, createdOn: "2026-01-01" },
    { id: "r-old", name: "Old room", archived: true },
  ],
  ownerLeases: [],
  tenancies: [
    {
      id: "t-taylor",
      roomId: "r-front",
      name: "Taylor Example",
      startDate: "2026-01-05",
      endDate: null,
    },
    {
      id: "t-jordan",
      roomId: "r-back",
      name: "Jordan Sample",
      startDate: "2026-01-05",
      endDate: null,
    },
    // Left the box room on 20 October.
    {
      id: "t-casey",
      roomId: "r-box",
      name: "Casey Demo",
      startDate: "2026-01-05",
      endDate: "2026-10-20",
    },
  ],
};

/** A whole home with a tenant. */
const demoCourt: DashboardHome = {
  id: "home-court",
  name: "Demo Court, Flat 3",
  archived: false,
  createdOn: "2026-01-01",
  rooms: [],
  ownerLeases: [],
  tenancies: [
    {
      id: "t-alex",
      roomId: null,
      name: "Alex Placeholder",
      startDate: "2026-02-01",
      endDate: null,
    },
  ],
};

/** A whole home added last week, never let. */
const sampleCottage: DashboardHome = {
  id: "home-cottage",
  name: "Sample Cottage",
  archived: false,
  createdOn: "2026-11-10",
  rooms: [],
  ownerLeases: [],
  tenancies: [],
};

const archived: DashboardHome = {
  id: "home-old",
  name: "Archived Test Home",
  archived: true,
  createdOn: "2025-01-01",
  rooms: [],
  ownerLeases: [],
  tenancies: [],
};

const homes = [sampleHouse, demoCourt, sampleCottage, archived];

const charge = (
  id: string,
  tenancyId: string,
  dueDate: string,
  amountPence: number,
  paidPence: number,
): DashboardCharge => ({
  id,
  tenancyId,
  periodStart: `${dueDate.slice(0, 7)}-01`,
  dueDate,
  amountPence,
  paidPence,
});

describe("dates and greeting", () => {
  it("counts whole days between dates", () => {
    expect(daysBetween("2026-11-05", "2026-11-19")).toBe(14);
    expect(daysBetween("2026-10-25", "2026-10-26")).toBe(1); // clocks change
    expect(daysBetween("2026-11-19", "2026-11-05")).toBe(-14);
  });

  it("writes the date line and short dates", () => {
    expect(formatTodayLine("2026-11-22")).toBe("Sunday 22 November");
    expect(formatTodayLine("2026-11-19")).toBe("Thursday 19 November");
    expect(formatShortDate("2026-11-05")).toBe("5 Nov");
  });

  it("greets by the time of day in London", () => {
    expect(greetingFor(6)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    // 08:30 UTC is 09:30 in summer and 08:30 in winter in London.
    expect(londonHour(new Date("2026-07-01T08:30:00Z"))).toBe(9);
    expect(londonHour(new Date("2026-11-22T08:30:00Z"))).toBe(8);
    expect(londonHour(new Date("2026-11-22T23:30:00Z"))).toBe(23);
  });

  it("adds the first name to the greeting when there is one", () => {
    expect(greetingLine(9, "Taylor")).toBe("Good morning, Taylor.");
    expect(greetingLine(19, null)).toBe("Good evening.");
  });

  it("says how many things need the user", () => {
    expect(needsYouSentence(0)).toBe(
      "Nothing needs you today. Everything is on track.",
    );
    expect(needsYouSentence(1)).toBe(
      "One thing needs you today. Everything else is on track.",
    );
    expect(needsYouSentence(2)).toBe(
      "Two things need you today. Everything else is on track.",
    );
    expect(needsYouSentence(12)).toBe(
      "12 things need you today. Everything else is on track.",
    );
  });
});

describe("occupancy and home cards", () => {
  it("counts rooms and whole homes, leaving out archived ones", () => {
    // 3 rooms (2 let) + Demo Court (let) + Sample Cottage (empty).
    expect(occupancy(homes)).toEqual({ total: 5, let: 3 });
    expect(occupancy([])).toEqual({ total: 0, let: 0 });
  });

  it("fills every room when one tenant has the whole home", () => {
    const wholeLet: DashboardHome = {
      ...sampleHouse,
      tenancies: [
        {
          id: "t-all",
          roomId: null,
          name: "Whole",
          startDate: "2026-01-01",
          endDate: null,
        },
      ],
    };
    expect(occupancy([wholeLet])).toEqual({ total: 3, let: 3 });
  });

  it("makes cards for homes in use, in name order, with their status", () => {
    expect(homeCards(homes, 4)).toEqual([
      {
        id: "home-court",
        name: "Demo Court, Flat 3",
        meta: "Whole home",
        status: { label: "Fully let", tone: "good" },
      },
      {
        id: "home-cottage",
        name: "Sample Cottage",
        meta: "Whole home",
        status: { label: "Empty", tone: "neutral" },
      },
      {
        id: "home-sample",
        name: "Sample House 01",
        meta: "3 rooms · 2 let",
        status: { label: "1 room empty", tone: "warn" },
      },
    ]);
    expect(homeCards(homes, 1).map((card) => card.name)).toEqual([
      "Demo Court, Flat 3",
    ]);
  });
});

describe("rooms empty for two weeks or more", () => {
  it("lists a room empty since its last tenant left, not a new empty home", () => {
    expect(longEmptyPlaces(homes, TODAY)).toEqual([
      {
        homeId: "home-sample",
        homeName: "Sample House 01",
        roomId: "r-box",
        roomName: "Box room",
        emptySince: "2026-10-20",
        daysEmpty: 28,
      },
    ]);
  });

  it("counts from the day it was added when nobody ever lived there", () => {
    expect(
      longEmptyPlaces([sampleCottage], "2026-11-24").map((p) => p.daysEmpty),
    ).toEqual([14]);
    expect(longEmptyPlaces([sampleCottage], "2026-11-23")).toEqual([]);
  });

  it("leaves out places with no date to count from", () => {
    const noDate: DashboardHome = { ...sampleCottage, createdOn: undefined };
    expect(longEmptyPlaces([noDate], TODAY)).toEqual([]);
  });

  it("puts durations into words", () => {
    expect(emptyForWords(1)).toBe("1 day");
    expect(emptyForWords(14)).toBe("2 weeks");
    expect(emptyForWords(42)).toBe("6 weeks");
    expect(emptyForWords(70)).toBe("2 months");
  });
});

describe("needs you", () => {
  it("lists late rent first, then empty rooms, each with one action", () => {
    const items = needsYouItems({
      overdue: [
        {
          tenancyId: "t-jordan",
          name: "Jordan Sample",
          homeId: "home-sample",
          homeName: "Sample House 01",
          roomName: "Back bedroom",
          owedPence: 52_500,
          monthsLate: 1,
          oldestDueDate: "2026-11-03",
          oldestMonth: "2026-11",
        },
        {
          tenancyId: "t-alex",
          name: "Alex Placeholder",
          homeId: "home-court",
          homeName: "Demo Court, Flat 3",
          roomName: null,
          owedPence: 230_000,
          monthsLate: 2,
          oldestDueDate: "2026-10-01",
          oldestMonth: "2026-10",
        },
      ],
      empty: longEmptyPlaces(homes, TODAY),
      today: TODAY,
    });

    expect(items).toEqual([
      {
        key: "late-t-jordan",
        kind: "late",
        title: "Jordan Sample is 14 days late",
        detail: "£525 · Back bedroom, Sample House 01 · due 3 Nov",
        action: "Record payment",
        href: "/rent",
      },
      {
        key: "late-t-alex",
        kind: "late",
        title: "Alex Placeholder is 47 days late",
        detail: "£2,300 over 2 months · Demo Court, Flat 3 · due 1 Oct",
        action: "Record payment",
        href: "/rent?month=2026-10",
      },
      {
        key: "empty-r-box",
        kind: "empty",
        title: "Box room empty for 4 weeks",
        detail: "Sample House 01 · empty since 20 Oct",
        action: "Add tenant",
        href: "/homes/home-sample/tenants/new?room=r-box",
      },
    ]);
  });

  it("links a whole empty home to its add-tenant page", () => {
    const [item] = needsYouItems({
      overdue: [],
      empty: longEmptyPlaces([sampleCottage], "2026-12-01"),
      today: "2026-12-01",
    });
    expect(item?.title).toBe("Sample Cottage empty for 3 weeks");
    expect(item?.detail).toBe("Whole home · empty since 10 Nov");
    expect(item?.href).toBe("/homes/home-cottage/tenants/new");
  });
});

describe("rent this month", () => {
  const charges = [
    charge("c-taylor", "t-taylor", "2026-11-01", 57_500, 57_500), // paid
    charge("c-jordan", "t-jordan", "2026-11-05", 52_500, 0), // late
    charge("c-alex", "t-alex", "2026-11-25", 115_000, 29_500), // part paid
    charge("c-casey", "t-casey", "2026-11-20", 49_500, 0), // due
    charge("c-old", "t-jordan", "2026-10-05", 52_500, 0), // last month
    { ...charge("c-none", "t-taylor", "2026-11-02", 100, 0), id: undefined },
  ];

  const rows = monthRentRows(homes, charges, TODAY);

  it("lists this month's rent, late first, then due, part paid and paid", () => {
    expect(rows.map((row) => [row.tenantName, row.status])).toEqual([
      ["Jordan Sample", "late"],
      ["Casey Demo", "due"],
      ["Alex Placeholder", "part_paid"],
      ["Taylor Example", "paid"],
    ]);
    expect(rows[2]).toMatchObject({
      chargeId: "c-alex",
      homeName: "Demo Court, Flat 3",
      roomName: null,
      paidPence: 29_500,
      owedPence: 85_500,
    });
    expect(rows[0]?.roomName).toBe("Back bedroom");
  });

  it("counts and filters by tab; Still due holds Due and Part paid", () => {
    expect(rentFilterCounts(rows)).toEqual({
      all: 4,
      late: 1,
      due: 2,
      paid: 1,
    });
    expect(filterRentRows(rows, "due").map((r) => r.chargeId)).toEqual([
      "c-casey",
      "c-alex",
    ]);
    expect(filterRentRows(rows, "all")).toHaveLength(4);
  });

  it("leaves out unpaid rent from before a corrected move-in date", () => {
    const moved: DashboardHome = {
      ...demoCourt,
      tenancies: [{ ...demoCourt.tenancies[0]!, startDate: "2026-12-01" }],
    };
    expect(
      monthRentRows(
        [moved],
        [charge("c-x", "t-alex", "2026-11-25", 115_000, 0)],
        TODAY,
      ),
    ).toEqual([]);
  });

  it("reads the filter from the address and links back to it", () => {
    expect(parseRentFilter("late")).toBe("late");
    expect(parseRentFilter(["paid", "late"])).toBe("paid");
    expect(parseRentFilter("everything")).toBe("all");
    expect(parseRentFilter(undefined)).toBe("all");
    expect(todayRentHref("all")).toBe("/dashboard#rent-heading");
    expect(todayRentHref("due")).toBe("/dashboard?rent=due#rent-heading");
  });
});

describe("recent activity", () => {
  const lookups = {
    homeNames: new Map([["home-sample", "Sample House 01"]]),
    tenancyHomes: new Map([["t-jordan", "Sample House 01"]]),
    chargeHomes: new Map([["c-jordan", "Sample House 01"]]),
  };
  const entry = (action: string, changes: unknown, recordId = "rec-1") => ({
    id: "a1",
    action,
    recordId,
    changes,
    createdAt: "2026-11-17T09:12:00Z",
  });

  it("describes payments with the amount and the home", () => {
    expect(
      describeActivity(
        entry("payment.recorded", {
          after: { tenancyId: "t-jordan", amountPence: 58_000 },
        }),
        lookups,
      ),
    ).toBe("Payment of £580 recorded at Sample House 01");
    expect(
      describeActivity(
        entry("payment.removed", {
          before: { rentChargeId: "c-jordan", amountPence: 20_050 },
        }),
        lookups,
      ),
    ).toBe("Payment of £200.50 removed at Sample House 01");
    expect(describeActivity(entry("payment.restored", null), lookups)).toBe(
      "A payment put back",
    );
  });

  it("describes homes, tenants and photos without naming people", () => {
    expect(
      describeActivity(entry("home.created", {}, "home-sample"), lookups),
    ).toBe("Sample House 01 added");
    expect(
      describeActivity(
        entry("tenant.created", { after: { propertyId: "home-sample" } }),
        lookups,
      ),
    ).toBe("New tenant added at Sample House 01");
    expect(
      describeActivity(entry("tenant.moved_out", {}, "t-jordan"), lookups),
    ).toBe("A tenant moved out at Sample House 01");
    expect(
      describeActivity(
        entry("photo.added", { after: { propertyId: "home-sample" } }),
        lookups,
      ),
    ).toBe("Photo added to Sample House 01");
    expect(
      describeActivity(entry("home.archived", {}, "home-gone"), lookups),
    ).toBe("A home was archived");
    expect(
      describeActivity(
        entry("organisation.overdue_email_changed", {
          overdue_email_enabled: false,
        }),
        lookups,
      ),
    ).toBe("Late rent email turned off");
    expect(
      describeActivity(
        entry("organisation.created", { account_type: "landlord" }),
        lookups,
      ),
    ).toBe("Organisation set up");
  });

  it("skips actions it does not know", () => {
    expect(describeActivity(entry("something.else", {}), lookups)).toBeNull();
  });

  it("says when, relative to now in London", () => {
    const now = new Date("2026-11-17T15:00:00Z");
    expect(activityWhen("2026-11-17T09:12:00Z", now)).toEqual({
      when: "Today, 09:12",
      day: "2026-11-17",
    });
    expect(activityWhen("2026-11-16T14:05:00Z", now).when).toBe(
      "Yesterday, 14:05",
    );
    expect(activityWhen("2026-11-14T10:00:00Z", now).when).toBe("3 days ago");
    expect(activityWhen("2026-11-05T10:00:00Z", now).when).toBe("5 Nov");
    // Summer time: 23:30 UTC on 1 July is already 2 July in London.
    expect(
      activityWhen("2026-07-01T23:30:00Z", new Date("2026-07-02T12:00:00Z")),
    ).toEqual({ when: "Today, 00:30", day: "2026-07-02" });
  });
});
