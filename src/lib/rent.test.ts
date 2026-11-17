import { describe, expect, it } from "vitest";

import {
  addMonths,
  chargeMonths,
  compareRentRows,
  currentMonthInLondon,
  dueDateFor,
  formatDayAndMonth,
  formatMonth,
  isBeforeMoveIn,
  isValidMonth,
  monthEnd,
  monthOf,
  monthsBetween,
  monthStart,
  owedPence,
  parseMonthParam,
  plannedCharges,
  rentHref,
  rentStatus,
  type RentStatus,
  sumPence,
} from "./rent";

describe("months", () => {
  it("accepts only real YYYY-MM months", () => {
    expect(isValidMonth("2026-11")).toBe(true);
    expect(isValidMonth("2026-01")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth("2026-11-01")).toBe(false);
    expect(isValidMonth("")).toBe(false);
  });

  it("takes the month from a date", () => {
    expect(monthOf("2026-11-17")).toBe("2026-11");
    expect(() => monthOf("2026-02-30")).toThrow();
    expect(() => monthOf("nonsense")).toThrow();
  });

  it("uses London time for the current month", () => {
    // 23:30 UTC on 31 July is already 1 August in London (BST).
    expect(currentMonthInLondon(new Date("2026-07-31T23:30:00Z"))).toBe(
      "2026-08",
    );
    expect(currentMonthInLondon(new Date("2026-07-31T22:59:00Z"))).toBe(
      "2026-07",
    );
    // In winter London is on UTC.
    expect(currentMonthInLondon(new Date("2026-12-31T23:59:59Z"))).toBe(
      "2026-12",
    );
    expect(currentMonthInLondon(new Date("2027-01-01T00:00:00Z"))).toBe(
      "2027-01",
    );
  });

  it("finds the first and last day of a month", () => {
    expect(monthStart("2026-11")).toBe("2026-11-01");
    expect(monthEnd("2026-11")).toBe("2026-11-30");
    expect(monthEnd("2026-12")).toBe("2026-12-31");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(() => monthStart("2026-13")).toThrow();
  });

  it("moves months forwards and backwards across years", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", -14)).toBe("2025-01");
    expect(addMonths("2026-03", 0)).toBe("2026-03");
  });

  it("lists the months between two months", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(monthsBetween("2026-11", "2026-11")).toEqual(["2026-11"]);
    expect(monthsBetween("2026-12", "2026-11")).toEqual([]);
  });

  it("formats months and days for people", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(formatMonth("2027-01")).toBe("January 2027");
    expect(formatDayAndMonth("2026-11-05")).toBe("5 November");
    expect(formatDayAndMonth("not a date")).toBe("not a date");
  });
});

describe("parseMonthParam", () => {
  it("keeps a valid month that is not in the future", () => {
    expect(parseMonthParam("2026-10", "2026-11")).toBe("2026-10");
    expect(parseMonthParam("2026-11", "2026-11")).toBe("2026-11");
    expect(parseMonthParam(["2026-09", "2026-10"], "2026-11")).toBe("2026-09");
  });

  it("falls back to this month for anything else", () => {
    expect(parseMonthParam(undefined, "2026-11")).toBe("2026-11");
    expect(parseMonthParam("", "2026-11")).toBe("2026-11");
    expect(parseMonthParam("2026-12", "2026-11")).toBe("2026-11");
    expect(parseMonthParam("2026-13", "2026-11")).toBe("2026-11");
    expect(parseMonthParam("'; drop table", "2026-11")).toBe("2026-11");
  });
});

describe("rentHref", () => {
  it("leaves out this month and page 1", () => {
    expect(rentHref({ month: "2026-11", currentMonth: "2026-11" })).toBe(
      "/rent",
    );
    expect(rentHref({ month: "2026-10", currentMonth: "2026-11" })).toBe(
      "/rent?month=2026-10",
    );
    expect(
      rentHref({ month: "2026-10", currentMonth: "2026-11", page: 2 }),
    ).toBe("/rent?month=2026-10&page=2");
    expect(
      rentHref({ month: "2026-11", currentMonth: "2026-11", page: 3 }),
    ).toBe("/rent?page=3");
  });
});

describe("dueDateFor", () => {
  it("uses the due day in that month", () => {
    expect(dueDateFor("2026-11", 5)).toBe("2026-11-05");
    expect(dueDateFor("2026-02", 28)).toBe("2026-02-28");
    expect(dueDateFor("2026-11", 1, "2026-01-20")).toBe("2026-11-01");
  });

  it("is never before the move-in date in the first month", () => {
    expect(dueDateFor("2026-11", 5, "2026-11-20")).toBe("2026-11-20");
    expect(dueDateFor("2026-11", 25, "2026-11-20")).toBe("2026-11-25");
    expect(dueDateFor("2026-11", 20, "2026-11-20")).toBe("2026-11-20");
  });

  it("rejects due days outside 1 to 28", () => {
    expect(() => dueDateFor("2026-11", 0)).toThrow();
    expect(() => dueDateFor("2026-11", 29)).toThrow();
    expect(() => dueDateFor("2026-11", 1.5)).toThrow();
  });
});

