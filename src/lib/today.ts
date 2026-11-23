import { isValidDateString, LONDON_TIME_ZONE } from "@/lib/dates";
import type {
  DashboardCharge,
  DashboardHome,
  OverdueTenant,
} from "@/lib/dashboard";
import { homeStatus, type HomeStatus } from "@/lib/home-status";
import { formatPence } from "@/lib/money";
import {
  compareRentRows,
  isBeforeMoveIn,
  monthOf,
  monthStart,
  owedPence,
  rentHref,
  rentStatus,
  type RentStatus,
} from "@/lib/rent";

/**
 * The pure parts of the Today page (docs/DESIGN_SYSTEM.md §3.1): the
 * greeting, the "Needs you" list, occupancy, home cards, this month's rent
 * rows and the words for recent activity. Every function is given today's
 * date (and the time, where it matters), so all of it is easy to test.
 *
 * The money sums themselves come from `buildDashboard` in ./dashboard.ts,
 * so Today shows exactly the figures the rent page and the late rent email
 * use.
 */

// ---------------------------------------------------------------------------
// Dates and greeting
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

/** Whole days from one "YYYY-MM-DD" date to another (negative if earlier). */
export function daysBetween(from: string, to: string): number {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new Error("daysBetween expects YYYY-MM-DD dates");
  }
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

const longDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "2026-11-22" -> "Sunday 22 November", the date line above the greeting. */
export function formatTodayLine(today: string): string {
  if (!isValidDateString(today)) return today;
  // en-GB puts a comma after the weekday in some engines: leave it out.
  return longDay.format(new Date(utcDay(today))).replace(",", "");
}

const shortDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

/** "2026-11-05" -> "5 Nov", for dates inside sentences on the Today page. */
export function formatShortDate(date: string): string {
  if (!isValidDateString(date)) return date;
  return shortDay.format(new Date(utcDay(date))).replace("Sept", "Sep");
}

const londonHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** The hour (0 to 23) in London. Pass `now` in tests. */
export function londonHour(now: Date = new Date()): number {
  return Number(londonHourFormat.format(now)) % 24;
}

/** "Good morning" before 12, "Good afternoon" before 18, then "Good evening". */
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The greeting with the person's first name when they gave one: "Good
 * morning, Taylor." or just "Good morning.".
 */
export function greetingLine(hour: number, firstName: string | null): string {
  return firstName
    ? `${greetingFor(hour)}, ${firstName}.`
    : `${greetingFor(hour)}.`;
}

const NUMBER_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

/** The sentence under the greeting. */
export function needsYouSentence(count: number): string {
  if (count <= 0) return "Nothing needs you today. Everything is on track.";
  const amount = NUMBER_WORDS[count] ?? String(count);
  return count === 1
    ? "One thing needs you today. Everything else is on track."
    : `${amount} things need you today. Everything else is on track.`;
}

// ---------------------------------------------------------------------------
// Homes: occupancy and cards
// ---------------------------------------------------------------------------

type HomeOccupancy = {
  /** Rooms in use (not archived). 0 for a home let as a whole. */
  roomCount: number;
  roomsLet: number;
  wholeHomeLet: boolean;
  /** Places to let: the rooms, or 1 for a home let as a whole. */
  places: number;
  placesLet: number;
};

/** A tenant who has not moved out (no end date) lives there. */
function occupancyOf(home: DashboardHome): HomeOccupancy {
  const current = home.tenancies.filter((t) => t.endDate === null);
  const rooms = home.rooms.filter((room) => !room.archived);
  const wholeHomeLet = current.some((t) => t.roomId === null);

  if (rooms.length === 0) {
    return {
      roomCount: 0,
      roomsLet: 0,
      wholeHomeLet,
      places: 1,
      placesLet: wholeHomeLet ? 1 : 0,
    };
  }
  // A tenant for the whole home fills every room.
  const roomsLet = wholeHomeLet
    ? rooms.length
    : rooms.filter((room) => current.some((t) => t.roomId === room.id)).length;
  return {
    roomCount: rooms.length,
    roomsLet,
    wholeHomeLet,
    places: rooms.length,
    placesLet: roomsLet,
  };
}

