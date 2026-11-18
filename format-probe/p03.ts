/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
/** "https://app.example.com/" + "/rent" -> "https://app.example.com/rent". */
export function appLink(appUrl: string, path: string): string {
  return `${appUrl.replace(/\/+$/, "")}${path}`;
}
