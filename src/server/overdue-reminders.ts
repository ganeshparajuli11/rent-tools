import "server-only";

import { buildDashboard } from "@/lib/dashboard";
import { todayInLondon } from "@/lib/dates";
import {
  buildOverdueDigest,
  type DigestDecision,
  digestDecision,
} from "@/lib/overdue-digest";

import type { Db } from "./context";
import { loadDashboardHomes } from "./dashboard";
import type { EmailMessage, SendResult } from "./email";
import { getDashboardCharges } from "./rent";

/**
 * The daily "late rent" email (backlog item 6).
 *
 * For each organisation: if the email is turned on, has not been sent
 * today (London), and some rent is late, the owners get one email listing
 * the late tenants. "Late" is exactly what the dashboard shows: the same
 * queries and the same tested sums (`buildDashboard`).
 *
 * Sending happens at most once per organisation per London day: a sent
 * email is recorded in audit_log (which is also the check), and Resend gets
 * an idempotency key made from the organisation and the day.
 *
 * `db` is the service-role client in the cron route, because the job has no
 * signed-in user and covers every organisation. It only reads, apart from
 * one audit_log row per email sent. Sending, and finding owners' email
 * addresses, are passed in, so this file never imports the service-role
 * client or the email service itself.
 */

export const DIGEST_AUDIT_ACTION = "overdue_digest.sent";

const ORGANISATION_PAGE_SIZE = 500;
const AUDIT_PAGE_SIZE = 1000;

export type OverdueRemindersResult = {
  today: string;
  /** "not-ready" until the migration with the on/off switch is applied. */
  status: "done" | "not-ready";
  organisationsChecked: number;
  counts: Record<DigestDecision | "failed", number>;
};

type Organisation = {
  id: string;
  name: string;
  overdue_email_enabled: boolean;
};

function codeOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

/** Postgres "undefined column" (42703) or PostgREST "column not found". */
function isMissingColumn(error: unknown): boolean {
  const code = codeOf(error);
  return code === "42703" || code === "PGRST204";
}

/** Every organisation, or null when the on/off column does not exist yet. */
async function loadOrganisations(db: Db): Promise<Organisation[] | null> {
  const all: Organisation[] = [];
  for (let from = 0; ; from += ORGANISATION_PAGE_SIZE) {
    const { data, error } = await db
      .from("organisations")
      .select("id, name, overdue_email_enabled")
      .order("id", { ascending: true })
      .range(from, from + ORGANISATION_PAGE_SIZE - 1);
    if (error) {
      if (isMissingColumn(error)) return null;
      throw error;
    }
    all.push(...data);
    if (data.length < ORGANISATION_PAGE_SIZE) return all;
  }
}

/** Organisations that were already sent today's email. */
async function sentToday(
  db: Db,
  today: string,
  now: Date,
): Promise<Set<string>> {
  // Look back far enough to cover any London day, then match the day itself.
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const sent = new Set<string>();
  for (let from = 0; ; from += AUDIT_PAGE_SIZE) {
    const { data, error } = await db
      .from("audit_log")
      .select("organisation_id, changes")
      .eq("action", DIGEST_AUDIT_ACTION)
      .gte("created_at", since)
      .order("id", { ascending: true })
      .range(from, from + AUDIT_PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data) {
      const changes = row.changes as { day?: unknown } | null;
      if (changes?.day === today) sent.add(row.organisation_id);
    }
    if (data.length < AUDIT_PAGE_SIZE) return sent;
  }
}

/**
 * The email addresses of an organisation's owners. Needs the service-role
 * client: other users' addresses are only in Supabase Auth.
 */
export function ownerEmailLookup(db: Db) {
  return async (organisationId: string): Promise<string[]> => {
    const { data, error } = await db
      .from("memberships")
      .select("user_id")
      .eq("organisation_id", organisationId)
      .eq("role", "owner")
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const emails: string[] = [];
    for (const membership of data) {
      const { data: found, error: userError } = await db.auth.admin.getUserById(
        membership.user_id,
      );
      if (userError) {
        console.error("[overdue-email] owner lookup failed", {
          code: userError.code,
        });
        continue;
      }
      const email = found.user?.email;
      if (email && !emails.includes(email)) emails.push(email);
    }
    return emails;
  };
}

export async function sendOverdueDigests(
  db: Db,
  {
    now = new Date(),
    appUrl,
    send,
    recipientsFor,
  }: {
    now?: Date;
    appUrl: string;
    send: (message: EmailMessage) => Promise<SendResult>;
    recipientsFor: (organisationId: string) => Promise<string[]>;
  },
): Promise<OverdueRemindersResult> {
  const today = todayInLondon(now);
  const counts: OverdueRemindersResult["counts"] = {
    send: 0,
    "turned-off": 0,
    "already-sent": 0,
    "nothing-late": 0,
    "no-recipients": 0,
    failed: 0,
  };

  const organisations = await loadOrganisations(db);
  if (organisations === null) {
    // Without the switch we cannot tell who turned the email off: send none.
    console.warn(
      "[overdue-email] organisations.overdue_email_enabled is missing: apply the pending migration. Nothing was sent.",
    );
    return { today, status: "not-ready", organisationsChecked: 0, counts };
  }

  const alreadySent = await sentToday(db, today, now);

  for (const organisation of organisations) {
    try {
      const enabled = organisation.overdue_email_enabled;
      const alreadySentToday = alreadySent.has(organisation.id);

      // Only read rent for organisations that could get an email.
      let overdue: ReturnType<typeof buildDashboard>["overdue"] = [];
      let totalPence = 0;
      let recipients: string[] = [];
      if (enabled && !alreadySentToday) {
        const [homes, charges] = await Promise.all([
          loadDashboardHomes(db, organisation.id),
          getDashboardCharges({ supabase: db }, organisation.id, today),
        ]);
        const summary = buildDashboard({ homes, charges, today });
        overdue = summary.overdue;
        totalPence = summary.overdueTotalPence;
        if (overdue.length > 0) {
          recipients = await recipientsFor(organisation.id);
        }
      }

      const decision = digestDecision({
        enabled,
        alreadySentToday,
        overdueCount: overdue.length,
        recipientCount: recipients.length,
      });
      if (decision !== "send") {
        counts[decision] += 1;
        continue;
      }

      const digest = buildOverdueDigest({
        organisationName: organisation.name,
        overdue,
        totalPence,
        today,
        appUrl,
      });
      const result = await send({
        to: recipients,
        ...digest,
        idempotencyKey: `overdue-digest/${organisation.id}/${today}`,
      });
      if (!result.sent) {
        counts.failed += 1;
        continue;
      }
      counts.send += 1;

      // The record that today's email went out. No user: it is the daily job.
      // Amounts and counts only: no names or email addresses.
      const { error } = await db.from("audit_log").insert({
        organisation_id: organisation.id,
        user_id: null,
        action: DIGEST_AUDIT_ACTION,
        table_name: "organisations",
        record_id: organisation.id,
        changes: {
          source: "cron",
          day: today,
          tenants: overdue.length,
          total_pence: totalPence,
          recipients: recipients.length,
        },
      });
      if (error) {
        console.error("[overdue-email] audit insert failed", {
          code: error.code,
        });
      }
    } catch (error) {
      counts.failed += 1;
      console.error("[overdue-email] organisation failed", {
        code: codeOf(error),
      });
    }
  }

  return {
    today,
    status: "done",
    organisationsChecked: organisations.length,
    counts,
  };
}
