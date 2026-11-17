/**
 * The check for the cron route's secret header.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` with every
 * scheduled request. Anything else is refused. With no secret set, or one
 * that is too short to be safe, every request is refused: the route is
 * closed until it is set up properly.
 */

/** A shorter secret is treated as "not set". */
export const MIN_CRON_SECRET_LENGTH = 16;

export function isCronSecretUsable(secret: string | undefined): boolean {
  return typeof secret === "string" && secret.length >= MIN_CRON_SECRET_LENGTH;
}

/**
 * True only when the header is exactly "Bearer <secret>". Every character is
 * compared, whatever the header is, so the time taken does not give away how
 * much of a guess was right.
 */
export function isCronAuthorised(
  authorizationHeader: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!isCronSecretUsable(secret) || !authorizationHeader) return false;

  const expected = `Bearer ${secret}`;
  let difference = authorizationHeader.length === expected.length ? 0 : 1;
  for (let i = 0; i < expected.length; i += 1) {
    // Past the end of the header, charCodeAt gives NaN, which counts as 0.
    difference |=
      expected.charCodeAt(i) ^ (authorizationHeader.charCodeAt(i) || 0);
  }
  return difference === 0;
}
