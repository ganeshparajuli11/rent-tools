/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
type DigestLine = {
  name: string;
  place: string;
  owed: string;
  since: string;
};

function lineOf(tenant: OverdueTenant): DigestLine {
  return {
    name: tenant.name,
    place: placeOf(tenant),
    owed: formatPence(tenant.owedPence),
    since: formatDate(tenant.oldestDueDate),
  };
}
