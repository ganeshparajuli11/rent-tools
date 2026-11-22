import "server-only";

import { todayInLondon } from "@/lib/dates";
import type { DashboardCharge } from "@/lib/dashboard";
import {
  compareRentRows,
  isBeforeMoveIn,
  monthOf,
  monthStart,
  owedPence,
  rentStatus,
  type RentStatus,
  sumPence,
} from "@/lib/rent";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * The rent ledger: reading a month's rent and recording payments.
 *
 * Every function takes the signed-in user's own Supabase client, so RLS
 * applies, and also filters by the organisation looked up on the server.
 *
 * Status (Paid, Part paid, Due, Late) is never stored. It is worked out
 * each time from the charge, its payments and today's date in London, by
 * the tested helpers in src/lib/rent.ts.
 *
 * Payments are never deleted. "Remove" sets `payments.removed_at` and "Undo"
 * clears it; a removed payment does not count towards the rent.
 *
 * `removed_at` comes from a migration that may not be applied yet (see
 * docs/PENDING_MIGRATIONS.md). Until it is, reads fall back to a query
 * without that column, and removing a payment gives a plain message.
 *
 * The audit log records amounts and ids, never a tenant's name.
 */

export const RENT_PAGE_SIZE = 25;

/** The most charges read for one month. Far more than a small landlord has. */
const MAX_MONTH_CHARGES = 1000;

const CANNOT_REMOVE_YET =
  "Payments cannot be removed yet. This will be switched on soon.";
const PAYMENT_NOT_FOUND =
  "We could not find that payment. It may already have been removed.";
const ALREADY_PAID = "This rent is already paid.";

export type RentPayment = {
  id: string;
  amountPence: number;
  /** The day it was recorded, "YYYY-MM-DD". */
  paidOn: string;
};

export type RentRow = {
  chargeId: string;
  tenantId: string;
  tenantName: string;
  homeId: string;
  homeName: string;
  /** Null when the tenant has the whole home. */
  roomName: string | null;
  /** True when the tenant has since moved out. */
  movedOut: boolean;
  dueDate: string;
  amountPence: number;
  paidPence: number;
  owedPence: number;
  status: RentStatus;
  /** Payments that count (removed ones are left out), oldest first. */
  payments: RentPayment[];
};

export type RentMonth = {
  month: string;
  /** This page of rows: late first, then due, part paid and paid. */
  rows: RentRow[];
  total: number;
  page: number;
  pageCount: number;
  /** Totals for the whole month, not just this page. */
  expectedPence: number;
  receivedPence: number;
  counts: Record<RentStatus, number>;
  /** False until the `payments.removed_at` migration is applied. */
  canRemovePayments: boolean;
};

type PaymentRow = {
  id: string;
  amount_pence: number;
  paid_on: string;
  /** Missing when the column does not exist yet. */
  removed_at?: string | null;
};

function codeOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

/**
 * True when the database does not have `payments.removed_at` yet: Postgres
 * "undefined column" (42703) or PostgREST "column not found" (PGRST204).
 */
function isMissingColumn(error: unknown): boolean {
  const code = codeOf(error);
  return code === "42703" || code === "PGRST204";
}

/** Payments that count towards the rent: everything not removed. */
function countedPayments(payments: readonly PaymentRow[]): PaymentRow[] {
  return payments.filter((payment) => !payment.removed_at);
}

