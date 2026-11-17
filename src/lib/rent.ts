import { isValidDateString, todayInLondon } from "@/lib/dates";

/**
 * Rent helpers: months, due dates, which months a tenant is charged for, and
 * the status of a month's rent.
 *
 * Rent is charged once per calendar month. A month is written "YYYY-MM" and
 * a charge's `period_start` is always the first day of its month. "Today" is
 * always today in London (see src/lib/dates.ts) and is passed in, so every
 * function here is pure and easy to test.
 *
 * Status is always worked out from the charge, its payments and today's
 * date. It is never stored.
 */

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** True for a month written as "YYYY-MM", like "2026-11". */
export function isValidMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** "2026-11-17" -> "2026-11". */
export function monthOf(date: string): string {
  if (!isValidDateString(date)) {
    throw new Error("monthOf expects a YYYY-MM-DD date");
  }
  return date.slice(0, 7);
}

/** This month in London as "YYYY-MM". Pass `now` in tests. */
export function currentMonthInLondon(now: Date = new Date()): string {
  return monthOf(todayInLondon(now));
}

function partsOf(month: string): { year: number; monthNumber: number } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) throw new Error("Expected a YYYY-MM month");
  return { year: Number(match[1]), monthNumber: Number(match[2]) };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** First day of the month: "2026-11" -> "2026-11-01". */
export function monthStart(month: string): string {
  partsOf(month);
  return `${month}-01`;
}

/** Last day of the month: "2026-02" -> "2026-02-28", "2028-02" -> "2028-02-29". */
export function monthEnd(month: string): string {
  const { year, monthNumber } = partsOf(month);
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${pad(lastDay)}`;
}

/** Moves a month forwards or backwards: ("2026-12", 1) -> "2027-01". */
export function addMonths(month: string, count: number): string {
  const { year, monthNumber } = partsOf(month);
  const index = year * 12 + (monthNumber - 1) + count;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Every month from `from` to `to`, both included. Empty when `from` is later. */
export function monthsBetween(from: string, to: string): string[] {
  partsOf(from);
  partsOf(to);
  const months: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months;
}

const monthName = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "2026-11" -> "November 2026". */
export function formatMonth(month: string): string {
  const { year, monthNumber } = partsOf(month);
  return monthName.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

const dayAndMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

/** "2026-11-05" -> "5 November". For dates where the year is already clear. */
export function formatDayAndMonth(date: string): string {
  if (!isValidDateString(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  return dayAndMonth.format(new Date(Date.UTC(year!, month! - 1, day!)));
}

type MonthParam = string | string[] | undefined;

/**
 * The month from a page address (`/rent?month=2026-10`). Anything missing,
 * malformed or later than this month becomes this month, so a bad link can
 * never cause an error.
 */
export function parseMonthParam(
  value: MonthParam,
  currentMonth: string,
): string {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !isValidMonth(text) || text > currentMonth) return currentMonth;
  return text;
}

/** Link to the rent page. This month and page 1 are left out of the address. */
export function rentHref({
  month,
  currentMonth,
  page = 1,
}: {
  month: string;
  currentMonth: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (month !== currentMonth) params.set("month", month);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/rent?${qs}` : "/rent";
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

/**
 * The day a month's rent is due. Due days are 1 to 28, so the day exists in
 * every month. In the month a tenant moves in, rent is not due before the
 * day they move in.
 */
export function dueDateFor(
  month: string,
  dueDay: number,
  startDate?: string,
): string {
  partsOf(month);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    throw new Error("dueDateFor expects a due day from 1 to 28");
  }
  const due = `${month}-${pad(dueDay)}`;
  return startDate && monthOf(startDate) === month && startDate > due
    ? startDate
    : due;
}

/**
 * The months a tenant should have a rent charge for, as of today: from the
 * month they move in to this month, or to the month they moved out if that
 * is earlier. A tenant who has not moved in yet has none.
 */
export function chargeMonths({
  startDate,
  endDate,
  today,
}: {
  startDate: string;
  endDate: string | null;
  today: string;
}): string[] {
  const thisMonth = monthOf(today);
  const last =
    endDate !== null && monthOf(endDate) < thisMonth
      ? monthOf(endDate)
      : thisMonth;
  return monthsBetween(monthOf(startDate), last);
}

/**
 * True when a charge is for a month before the tenant moved in. This can
 * happen when a move-in date is corrected to a later date after charges were
 * made. Such a charge is not real rent, so it is left out (unless something
 * was paid towards it) rather than shown as late for ever.
 */
export function isBeforeMoveIn(
  chargePeriodStart: string,
  tenancyStartDate: string,
): boolean {
  return chargePeriodStart < monthStart(monthOf(tenancyStartDate));
}

export type PlannedCharge = {
  periodStart: string;
  dueDate: string;
  amountPence: number;
};

/** One charge for each month from `chargeMonths`, at the tenant's rent. */
export function plannedCharges(tenancy: {
  startDate: string;
  endDate: string | null;
  dueDay: number;
  rentPence: number;
  today: string;
}): PlannedCharge[] {
  return chargeMonths(tenancy).map((month) => ({
    periodStart: monthStart(month),
    dueDate: dueDateFor(month, tenancy.dueDay, tenancy.startDate),
    amountPence: tenancy.rentPence,
  }));
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** In the order the rent page lists them: late tenants first. */
export const RENT_STATUSES = ["late", "due", "part_paid", "paid"] as const;
export type RentStatus = (typeof RENT_STATUSES)[number];

export const RENT_STATUS_LABELS: Record<RentStatus, string> = {
  late: "Late",
  due: "Due",
  part_paid: "Part paid",
  paid: "Paid",
};

/** Adds up whole pence. */
export function sumPence(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/** What is still to pay. Never below zero. */
export function owedPence(amountPence: number, paidPence: number): number {
  return Math.max(0, amountPence - paidPence);
}

/**
 * The status of one month's rent:
 *  - Paid: the payments cover the rent.
 *  - Late: not fully paid and the due date has passed (even if part is paid).
 *  - Part paid: something is paid and it is not past the due date.
 *  - Due: nothing paid yet and it is not past the due date.
 * Rent is late from the day after its due date.
 */
export function rentStatus({
  amountPence,
  paidPence,
  dueDate,
  today,
}: {
  amountPence: number;
  paidPence: number;
  dueDate: string;
  today: string;
}): RentStatus {
  if (paidPence >= amountPence) return "paid";
  if (today > dueDate) return "late";
  return paidPence > 0 ? "part_paid" : "due";
}

/**
 * Order for the rent page: late first, then due, part paid and paid. Within
 * a status, the earliest due date first, then by name.
 */
export function compareRentRows(
  a: { status: RentStatus; dueDate: string; tenantName: string },
  b: { status: RentStatus; dueDate: string; tenantName: string },
): number {
  return (
    RENT_STATUSES.indexOf(a.status) - RENT_STATUSES.indexOf(b.status) ||
    a.dueDate.localeCompare(b.dueDate) ||
    a.tenantName.localeCompare(b.tenantName, "en-GB")
  );
}
