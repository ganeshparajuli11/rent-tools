/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
/** "Room 1, 7 Elm Street", or just the home for a whole-home tenant. */
function placeOf(tenant: OverdueTenant): string {
  if (!tenant.roomName) return tenant.homeName;
  return `${tenant.roomName}, ${tenant.homeName}`;
}