function paidPenceOf(payments: readonly PaymentRow[]): number {
  return sumPence(countedPayments(payments).map((p) => p.amount_pence));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

type MonthChargeRow = {
  id: string;
  period_start: string;
  due_date: string;
  amount_pence: number;
  tenancies: {
    id: string;
    tenant_name: string;
    start_date: string;
    end_date: string | null;
    properties: { id: string; name: string } | null;
    rooms: { id: string; name: string } | null;
  } | null;
  payments: PaymentRow[];
};

/** One query: the month's charges with each tenant, home, room and payments. */
async function loadMonthCharges(
  ctx: Ctx,
  organisationId: string,
  month: string,
): Promise<{ charges: MonthChargeRow[]; canRemovePayments: boolean }> {
  const periodStart = monthStart(month);

  const full = await ctx.supabase
    .from("rent_charges")
    .select(
      "id, period_start, due_date, amount_pence, tenancies(id, tenant_name, start_date, end_date, properties(id, name), rooms(id, name)), payments(id, amount_pence, paid_on, removed_at)",
    )
    .eq("organisation_id", organisationId)
    .eq("period_start", periodStart)
    .order("id", { ascending: true })
    .limit(MAX_MONTH_CHARGES);
  if (!full.error) {
    const charges: MonthChargeRow[] = full.data;
    return { charges, canRemovePayments: true };
  }
  if (!isMissingColumn(full.error)) throw full.error;

  // The removed_at migration is not applied yet: no payment can be removed.
  const basic = await ctx.supabase
    .from("rent_charges")
    .select(
      "id, period_start, due_date, amount_pence, tenancies(id, tenant_name, start_date, end_date, properties(id, name), rooms(id, name)), payments(id, amount_pence, paid_on)",
    )
    .eq("organisation_id", organisationId)
    .eq("period_start", periodStart)
    .order("id", { ascending: true })
    .limit(MAX_MONTH_CHARGES);
  if (basic.error) throw basic.error;
  const charges: MonthChargeRow[] = basic.data;
  return { charges, canRemovePayments: false };
}

function toRentRow(charge: MonthChargeRow, today: string): RentRow | null {
  const tenancy = charge.tenancies;
  if (!tenancy || !tenancy.properties) return null;

  const payments = countedPayments(charge.payments)
    .map((payment) => ({
      id: payment.id,
      amountPence: payment.amount_pence,
      paidOn: payment.paid_on,
    }))
    .sort(
      (a, b) => a.paidOn.localeCompare(b.paidOn) || a.id.localeCompare(b.id),
    );
  const paidPence = sumPence(payments.map((payment) => payment.amountPence));

  // Left over from a move-in date that was later corrected: not real rent.
  if (
    paidPence === 0 &&
    isBeforeMoveIn(charge.period_start, tenancy.start_date)
  ) {
    return null;
  }

  return {
    chargeId: charge.id,
    tenantId: tenancy.id,
    tenantName: tenancy.tenant_name,
    homeId: tenancy.properties.id,
    homeName: tenancy.properties.name,
    roomName: tenancy.rooms?.name ?? null,
    movedOut: tenancy.end_date !== null,
    dueDate: charge.due_date,
    amountPence: charge.amount_pence,
    paidPence,
    owedPence: owedPence(charge.amount_pence, paidPence),
    status: rentStatus({
      amountPence: charge.amount_pence,
      paidPence,
      dueDate: charge.due_date,
      today,
    }),
    payments,
  };
}

/**
 * One month's rent for the rent page. The whole month is read in one query
 * and sorted here (late first), because the order depends on a status that
 * is worked out, not stored. Only one page of rows is returned.
 */
export async function getRentMonth(
  ctx: Ctx,
  { month, page }: { month: string; page: number },
  today: string = todayInLondon(),
): Promise<RentMonth> {
  const organisationId = await getOrganisationId(ctx);
  const { charges, canRemovePayments } = await loadMonthCharges(
    ctx,
    organisationId,
    month,
  );

  const rows = charges
    .flatMap((charge) => toRentRow(charge, today) ?? [])
    .sort(compareRentRows);

  const counts: Record<RentStatus, number> = {
    late: 0,
    due: 0,
    part_paid: 0,
    paid: 0,
  };
  for (const row of rows) counts[row.status] += 1;

  const pageCount = Math.max(1, Math.ceil(rows.length / RENT_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const from = (safePage - 1) * RENT_PAGE_SIZE;

  return {
    month,
    rows: rows.slice(from, from + RENT_PAGE_SIZE),
    total: rows.length,
    page: safePage,
    pageCount,
    expectedPence: sumPence(rows.map((row) => row.amountPence)),
    receivedPence: sumPence(rows.map((row) => row.paidPence)),
    counts,
    canRemovePayments,
  };
}

/** Charges are read in pages of this size for the dashboard. */
const DASHBOARD_PAGE_SIZE = 1000;
/** A hard stop, so one very long history can never make the page hang. */
const DASHBOARD_MAX_PAGES = 5;

type DashboardChargeRow = {
  id: string;
  tenancy_id: string;
  period_start: string;
  due_date: string;
  amount_pence: number;
  payments: { amount_pence: number; removed_at?: string | null }[];
};

/**
 * The charges the dashboard needs: this month's, plus every earlier one
 * whose due date has passed (to find rent that is still unpaid, however
 * old). Usually one query; long histories are read in pages.
 */
export async function getDashboardCharges(
  // Only the client is used, so the daily email job can pass its own.
  ctx: Pick<Ctx, "supabase">,
  organisationId: string,
  today: string,
): Promise<DashboardCharge[]> {
  const { charges } = await loadDashboardCharges(ctx, organisationId, today);
  return charges;
}

/**
 * The same charges, and whether payments can be removed yet (false until
 * the `payments.removed_at` migration is applied), for "Mark as paid" with
 * Undo on the Today page.
 */
export async function loadDashboardCharges(
  ctx: Pick<Ctx, "supabase">,
  organisationId: string,
  today: string,
): Promise<{ charges: DashboardCharge[]; canRemovePayments: boolean }> {
  const thisPeriod = monthStart(monthOf(today));
  // Both values are dates made on the server, never text from the browser.
  const wanted = `period_start.eq.${thisPeriod},due_date.lt.${today}`;

  let withRemovedAt = true;

  /** One page of charges, falling back when `removed_at` does not exist yet. */
  async function readPage(
    from: number,
    to: number,
  ): Promise<DashboardChargeRow[]> {
    if (withRemovedAt) {
      const full = await ctx.supabase
        .from("rent_charges")
        .select(
          "id, tenancy_id, period_start, due_date, amount_pence, payments(amount_pence, removed_at)",
        )
        .eq("organisation_id", organisationId)
        .or(wanted)
        .order("id", { ascending: true })
        .range(from, to);
      if (!full.error) return full.data;
      if (!isMissingColumn(full.error)) throw full.error;
      withRemovedAt = false;
    }

    const basic = await ctx.supabase
      .from("rent_charges")
      .select(
        "id, tenancy_id, period_start, due_date, amount_pence, payments(amount_pence)",
      )
      .eq("organisation_id", organisationId)
      .or(wanted)
      .order("id", { ascending: true })
      .range(from, to);
    if (basic.error) throw basic.error;
    return basic.data;
  }

  const rows: DashboardChargeRow[] = [];
  for (let page = 0; page < DASHBOARD_MAX_PAGES; page += 1) {
    const from = page * DASHBOARD_PAGE_SIZE;
    const batch = await readPage(from, from + DASHBOARD_PAGE_SIZE - 1);
    rows.push(...batch);
    if (batch.length < DASHBOARD_PAGE_SIZE) break;
    if (page === DASHBOARD_MAX_PAGES - 1) {
      console.warn("[dashboard] charge history cut off", {
        read: rows.length,
      });
    }
  }

  const charges = rows.map((row) => ({
    id: row.id,
    tenancyId: row.tenancy_id,
    periodStart: row.period_start,
    dueDate: row.due_date,
    amountPence: row.amount_pence,
    paidPence: sumPence(
      row.payments.filter((p) => !p.removed_at).map((p) => p.amount_pence),
    ),
  }));
  return { charges, canRemovePayments: withRemovedAt };
}

/** One charge with what has been paid towards it. Null if it is not ours. */
async function loadCharge(
  ctx: Ctx,
  organisationId: string,
  chargeId: string,
): Promise<{
  id: string;
  tenancyId: string;
  amountPence: number;
  periodStart: string;
  paidPence: number;
} | null> {
  type ChargeRow = {
    id: string;
    tenancy_id: string;
    amount_pence: number;
    period_start: string;
    payments: PaymentRow[];
  };
  let charge: ChargeRow | null;

  const full = await ctx.supabase
    .from("rent_charges")
    .select(
      "id, tenancy_id, amount_pence, period_start, payments(id, amount_pence, paid_on, removed_at)",
    )
    .eq("id", chargeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (!full.error) {
    charge = full.data;
  } else if (isMissingColumn(full.error)) {
    const basic = await ctx.supabase
      .from("rent_charges")
      .select(
        "id, tenancy_id, amount_pence, period_start, payments(id, amount_pence, paid_on)",
      )
      .eq("id", chargeId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (basic.error) throw basic.error;
    charge = basic.data;
  } else {
    throw full.error;
  }

  if (!charge) return null;
  return {
    id: charge.id,
    tenancyId: charge.tenancy_id,
    amountPence: charge.amount_pence,
    periodStart: charge.period_start,
    paidPence: paidPenceOf(charge.payments),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Records a payment against one month's rent.
 * `amount: "rest"` is the one-tap "Mark as paid": it pays whatever is left.
 * A number is the "Other amount" form, in whole pence. A month can have
 * several payments; together they can never be more than the rent.
 */
export async function recordPayment(
  ctx: Ctx,
  chargeId: string,
  amount: "rest" | number,
) {
  const organisationId = await getOrganisationId(ctx);
  const charge = await loadCharge(ctx, organisationId, chargeId);
  if (!charge) throw new UserFacingError(NOT_FOUND);

  const left = owedPence(charge.amountPence, charge.paidPence);
  if (left <= 0) throw new UserFacingError(ALREADY_PAID);

  const amountPence = amount === "rest" ? left : amount;
  if (!Number.isInteger(amountPence) || amountPence <= 0) {
    throw new UserFacingError("Enter an amount more than £0");
  }
  if (amountPence > left) {
    throw new UserFacingError(
      "That is more than is left to pay for this month. Check the amount.",
    );
  }

  const { data: payment, error } = await ctx.supabase
    .from("payments")
    .insert({
      organisation_id: organisationId,
      rent_charge_id: charge.id,
      amount_pence: amountPence,
      paid_on: todayInLondon(),
      recorded_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) throw error;

  await writeAudit(ctx, {
    organisationId,
    action: "payment.recorded",
    table: "payments",
    recordId: payment.id,
    changes: {
      after: {
        rentChargeId: charge.id,
        tenancyId: charge.tenancyId,
        periodStart: charge.periodStart,
        amountPence,
      },
    },
  });

  return {
    paymentId: payment.id,
    amountPence,
    paidInFull: amountPence === left,
  };
}

/** "Remove" a payment: it stays in the database but no longer counts. */
export async function removePayment(ctx: Ctx, paymentId: string) {
  const organisationId = await getOrganisationId(ctx);

  const { data, error } = await ctx.supabase
    .from("payments")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("organisation_id", organisationId)
    .is("removed_at", null)
    .select("id, amount_pence, rent_charge_id");
  if (error) {
    if (isMissingColumn(error)) throw new UserFacingError(CANNOT_REMOVE_YET);
    throw error;
  }
  const removed = data[0];
  if (!removed) throw new UserFacingError(PAYMENT_NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "payment.removed",
    table: "payments",
    recordId: removed.id,
    changes: {
      before: {
        rentChargeId: removed.rent_charge_id,
        amountPence: removed.amount_pence,
      },
    },
  });

  return { paymentId: removed.id, amountPence: removed.amount_pence };
}

/** Undo for "Remove": the payment counts again, if the rent still has room for it. */
export async function restorePayment(ctx: Ctx, paymentId: string) {
  const organisationId = await getOrganisationId(ctx);

  const { data: payment, error: readError } = await ctx.supabase
    .from("payments")
    .select("id, amount_pence, rent_charge_id, removed_at")
    .eq("id", paymentId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) {
    if (isMissingColumn(readError)) {
      throw new UserFacingError(CANNOT_REMOVE_YET);
    }
    throw readError;
  }
  if (!payment) throw new UserFacingError(PAYMENT_NOT_FOUND);
  if (payment.removed_at === null) {
    // Already counts: nothing to undo.
    return { paymentId: payment.id, amountPence: payment.amount_pence };
  }

  // Other payments may have been recorded since it was removed.
  const charge = await loadCharge(ctx, organisationId, payment.rent_charge_id);
  if (!charge) throw new UserFacingError(NOT_FOUND);
  if (charge.paidPence + payment.amount_pence > charge.amountPence) {
    throw new UserFacingError(
      "This payment was not put back, because it would make more than the rent for this month.",
    );
  }

  const { data, error } = await ctx.supabase
    .from("payments")
    .update({ removed_at: null })
    .eq("id", paymentId)
    .eq("organisation_id", organisationId)
    .not("removed_at", "is", null)
    .select("id");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(PAYMENT_NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "payment.restored",
    table: "payments",
    recordId: payment.id,
    changes: {
      after: {
        rentChargeId: payment.rent_charge_id,
        amountPence: payment.amount_pence,
      },
    },
  });

  return { paymentId: payment.id, amountPence: payment.amount_pence };
}
