/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
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