describe("chargeMonths", () => {
  it("runs from the move-in month to this month", () => {
    expect(
      chargeMonths({
        startDate: "2026-09-20",
        endDate: null,
        today: "2026-11-17",
      }),
    ).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("includes this month for a tenant who moved in today", () => {
    expect(
      chargeMonths({
        startDate: "2026-11-17",
        endDate: null,
        today: "2026-11-17",
      }),
    ).toEqual(["2026-11"]);
  });

  it("is empty for a tenant who moves in in a later month", () => {
    expect(
      chargeMonths({
        startDate: "2026-12-01",
        endDate: null,
        today: "2026-11-17",
      }),
    ).toEqual([]);
  });

  it("stops at the month the tenant moved out", () => {
    expect(
      chargeMonths({
        startDate: "2026-06-10",
        endDate: "2026-08-03",
        today: "2026-11-17",
      }),
    ).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("does not run past this month when the end date is later", () => {
    expect(
      chargeMonths({
        startDate: "2026-10-01",
        endDate: "2026-11-17",
        today: "2026-11-17",
      }),
    ).toEqual(["2026-10", "2026-11"]);
  });

  it("uses the London month at the turn of a year", () => {
    expect(
      chargeMonths({
        startDate: "2026-12-15",
        endDate: null,
        today: "2027-01-01",
      }),
    ).toEqual(["2026-12", "2027-01"]);
  });
});

describe("isBeforeMoveIn", () => {
  it("is true only for months before the move-in month", () => {
    expect(isBeforeMoveIn("2026-09-01", "2026-10-12")).toBe(true);
    expect(isBeforeMoveIn("2025-12-01", "2026-10-12")).toBe(true);
    // The move-in month itself counts, whatever the day.
    expect(isBeforeMoveIn("2026-10-01", "2026-10-12")).toBe(false);
    expect(isBeforeMoveIn("2026-11-01", "2026-10-12")).toBe(false);
  });
});

describe("plannedCharges", () => {
  it("makes one charge per month, due on the due day", () => {
    expect(
      plannedCharges({
        startDate: "2026-09-20",
        endDate: null,
        dueDay: 5,
        rentPence: 55_050,
        today: "2026-11-17",
      }),
    ).toEqual([
      // The first month is due on the move-in day, not before it.
      { periodStart: "2026-09-01", dueDate: "2026-09-20", amountPence: 55_050 },
      { periodStart: "2026-10-01", dueDate: "2026-10-05", amountPence: 55_050 },
      { periodStart: "2026-11-01", dueDate: "2026-11-05", amountPence: 55_050 },
    ]);
  });

  it("gives the same answer every time (safe to repeat)", () => {
    const tenancy = {
      startDate: "2026-11-01",
      endDate: null,
      dueDay: 1,
      rentPence: 60_000,
      today: "2026-11-17",
    };
    expect(plannedCharges(tenancy)).toEqual(plannedCharges(tenancy));
  });
});

describe("money sums", () => {
  it("adds whole pence", () => {
    expect(sumPence([])).toBe(0);
    expect(sumPence([20_000, 35_050, 1])).toBe(55_051);
  });

  it("works out what is still owed, never below zero", () => {
    expect(owedPence(55_000, 20_000)).toBe(35_000);
    expect(owedPence(55_000, 55_000)).toBe(0);
    expect(owedPence(55_000, 60_000)).toBe(0);
  });
});

describe("rentStatus", () => {
  const charge = { amountPence: 55_000, dueDate: "2026-11-05" };

  it("is Due before and on the due date with nothing paid", () => {
    expect(rentStatus({ ...charge, paidPence: 0, today: "2026-11-01" })).toBe(
      "due",
    );
    expect(rentStatus({ ...charge, paidPence: 0, today: "2026-11-05" })).toBe(
      "due",
    );
  });

  it("is Late from the day after the due date", () => {
    expect(rentStatus({ ...charge, paidPence: 0, today: "2026-11-06" })).toBe(
      "late",
    );
  });

  it("is Part paid when some is paid and it is not late yet", () => {
    expect(
      rentStatus({ ...charge, paidPence: 20_000, today: "2026-11-05" }),
    ).toBe("part_paid");
  });

  it("is Late when part is paid but the due date has passed", () => {
    expect(
      rentStatus({ ...charge, paidPence: 54_999, today: "2026-11-06" }),
    ).toBe("late");
  });

  it("is Paid when the payments cover the rent, whatever the date", () => {
    expect(
      rentStatus({ ...charge, paidPence: 55_000, today: "2026-11-01" }),
    ).toBe("paid");
    expect(
      rentStatus({ ...charge, paidPence: 55_000, today: "2027-01-01" }),
    ).toBe("paid");
    expect(
      rentStatus({ ...charge, paidPence: 60_000, today: "2026-11-30" }),
    ).toBe("paid");
  });

  it("treats a £0 rent as paid", () => {
    expect(
      rentStatus({
        amountPence: 0,
        paidPence: 0,
        dueDate: "2026-11-05",
        today: "2026-11-30",
      }),
    ).toBe("paid");
  });
});

describe("compareRentRows", () => {
  const row = (status: RentStatus, dueDate: string, tenantName: string) => ({
    status,
    dueDate,
    tenantName,
  });

  it("puts late tenants first, then due, part paid and paid", () => {
    const rows = [
      row("paid", "2026-11-01", "Paid Pat"),
      row("part_paid", "2026-11-20", "Part Pam"),
      row("due", "2026-11-25", "Due Dan"),
      row("late", "2026-11-05", "Late Lee"),
    ];
    expect(rows.sort(compareRentRows).map((r) => r.tenantName)).toEqual([
      "Late Lee",
      "Due Dan",
      "Part Pam",
      "Paid Pat",
    ]);
  });

  it("orders by due date, then name, within a status", () => {
    const rows = [
      row("late", "2026-11-05", "Zed"),
      row("late", "2026-11-05", "amy"),
      row("late", "2026-11-01", "Mo"),
    ];
    expect(rows.sort(compareRentRows).map((r) => r.tenantName)).toEqual([
      "Mo",
      "amy",
      "Zed",
    ]);
  });
});
