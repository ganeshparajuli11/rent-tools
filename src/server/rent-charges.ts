import "server-only";

import { todayInLondon } from "@/lib/dates";
import {
  addMonths,
  monthEnd,
  monthOf,
  monthStart,
  plannedCharges,
} from "@/lib/rent";

import type { Db } from "./context";

/**
 * Making rent charges (database: rent_charges).
 *
 * A tenant gets one charge per calendar month, from the month they move in
 * to this month (or to the month they moved out). Which months, the due
 * dates and the amounts come from the tested helpers in src/lib/rent.ts.
 *
 * Making charges is safe to repeat: the database allows one charge per
 * tenant per month (unique on tenancy_id + period_start) and rows that
 * already exist are skipped, never changed. So a charge keeps the rent it
 * was made with, and a later rent change applies to future months only.
 *
 * `ensureRentCharges` takes whichever client the caller has: the signed-in
 * user's own client when a tenant is added or changed (RLS applies), or the
 * service-role client in the daily cron route.
 */

export type TenancyForCharges = {
  id: string;
  organisation_id: string;
  rent_pence: number;
  due_day: number;
  start_date: string;
  end_date: string | null;
};

type CreatedCharge = { id: string; organisation_id: string };

/** Rows are sent to the database in batches of this size. */
const BATCH_SIZE = 500;

/**
 * Makes any missing rent charges for these tenants, up to today's month.
 * Returns the rows that were actually created (existing ones are skipped).
 */
export async function ensureRentCharges(
  db: Db,
  tenancies: readonly TenancyForCharges[],
  today: string,
): Promise<CreatedCharge[]> {
  const rows = tenancies.flatMap((tenancy) =>
    plannedCharges({
      startDate: tenancy.start_date,
      endDate: tenancy.end_date,
      dueDay: tenancy.due_day,
      rentPence: tenancy.rent_pence,
      today,
    }).map((charge) => ({
      // The organisation always comes from the tenancy row itself.
      organisation_id: tenancy.organisation_id,
      tenancy_id: tenancy.id,
      period_start: charge.periodStart,
      due_date: charge.dueDate,
      amount_pence: charge.amountPence,
    })),
  );

  const created: CreatedCharge[] = [];
  for (let from = 0; from < rows.length; from += BATCH_SIZE) {
    const { data, error } = await db
      .from("rent_charges")
      .upsert(rows.slice(from, from + BATCH_SIZE), {
        onConflict: "tenancy_id,period_start",
        ignoreDuplicates: true,
      })
      .select("id, organisation_id");
    if (error) throw error;
    created.push(...(data ?? []));
  }
  return created;
}

/** Tenancies are read in pages of this size by the cron job. */
const TENANCY_PAGE_SIZE = 500;

/**
 * The daily job: makes missing rent charges for every organisation.
 *
 * It looks at every tenant who lives in a home now, or who moved out in the
 * last two calendar months, and fills in any month they are missing. Run it
 * as often as you like: a second run on the same day creates nothing.
 *
 * `db` must be the service-role client, because the job has no signed-in
 * user and covers every organisation. It only ever inserts rent_charges
 * (and one audit_log row per organisation that got new charges).
 */
export async function generateAllRentCharges(
  db: Db,
  now: Date = new Date(),
): Promise<{
  today: string;
  tenanciesChecked: number;
  chargesCreated: number;
}> {
  const today = todayInLondon(now);
  const thisMonth = monthOf(today);
  const movedOutSince = monthStart(addMonths(thisMonth, -2));
  const startedBy = monthEnd(thisMonth);

  let tenanciesChecked = 0;
  const createdByOrganisation = new Map<string, number>();

  for (let from = 0; ; from += TENANCY_PAGE_SIZE) {
    const { data, error } = await db
      .from("tenancies")
      .select("id, organisation_id, rent_pence, due_day, start_date, end_date")
      .lte("start_date", startedBy)
      .or(`end_date.is.null,end_date.gte.${movedOutSince}`)
      .order("id", { ascending: true })
      .range(from, from + TENANCY_PAGE_SIZE - 1);
    if (error) throw error;

    const tenancies = data ?? [];
    tenanciesChecked += tenancies.length;

    const created = await ensureRentCharges(db, tenancies, today);
    for (const charge of created) {
      createdByOrganisation.set(
        charge.organisation_id,
        (createdByOrganisation.get(charge.organisation_id) ?? 0) + 1,
      );
    }

    if (tenancies.length < TENANCY_PAGE_SIZE) break;
  }

  // One audit row per organisation that got new charges. There is no user:
  // the job runs on a schedule.
  const auditRows = [...createdByOrganisation].map(
    ([organisationId, count]) => ({
      organisation_id: organisationId,
      user_id: null,
      action: "rent_charges.generated",
      table_name: "rent_charges",
      record_id: null,
      changes: { source: "cron", date: today, count },
    }),
  );
  if (auditRows.length > 0) {
    const { error } = await db.from("audit_log").insert(auditRows);
    if (error) {
      console.error("[cron] audit insert failed", { code: error.code });
    }
  }

  let chargesCreated = 0;
  for (const count of createdByOrganisation.values()) chargesCreated += count;
  return { today, tenanciesChecked, chargesCreated };
}
