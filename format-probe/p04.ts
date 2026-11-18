/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function tenantsOwe(count: number): string {
  return count === 1 ? "1 tenant owes" : `${count} tenants owe`;
}
