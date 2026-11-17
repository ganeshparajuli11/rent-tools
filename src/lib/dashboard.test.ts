import { describe, expect, it } from "vitest";

import {
  buildDashboard,
  type DashboardCharge,
  type DashboardHome,
  emptyPlaces,
  ownerRentForMonth,
} from "./dashboard";

const TODAY = "2026-11-17";

/** A shared house: three rooms, two tenants, rented from an owner. */
const elmStreet: DashboardHome = {
  id: "home-elm",
  name: "7 Elm Street",
  archived: false,
  rooms: [
    { id: "elm-1", name: "Room 1", archived: false },
    { id: "elm-2", name: "Room 2", archived: false },
    { id: "elm-3", name: "Room 3", archived: false },
    { id: "elm-old", name: "Box room", archived: true },
  ],
  ownerLeases: [{ rentPence: 90_000, startDate: "2026-01-01", endDate: null }],
  tenancies: [
    {
      id: "t-amira",
      roomId: "elm-1",
      name: "Amira Khan",
      startDate: "2026-01-05",
      endDate: null,
    },
    {
      id: "t-ben",
      roomId: "elm-2",
      name: "Ben Osei",
      startDate: "2026-01-05",
      endDate: null,
    },
    // Moved out of Room 3 in October, still owes for October.
    {
      id: "t-cara",
      roomId: "elm-3",
      name: "Cara Lund",
      startDate: "2026-01-05",
      endDate: "2026-10-20",
    },
  ],
};

/** A flat let as a whole home, owned by the landlord (no owner lease). */
const oakFlat: DashboardHome = {
  id: "home-oak",
  name: "12 Oak Road",
  archived: false,
  rooms: [],
  ownerLeases: [],
  tenancies: [
    {
      id: "t-dev",
      roomId: null,
      name: "Dev Patel",
      startDate: "2026-01-05",
      endDate: null,
    },
  ],
};

/** A whole home with nobody in it. */
const ashHouse: DashboardHome = {
  id: "home-ash",
  name: "3 Ash Lane",
  archived: false,
  rooms: [],
  ownerLeases: [{ rentPence: 70_000, startDate: "2026-06-01", endDate: null }],
  tenancies: [],
};

const archivedHome: DashboardHome = {
  id: "home-gone",
  name: "1 Gone Close",
  archived: true,
  rooms: [{ id: "gone-1", name: "Room 1", archived: false }],
  ownerLeases: [{ rentPence: 50_000, startDate: "2025-01-01", endDate: null }],
  tenancies: [],
};

const charge = (
  tenancyId: string,
  month: string,
  day: string,
  amountPence: number,
  paidPence: number,
): DashboardCharge => ({
  tenancyId,
  periodStart: `${month}-01`,
  dueDate: `${month}-${day}`,
  amountPence,
  paidPence,
});

const charges: DashboardCharge[] = [
  // November
  charge("t-amira", "2026-11", "05", 55_000, 55_000), // paid
  charge("t-ben", "2026-11", "10", 50_000, 20_000), // late, part paid
  charge("t-dev", "2026-11", "25", 120_050, 0), // due later this month
  // Earlier months
  charge("t-ben", "2026-10", "10", 50_000, 0), // late
  charge("t-amira", "2026-10", "05", 55_000, 55_000), // paid
  charge("t-cara", "2026-10", "01", 45_000, 40_000), // late, moved out
];

describe("ownerRentForMonth", () => {
  it("is 0 when there is no owner", () => {
    expect(ownerRentForMonth([], "2026-11")).toBe(0);
  });

  it("counts a lease that covers the month", () => {
    const leases = [
      { rentPence: 90_000, startDate: "2026-01-01", endDate: null },
    ];
    expect(ownerRentForMonth(leases, "2026-11")).toBe(90_000);
    expect(ownerRentForMonth(leases, "2025-12")).toBe(0);
  });

  it("stops counting a lease after the month it ended", () => {
    const leases = [
      { rentPence: 90_000, startDate: "2026-01-01", endDate: "2026-10-15" },
    ];
    expect(ownerRentForMonth(leases, "2026-10")).toBe(90_000);
    expect(ownerRentForMonth(leases, "2026-11")).toBe(0);
  });

  it("never adds two leases for the same month", () => {
    const leases = [
      { rentPence: 90_000, startDate: "2026-01-01", endDate: "2026-11-10" },
      { rentPence: 95_000, startDate: "2026-11-10", endDate: null },
    ];
    expect(ownerRentForMonth(leases, "2026-11")).toBe(95_000);
  });
});

describe("emptyPlaces", () => {
  it("lists empty rooms and empty whole homes, not archived ones", () => {
    expect(emptyPlaces([elmStreet, oakFlat, ashHouse, archivedHome])).toEqual([
      {
        homeId: "home-ash",
        homeName: "3 Ash Lane",
        roomId: null,
        roomName: null,
      },
      {
        homeId: "home-elm",
        homeName: "7 Elm Street",
        roomId: "elm-3",
        roomName: "Room 3",
      },
    ]);
  });

  it("treats a tenant who has not moved out as living there", () => {
    expect(emptyPlaces([oakFlat])).toEqual([]);
  });

  it("counts every room as full when one tenant has the whole home", () => {
    const home: DashboardHome = {
      ...elmStreet,
      tenancies: [
        {
          id: "t-all",
          roomId: null,
          name: "Whole",
          startDate: "2026-01-05",
          endDate: null,
        },
      ],
    };
    expect(emptyPlaces([home])).toEqual([]);
  });
});

