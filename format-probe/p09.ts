/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
function textLine(line: DigestLine): string {
  const { name, place, owed, since } = line;
  return `- ${name} (${place}): ${owed}, late since ${since}`;
}

function htmlLine(line: DigestLine): string {
  const name = escapeHtml(line.name);
  const place = escapeHtml(line.place);
  const owed = escapeHtml(line.owed);
  const since = escapeHtml(line.since);
  const who = `<strong>${name}</strong> (${place})`;
  return `<li style="margin:0 0 8px">${who}: ${owed}, late since ${since}</li>`;
}
