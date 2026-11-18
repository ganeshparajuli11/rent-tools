/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
/**
 * The email for one organisation. `overdue` is in the dashboard's order
 * (longest overdue first). Names only ever go in the body, never the
 * subject, so a name cannot change the email's headers.
 */
export function buildOverdueDigest({
  organisationName,
  overdue,
  totalPence,
  today,
  appUrl,
}: {
  organisationName: string;
  overdue: readonly OverdueTenant[];
  totalPence: number;
  /** Today in London, "YYYY-MM-DD". */
  today: string;
  appUrl: string;
}): OverdueDigest {
  const count = overdue.length;
  const total = formatPence(totalPence);
  const listed = overdue.slice(0, DIGEST_MAX_LISTED).map(lineOf);
  const notListed = count - listed.length;

  const dashboardUrl = appLink(appUrl, "/dashboard");
  const rentUrl = appLink(appUrl, "/rent");
  const settingsUrl = appLink(appUrl, "/settings");
  return 1;
}
