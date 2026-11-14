/**
 * Money helpers. All money is stored and calculated as whole pence
 * (integers). Pounds only exist at the edges: what people type and what
 * they read. Never use floating-point maths on money.
 */

/** Largest amount accepted from a form: £1,000,000.00. */
export const MAX_PENCE = 100_000_000;

const POUNDS_PATTERN = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/**
 * Converts what someone typed in pounds to integer pence.
 * Accepts "650", "650.5", "650.50", "£650", "1,250.00" and surrounding spaces.
 * Returns null if it is not a valid, non-negative amount with at most 2
 * decimal places, or is above MAX_PENCE.
 */
export function poundsToPence(input: string | number): number | null {
  const text = String(input).trim().replace(/^£/, "").replace(/,/g, "").trim();
  const match = POUNDS_PATTERN.exec(text);
  if (!match) return null;

  const pounds = Number.parseInt(match[1]!, 10);
  const pence = Number.parseInt((match[2] ?? "").padEnd(2, "0"), 10);
  const total = pounds * 100 + pence;

  return total <= MAX_PENCE ? total : null;
}

const formatWhole = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatWithPence = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats pence for people to read, in en-GB pounds.
 * Whole pounds drop the ".00" ("£650"), otherwise two decimals ("£650.50").
 */
export function formatPence(pence: number): string {
  if (!Number.isInteger(pence)) {
    throw new Error("formatPence expects whole pence");
  }
  // Integer division keeps this exact; the formatter only adds symbols.
  return pence % 100 === 0
    ? formatWhole.format(pence / 100)
    : formatWithPence.format(pence / 100);
}

/** Pence back to the plain text used to pre-fill a pounds input: "650" or "650.50". */
export function penceToPoundsInput(pence: number): string {
  const pounds = Math.trunc(pence / 100);
  const rest = Math.abs(pence % 100);
  return rest === 0
    ? String(pounds)
    : `${pounds}.${String(rest).padStart(2, "0")}`;
}
