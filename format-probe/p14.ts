/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function probe() {
  const html = [
    `<div style="${BODY_STYLE}">`,
    paragraph("Hello,"),
    paragraph(escapeHtml(intro)),
    paragraph(`<strong>${escapeHtml(summary)}</strong>`),
    `<ul style="${LIST_STYLE}">`,
    ...listed.map(htmlLine),
    "</ul>",
    ...(more ? [paragraph(escapeHtml(more))] : []),
    paragraph(links),
    `<p style="${SMALL_STYLE}">${escapeHtml(why)} ${stop}.</p>`,
    "</div>",
  ].join("\n");
}
