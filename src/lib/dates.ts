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
