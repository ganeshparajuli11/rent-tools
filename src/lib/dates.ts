/**
 * Date helpers. All "what day is it" logic uses the Europe/London time zone,
 * because that is where our landlords and their tenants are.
 * Dates are passed around as "YYYY-MM-DD" strings (Postgres `date`).
 */
export const LONDON_TIME_ZONE = "Europe/London";

const londonDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: LONDON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in London as "YYYY-MM-DD". Pass `now` in tests. */
export function todayInLondon(now: Date = new Date()): string {
  return londonDate.format(now);
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 22 -> "22nd". For due days. */
export function ordinal(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as "YYYY-MM-DD" (so not 30 February). */
export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Moves a "YYYY-MM-DD" date by whole years. 29 February moves to
 * 28 February when the new year is not a leap year.
 */
export function addYears(value: string, years: number): string {
  const match = DATE_PATTERN.exec(value);
  if (!match || !isValidDateString(value)) {
    throw new Error("addYears expects a YYYY-MM-DD date");
  }
  const year = String(Number(match[1]) + years).padStart(4, "0");
  const moved = `${year}-${match[2]}-${match[3]}`;
  return isValidDateString(moved) ? moved : `${year}-02-28`;
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * "2026-01-05" -> "5 January 2026". The value is a calendar date with no
 * time, so it is formatted as-is and never shifted by a time zone.
 */
export function formatDate(value: string): string {
  const match = DATE_PATTERN.exec(value);
  if (!match || !isValidDateString(value)) return value;
  return longDate.format(
    new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    ),
  );
}

/**
 * "2026-01-05" -> "05/01/2026", the UK short date used in tables, forms and
 * records (docs/DESIGN_SYSTEM.md §5). Also takes a full timestamp
 * ("2026-01-05T23:30:00Z"), which is shown as its day in London.
 * Anything that is not a real date is returned unchanged.
 */
export function formatDateUK(value: string): string {
  const day = DATE_PATTERN.test(value) ? value : timestampDay(value);
  if (!day || !isValidDateString(day)) return value;
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

/** The London calendar day of an ISO timestamp, or null. */
function timestampDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return null;
  return todayInLondon(time);
}

/** The later of two "YYYY-MM-DD" dates. */
export function laterDate(a: string, b: string): string {
  return a >= b ? a : b;
}