/**
 * "Rooms let: 8 of 11". Each room counts once, and so does each home let
 * as a whole. Archived homes and rooms are left out.
 */
export function occupancy(homes: readonly DashboardHome[]): {
  total: number;
  let: number;
} {
  let total = 0;
  let placesLet = 0;
  for (const home of homes) {
    if (home.archived) continue;
    const counts = occupancyOf(home);
    total += counts.places;
    placesLet += counts.placesLet;
  }
  return { total, let: placesLet };
}

export type HomeCardData = {
  id: string;
  name: string;
  /** "4 rooms · 3 let" or "Whole home". */
  meta: string;
  status: HomeStatus;
};

/** "Your homes": homes in use, in name order, with their status word. */
export function homeCards(
  homes: readonly DashboardHome[],
  limit: number,
): HomeCardData[] {
  return homes
    .filter((home) => !home.archived)
    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"))
    .slice(0, limit)
    .map((home) => {
      const counts = occupancyOf(home);
      const meta =
        counts.roomCount === 0
          ? "Whole home"
          : `${counts.roomCount === 1 ? "1 room" : `${counts.roomCount} rooms`} · ${counts.roomsLet} let`;
      return {
        id: home.id,
        name: home.name,
        meta,
        status: homeStatus({ archived: false, ...counts }),
      };
    });
}

// ---------------------------------------------------------------------------
// Empty rooms
// ---------------------------------------------------------------------------

/** A room (or whole home) counts in "Needs you" after this many days empty. */
export const EMPTY_NEEDS_YOU_DAYS = 14;

export type LongEmptyPlace = {
  homeId: string;
  homeName: string;
  /** Null when the whole home is empty. */
  roomId: string | null;
  roomName: string | null;
  /** The day the last tenant left, or the day it was added. */
  emptySince: string;
  daysEmpty: number;
};

function latest(dates: readonly (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const date of dates) {
    if (date && (best === null || date > best)) best = date;
  }
  return best;
}

/**
 * Rooms, or whole homes, that have been empty for two weeks or more: since
 * the last tenant moved out, or since the room or home was added if nobody
 * ever lived there. Places with no known date are left out. Longest empty
 * first.
 */
export function longEmptyPlaces(
  homes: readonly DashboardHome[],
  today: string,
): LongEmptyPlace[] {
  const found: LongEmptyPlace[] = [];
  const add = (
    home: DashboardHome,
    room: { id: string; name: string } | null,
    since: string | null,
  ) => {
    if (!since || !isValidDateString(since)) return;
    const daysEmpty = daysBetween(since, today);
    if (daysEmpty < EMPTY_NEEDS_YOU_DAYS) return;
    found.push({
      homeId: home.id,
      homeName: home.name,
      roomId: room?.id ?? null,
      roomName: room?.name ?? null,
      emptySince: since,
      daysEmpty,
    });
  };

  for (const home of homes) {
    if (home.archived) continue;
    const current = home.tenancies.filter((t) => t.endDate === null);
    const rooms = home.rooms.filter((room) => !room.archived);

    if (rooms.length === 0) {
      if (current.length > 0) continue;
      add(
        home,
        null,
        latest(home.tenancies.map((t) => t.endDate)) ?? home.createdOn ?? null,
      );
      continue;
    }

    if (current.some((t) => t.roomId === null)) continue;
    for (const room of rooms) {
      if (current.some((t) => t.roomId === room.id)) continue;
      const lastLeft = latest(
        home.tenancies
          .filter((t) => t.roomId === room.id || t.roomId === null)
          .map((t) => t.endDate),
      );
      add(home, room, lastLeft ?? room.createdOn ?? null);
    }
  }

  return found.sort(
    (a, b) =>
      b.daysEmpty - a.daysEmpty ||
      a.homeName.localeCompare(b.homeName, "en-GB") ||
      (a.roomName ?? "").localeCompare(b.roomName ?? "", "en-GB"),
  );
}

