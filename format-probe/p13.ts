/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function probe() {
  const links = [
    htmlLink(dashboardUrl, "See late rent"),
    htmlLink(rentUrl, "Record a payment"),
  ].join(" &middot; ");
  const stop = htmlLink(settingsUrl, "Turn them off in Settings");
}
