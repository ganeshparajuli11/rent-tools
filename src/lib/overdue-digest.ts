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

/** Makes text safe to put inside HTML. Tenant and home names are typed by users. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  return tenant.roomName
    ? `${tenant.roomName}, ${tenant.homeName}`
    : tenant.homeName;
}

function lineOf(tenant: OverdueTenant): {
  name: string;
  place: string;
  owed: string;
  since: string;
} {
  return {
    name: tenant.name,
    place: placeOf(tenant),
    owed: formatPence(tenant.owedPence),
    since: formatDate(tenant.oldestDueDate),
  };
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

  const subject = `Late rent: ${tenantsOwe(count)} ${total}`;
  const intro = `Here is the late rent for ${organisationName} on ${formatDate(today)}.`;
  const summary = `${tenantsOwe(count)} ${total} in total.`;
  const more =
    notListed > 0
      ? `And ${notListed} more. See them all on your dashboard.`
      : null;
  const why =
    "You get this email because late rent emails are turned on for your account.";

  const text = [
    "Hello,",
    "",
    intro,
    summary,
    "",
    ...listed.map(
      (line) =>
        `- ${line.name} (${line.place}): ${line.owed}, late since ${line.since}`,
    ),
    ...(more ? ["", more] : []),
    "",
    `See late rent: ${dashboardUrl}`,
    `Record a payment: ${rentUrl}`,
    "",
    why,
    `To stop them, go to Settings: ${settingsUrl}`,
    "",
  ].join("\n");

  const e = escapeHtml;
  const paragraph = (content: string) =>
    `<p style="margin:0 0 16px">${content}</p>`;
  const link = (href: string, label: string) =>
    `<a href="${e(href)}" style="color:#1d4ed8">${e(label)}</a>`;

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111827;max-width:600px">',
    paragraph("Hello,"),
    paragraph(e(intro)),
    paragraph(`<strong>${e(summary)}</strong>`),
    '<ul style="margin:0 0 16px;padding-left:20px">',
    ...listed.map(
      (line) =>
        `<li style="margin:0 0 8px"><strong>${e(line.name)}</strong> (${e(line.place)}): ${e(line.owed)}, late since ${e(line.since)}</li>`,
    ),
    "</ul>",
    ...(more ? [paragraph(e(more))] : []),
    paragraph(
      `${link(dashboardUrl, "See late rent")} &middot; ${link(rentUrl, "Record a payment")}`,
    ),
    `<p style="margin:0;font-size:14px;color:#4b5563">${e(why)} ${link(settingsUrl, "Turn them off in Settings")}.</p>`,
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