/** 15 -> "2 weeks", 70 -> "2 months". For "empty for …". */
export function emptyForWords(days: number): string {
  if (days < 7) return days === 1 ? "1 day" : `${days} days`;
  if (days < 61) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  const months = Math.floor(days / 30);
  return `${months} months`;
}

// ---------------------------------------------------------------------------
// Needs you
// ---------------------------------------------------------------------------

export type NeedsYouItem = {
  key: string;
  kind: "late" | "empty";
  title: string;
  detail: string;
  action: string;
  href: string;
};

function placeWords(roomName: string | null, homeName: string): string {
  return roomName ? `${roomName}, ${homeName}` : homeName;
}

/**
 * The "Needs you" list: late rent first (longest late first), then rooms
 * empty for two weeks or more. Each item has one action.
 */
export function needsYouItems({
  overdue,
  empty,
  today,
}: {
  overdue: readonly OverdueTenant[];
  empty: readonly LongEmptyPlace[];
  today: string;
}): NeedsYouItem[] {
  const currentMonth = monthOf(today);
  const items: NeedsYouItem[] = [];

  for (const tenant of overdue) {
    const days = Math.max(1, daysBetween(tenant.oldestDueDate, today));
    const amount =
      tenant.monthsLate === 1
        ? formatPence(tenant.owedPence)
        : `${formatPence(tenant.owedPence)} over ${tenant.monthsLate} months`;
    items.push({
      key: `late-${tenant.tenancyId}`,
      kind: "late",
      title: `${tenant.name} is ${days === 1 ? "1 day" : `${days} days`} late`,
      detail: `${amount} · ${placeWords(tenant.roomName, tenant.homeName)} · due ${formatShortDate(tenant.oldestDueDate)}`,
      action: "Record payment",
      href: rentHref({ month: tenant.oldestMonth, currentMonth }),
    });
  }

  for (const place of empty) {
    const params = place.roomId
      ? `?${new URLSearchParams({ room: place.roomId }).toString()}`
      : "";
    items.push({
      key: `empty-${place.roomId ?? place.homeId}`,
      kind: "empty",
      title: `${place.roomName ?? place.homeName} empty for ${emptyForWords(place.daysEmpty)}`,
      detail: place.roomName
        ? `${place.homeName} · empty since ${formatShortDate(place.emptySince)}`
        : `Whole home · empty since ${formatShortDate(place.emptySince)}`,
      action: "Add tenant",
      href: `/homes/${place.homeId}/tenants/new${params}`,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Rent this month
// ---------------------------------------------------------------------------

export const TODAY_RENT_FILTERS = ["all", "late", "due", "paid"] as const;
export type TodayRentFilter = (typeof TODAY_RENT_FILTERS)[number];

export const TODAY_RENT_FILTER_LABELS: Record<TodayRentFilter, string> = {
  all: "All",
  late: "Late",
  due: "Still due",
  paid: "Paid",
};

/** The filter from the address (`/dashboard?rent=late`). Anything else is "all". */
export function parseRentFilter(
  value: string | string[] | undefined,
): TodayRentFilter {
  const text = Array.isArray(value) ? value[0] : value;
  return (TODAY_RENT_FILTERS as readonly string[]).includes(text ?? "")
    ? (text as TodayRentFilter)
    : "all";
}

/**
 * Link to the Today page with a rent filter. "All" keeps the address clean.
 * The page opens at the rent table, not back at the top.
 */
export function todayRentHref(filter: TodayRentFilter): string {
  const query = filter === "all" ? "" : `?rent=${filter}`;
  return `/dashboard${query}#rent-heading`;
}

export type TodayRentRow = {
  chargeId: string;
  tenancyId: string;
  tenantName: string;
  homeId: string;
  homeName: string;
  roomName: string | null;
  dueDate: string;
  amountPence: number;
  paidPence: number;
  owedPence: number;
  status: RentStatus;
};

/**
 * This month's rent, one row per tenant: late first, then due, part paid
 * and paid (the rent page's order). Charges from before a corrected move-in
 * date with nothing paid are left out, as everywhere else.
 */
export function monthRentRows(
  homes: readonly DashboardHome[],
  charges: readonly DashboardCharge[],
  today: string,
): TodayRentRow[] {
  const thisPeriod = monthStart(monthOf(today));
  const places = new Map<
    string,
    {
      name: string;
      startDate: string;
      homeId: string;
      homeName: string;
      roomName: string | null;
    }
  >();
  for (const home of homes) {
    const roomNames = new Map(home.rooms.map((room) => [room.id, room.name]));
    for (const tenancy of home.tenancies) {
      places.set(tenancy.id, {
        name: tenancy.name,
        startDate: tenancy.startDate,
        homeId: home.id,
        homeName: home.name,
        roomName: tenancy.roomId
          ? (roomNames.get(tenancy.roomId) ?? null)
          : null,
      });
    }
  }

  const rows: TodayRentRow[] = [];
  for (const charge of charges) {
    if (charge.periodStart !== thisPeriod || !charge.id) continue;
    const place = places.get(charge.tenancyId);
    if (!place) continue;
    if (
      charge.paidPence === 0 &&
      isBeforeMoveIn(charge.periodStart, place.startDate)
    ) {
      continue;
    }
    rows.push({
      chargeId: charge.id,
      tenancyId: charge.tenancyId,
      tenantName: place.name,
      homeId: place.homeId,
      homeName: place.homeName,
      roomName: place.roomName,
      dueDate: charge.dueDate,
      amountPence: charge.amountPence,
      paidPence: charge.paidPence,
      owedPence: owedPence(charge.amountPence, charge.paidPence),
      status: rentStatus({
        amountPence: charge.amountPence,
        paidPence: charge.paidPence,
        dueDate: charge.dueDate,
        today,
      }),
    });
  }
  return rows.sort(compareRentRows);
}

/** Which filter tab a status belongs to. "Still due" holds Due and Part paid. */
function filterOf(status: RentStatus): Exclude<TodayRentFilter, "all"> {
  if (status === "late") return "late";
  if (status === "paid") return "paid";
  return "due";
}

export function filterRentRows(
  rows: readonly TodayRentRow[],
  filter: TodayRentFilter,
): TodayRentRow[] {
  return filter === "all"
    ? [...rows]
    : rows.filter((row) => filterOf(row.status) === filter);
}

export function rentFilterCounts(
  rows: readonly TodayRentRow[],
): Record<TodayRentFilter, number> {
  const counts: Record<TodayRentFilter, number> = {
    all: rows.length,
    late: 0,
    due: 0,
    paid: 0,
  };
  for (const row of rows) counts[filterOf(row.status)] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export type AuditEntry = {
  id: string;
  action: string;
  recordId: string | null;
  changes: unknown;
  /** ISO timestamp. */
  createdAt: string;
};

/** Names the activity may mention: homes and rooms only, never people. */
export type ActivityLookups = {
  homeNames: ReadonlyMap<string, string>;
  /** Tenancy id -> the name of its home. */
  tenancyHomes: ReadonlyMap<string, string>;
  /** Rent charge id -> the name of its home. */
  chargeHomes: ReadonlyMap<string, string>;
};

function field(value: unknown, ...path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function pence(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * One audit_log row in plain words, e.g. "Payment of £580 recorded at
 * Sample House 01". Only amounts and home names are used: the audit log
 * holds no names or contact details, and nor does this. Null for actions
 * that are not worth showing (or not known).
 */
export function describeActivity(
  entry: AuditEntry,
  lookups: ActivityLookups,
): string | null {
  const { changes, recordId } = entry;
  const homeById = (id: unknown) => {
    const key = text(id);
    return key ? (lookups.homeNames.get(key) ?? null) : null;
  };
  const at = (home: string | null) => (home ? ` at ${home}` : "");

  switch (entry.action) {
    case "payment.recorded":
    case "payment.removed":
    case "payment.restored": {
      // A removed payment is described by its "before"; the others by "after".
      const values = field(
        changes,
        entry.action === "payment.removed" ? "before" : "after",
      );
      const amount = pence(field(values, "amountPence"));
      const tenancyId = text(field(values, "tenancyId"));
      const chargeId = text(field(values, "rentChargeId"));
      const home =
        (tenancyId ? lookups.tenancyHomes.get(tenancyId) : undefined) ??
        (chargeId ? lookups.chargeHomes.get(chargeId) : undefined) ??
        null;
      const what =
        amount === null ? "A payment" : `Payment of ${formatPence(amount)}`;
      const verb =
        entry.action === "payment.recorded"
          ? "recorded"
          : entry.action === "payment.removed"
            ? "removed"
            : "put back";
      return `${what} ${verb}${at(home)}`;
    }
    case "tenant.created":
      return `New tenant added${at(homeById(field(changes, "after", "propertyId")))}`;
    case "tenant.updated":
      return `Tenant details changed${at(recordId ? (lookups.tenancyHomes.get(recordId) ?? null) : null)}`;
    case "tenant.moved_out":
      return `A tenant moved out${at(recordId ? (lookups.tenancyHomes.get(recordId) ?? null) : null)}`;
    case "tenant.move_out_undone":
      return `A move-out was undone${at(recordId ? (lookups.tenancyHomes.get(recordId) ?? null) : null)}`;
    case "tenant.personal_details_removed":
      return "A past tenant's personal details were removed";
    case "home.created": {
      const home = homeById(recordId);
      return home ? `${home} added` : "A home was added";
    }
    case "home.updated": {
      const home = homeById(recordId);
      return home ? `${home} details changed` : "A home's details changed";
    }
    case "home.archived": {
      const home = homeById(recordId);
      return home ? `${home} archived` : "A home was archived";
    }
    case "home.restored": {
      const home = homeById(recordId);
      return home ? `${home} brought back` : "A home was brought back";
    }
    case "room.created": {
      const home = homeById(field(changes, "after", "propertyId"));
      return home ? `Room added to ${home}` : "A room was added";
    }
    case "room.renamed":
      return "A room was renamed";
    case "room.archived":
      return "A room was archived";
    case "room.restored":
      return "A room was brought back";
    case "photo.added": {
      const home = homeById(field(changes, "after", "propertyId"));
      return home ? `Photo added to ${home}` : "A photo was added";
    }
    case "photo.removed": {
      const home = homeById(field(changes, "before", "propertyId"));
      return home ? `Photo removed from ${home}` : "A photo was removed";
    }
    case "data.exported":
      return "Data exported";
    case "organisation.created":
      return "Organisation set up";
    case "organisation.overdue_email_changed":
      return field(changes, "overdue_email_enabled") === false
        ? "Late rent email turned off"
        : "Late rent email turned on";
    default:
      return null;
  }
}

const clockTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const londonDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: LONDON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * When something happened, relative to now in London: "Today, 09:12",
 * "Yesterday, 14:05", "3 days ago", then "5 Nov" after a week.
 */
export function activityWhen(
  createdAt: string,
  now: Date = new Date(),
): {
  when: string;
  day: string;
} {
  const time = new Date(createdAt);
  if (Number.isNaN(time.getTime())) return { when: "", day: "" };
  const day = londonDay.format(time);
  const today = londonDay.format(now);
  const days = daysBetween(day, today);
  if (days <= 0) return { when: `Today, ${clockTime.format(time)}`, day };
  if (days === 1) return { when: `Yesterday, ${clockTime.format(time)}`, day };
  if (days < 7) return { when: `${days} days ago`, day };
  return { when: formatShortDate(day), day };
}