describe("buildDashboard", () => {
  const summary = buildDashboard({
    homes: [elmStreet, oakFlat, ashHouse, archivedHome],
    charges,
    today: TODAY,
  });

  it("adds up this month's rent expected and received", () => {
    expect(summary.month).toBe("2026-11");
    expect(summary.expectedPence).toBe(55_000 + 50_000 + 120_050);
    expect(summary.receivedPence).toBe(55_000 + 20_000);
  });

  it("adds up rent owed to owners, leaving out archived homes", () => {
    expect(summary.owedToOwnersPence).toBe(90_000 + 70_000);
    expect(summary.marginPence).toBe(225_050 - 160_000);
  });

  it("works out the margin for each home, in name order", () => {
    expect(summary.homes).toEqual([
      {
        id: "home-oak",
        name: "12 Oak Road",
        expectedPence: 120_050,
        receivedPence: 0,
        ownerRentPence: 0,
        marginPence: 120_050,
      },
      {
        id: "home-ash",
        name: "3 Ash Lane",
        expectedPence: 0,
        receivedPence: 0,
        ownerRentPence: 70_000,
        marginPence: -70_000,
      },
      {
        id: "home-elm",
        name: "7 Elm Street",
        expectedPence: 105_000,
        receivedPence: 75_000,
        ownerRentPence: 90_000,
        marginPence: 15_000,
      },
    ]);
  });

  it("lists overdue tenants, longest overdue first, with all they owe", () => {
    expect(summary.overdue).toEqual([
      {
        tenancyId: "t-cara",
        name: "Cara Lund",
        homeId: "home-elm",
        homeName: "7 Elm Street",
        roomName: "Room 3",
        owedPence: 5_000,
        monthsLate: 1,
        oldestDueDate: "2026-10-01",
        oldestMonth: "2026-10",
      },
      {
        tenancyId: "t-ben",
        name: "Ben Osei",
        homeId: "home-elm",
        homeName: "7 Elm Street",
        roomName: "Room 2",
        owedPence: 50_000 + 30_000,
        monthsLate: 2,
        oldestDueDate: "2026-10-10",
        oldestMonth: "2026-10",
      },
    ]);
    expect(summary.overdueTotalPence).toBe(85_000);
  });

  it("does not call rent overdue on its due date", () => {
    const onDueDate = buildDashboard({
      homes: [oakFlat],
      charges: [charge("t-dev", "2026-11", "17", 120_050, 0)],
      today: TODAY,
    });
    expect(onDueDate.overdue).toEqual([]);

    const dayAfter = buildDashboard({
      homes: [oakFlat],
      charges: [charge("t-dev", "2026-11", "17", 120_050, 0)],
      today: "2026-11-18",
    });
    expect(dayAfter.overdue.map((t) => t.name)).toEqual(["Dev Patel"]);
  });

  it("lists empty rooms and homes", () => {
    expect(summary.empty.map((p) => [p.homeName, p.roomName])).toEqual([
      ["3 Ash Lane", null],
      ["7 Elm Street", "Room 3"],
    ]);
  });

  it("is all zeros with no homes", () => {
    expect(buildDashboard({ homes: [], charges: [], today: TODAY })).toEqual({
      month: "2026-11",
      expectedPence: 0,
      receivedPence: 0,
      owedToOwnersPence: 0,
      marginPence: 0,
      homes: [],
      overdue: [],
      overdueTotalPence: 0,
      empty: [],
    });
  });

  it("ignores a charge whose tenant is not in the list of homes", () => {
    const result = buildDashboard({
      homes: [oakFlat],
      charges: [charge("t-unknown", "2026-10", "01", 10_000, 0)],
      today: TODAY,
    });
    expect(result.overdue).toEqual([]);
    expect(result.expectedPence).toBe(0);
  });

  it("leaves out unpaid charges from before a corrected move-in date", () => {
    const home: DashboardHome = {
      ...oakFlat,
      tenancies: [
        {
          id: "t-dev",
          roomId: null,
          name: "Dev Patel",
          // First saved as 2025 by mistake, then corrected to October 2026.
          startDate: "2026-10-12",
          endDate: null,
        },
      ],
    };
    const result = buildDashboard({
      homes: [home],
      charges: [
        charge("t-dev", "2025-12", "25", 120_000, 0), // before move-in
        charge("t-dev", "2026-09", "25", 120_000, 5_000), // paid towards: kept
        charge("t-dev", "2026-10", "25", 120_000, 0),
      ],
      today: TODAY,
    });
    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0]?.monthsLate).toBe(2);
    expect(result.overdue[0]?.owedPence).toBe(115_000 + 120_000);
  });

  it("keeps an archived home on the list while it still has rent this month", () => {
    const home: DashboardHome = {
      ...archivedHome,
      tenancies: [
        {
          id: "t-old",
          roomId: "gone-1",
          name: "Old",
          startDate: "2026-01-05",
          endDate: "2026-11-02",
        },
      ],
    };
    const result = buildDashboard({
      homes: [home],
      charges: [charge("t-old", "2026-11", "01", 40_000, 40_000)],
      today: TODAY,
    });
    expect(result.homes).toEqual([
      {
        id: "home-gone",
        name: "1 Gone Close",
        expectedPence: 40_000,
        receivedPence: 40_000,
        ownerRentPence: 0,
        marginPence: 40_000,
      },
    ]);
    expect(result.owedToOwnersPence).toBe(0);
  });
});
