/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function probe() {
  const text = [
    "Hello,",
    "",
    intro,
    summary,
    "",
    ...listed.map(textLine),
    ...(more ? ["", more] : []),
    "",
    `See late rent: ${dashboardUrl}`,
    `Record a payment: ${rentUrl}`,
    "",
    why,
    `To stop them, go to Settings: ${settingsUrl}`,
    "",
  ].join("\n");
}
