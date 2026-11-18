/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function probe() {
  const owe = tenantsOwe(count);
  const day = formatDate(today);
  const subject = `Late rent: ${owe} ${total}`;
  const intro = `Here is the late rent for ${organisationName} on ${day}.`;
  const summary = `${owe} ${total} in total.`;
  const more =
    notListed > 0
      ? `And ${notListed} more. See them all on your dashboard.`
      : null;
  const why = "You get this email because late rent emails are turned on.";
}
