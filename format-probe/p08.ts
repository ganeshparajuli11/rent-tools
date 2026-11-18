/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function paragraph(content: string): string {
  return `<p style="margin:0 0 16px">${content}</p>`;
}

function htmlLink(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}" style="color:#1d4ed8">${safeLabel}</a>`;
}
