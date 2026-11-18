import type { OverdueTenant } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import { formatPence } from "@/lib/money";

/**
 * The daily "late rent" email: what it says, and whether to send it.
 * Pure: no database, no email service. The daily job in
 * src/server/overdue-reminders.ts gives it the late tenants (worked out by
 * `buildDashboard`, the same sums as the dashboard) and sends the result.
 */

/** The most tenants listed in one email. The rest are counted. */
export const DIGEST_MAX_LISTED = 50;

export type OverdueDigest = {
  subject: string;
  text: string;
  html: string;
};

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

/** "https://app.example.com/" + "/rent" -> "https://app.example.com/rent". */
export function appLink(appUrl: string, path: string): string {
  return `${appUrl.replace(/\/+$/, "")}${path}`;
}

function tenantsOwe(count: number): string {
  return count === 1 ? "1 tenant owes" : `${count} tenants owe`;
}

/** "Room 1, 7 Elm Street", or just the home for a whole-home tenant. */
function placeOf(tenant: OverdueTenant): string {
  if (!tenant.roomName) return tenant.homeName;
  return `${tenant.roomName}, ${tenant.homeName}`;
}

type DigestLine = {
  name: string;
  place: string;
  owed: string;
  since: string;
};

function lineOf(tenant: OverdueTenant): DigestLine {
  return {
    name: tenant.name,
    place: placeOf(tenant),
    owed: formatPence(tenant.owedPence),
    since: formatDate(tenant.oldestDueDate),
  };
}

const BODY_STYLE = [
  "font-family:Arial,Helvetica,sans-serif",
  "font-size:16px",
  "line-height:1.5",
  "color:#111827",
  "max-width:600px",
].join(";");
const LIST_STYLE = "margin:0 0 16px;padding-left:20px";
const SMALL_STYLE = "margin:0;font-size:14px;color:#4b5563";

function paragraph(content: string): string {
  return `<p style="margin:0 0 16px">${content}</p>`;
}

function htmlLink(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<a href="${safeHref}" style="color:#1d4ed8">${safeLabel}</a>`;
}

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

/**
 * The email for one organisation. `overdue` is in the dashboard's order
 * (longest overdue first). Names only ever go in the body, never the
 * subject, so a name cannot change the email's headers.
 */
export function buildOverdueDigest({
  organisationName,
  overdue,
  totalPence,
  today,
  appUrl,
}: {
  organisationName: string;
  overdue: readonly OverdueTenant[];
  totalPence: number;
  /** Today in London, "YYYY-MM-DD". */
  today: string;
  appUrl: string;
}): OverdueDigest {
  const count = overdue.length;
  const total = formatPence(totalPence);
  const listed = overdue.slice(0, DIGEST_MAX_LISTED).map(lineOf);
  const notListed = count - listed.length;

  const dashboardUrl = appLink(appUrl, "/dashboard");
  const rentUrl = appLink(appUrl, "/rent");
  const settingsUrl = appLink(appUrl, "/settings");

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

  const links = [
    htmlLink(dashboardUrl, "See late rent"),
    htmlLink(rentUrl, "Record a payment"),
  ].join(" &middot; ");
  const stop = htmlLink(settingsUrl, "Turn them off in Settings");

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

  return { subject, text, html };
}

export type DigestDecision =
  | "send"
  | "turned-off"
  | "already-sent"
  | "nothing-late"
  | "no-recipients";

/** Whether to send an organisation its email today, and if not, why not. */
export function digestDecision({
  enabled,
  alreadySentToday,
  overdueCount,
  recipientCount,
}: {
  enabled: boolean;
  alreadySentToday: boolean;
  overdueCount: number;
  recipientCount: number;
}): DigestDecision {
  if (!enabled) return "turned-off";
  if (alreadySentToday) return "already-sent";
  if (overdueCount === 0) return "nothing-late";
  if (recipientCount === 0) return "no-recipients";
  return "send";
}
