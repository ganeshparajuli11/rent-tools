/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Makes text safe inside HTML. Tenant and home names are typed by users. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}
