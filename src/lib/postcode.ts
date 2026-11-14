/**
 * UK postcode helpers.
 *
 * Accepts lower case, extra spaces or no space ("sw1a1aa", " SW1A  1AA ").
 * Normalised form is upper case with one space before the last three
 * characters ("SW1A 1AA"). Covers all standard formats (A9 9AA, A99 9AA,
 * A9A 9AA, AA9 9AA, AA99 9AA, AA9A 9AA) and GIR 0AA.
 */
const COMPACT_POSTCODE =
  /^(?:GIR0AA|[A-PR-UWYZ](?:[0-9]{1,2}|[A-HK-Y][0-9]{1,2}|[0-9][A-HJKPSTUW]|[A-HK-Y][0-9][ABEHMNPRVWXY])[0-9][ABD-HJLNP-UW-Z]{2})$/;

function compact(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidPostcode(input: string): boolean {
  return COMPACT_POSTCODE.test(compact(input));
}

/** Returns the normalised postcode, or null if it is not a valid UK postcode. */
export function normalisePostcode(input: string): string | null {
  const value = compact(input);
  if (!COMPACT_POSTCODE.test(value)) return null;
  return `${value.slice(0, -3)} ${value.slice(-3)}`;
}
