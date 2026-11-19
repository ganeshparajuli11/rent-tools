import "server-only";

import {
  type HomeExportRow,
  homesCsv,
  type PaymentExportRow,
  paymentsCsv,
  type TenantExportRow,
  tenantsCsv,
} from "@/lib/data-export";
import type { ExportKind } from "@/lib/validation/data-rights";

import {
  type Ctx,
  getOrganisationId,
  isOrganisationOwner,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * "Download your data": the homes, tenants and payments of the user's
 * organisation as CSV files.
 *
 * An export is a copy of everyone's personal details in one file, so:
 *  - only owners can download it (staff can still see everything in the
 *    app itself);
 *  - it uses the user's own client, so RLS applies, and every query also
 *    filters by the organisation looked up on the server;
 *  - each download writes an audit_log row (what was downloaded and how
 *    many rows, never the data itself).
 * The route that calls this (src/app/api/export/route.ts) checks the
 * session and applies the rate limiter first.
 */

const PAGE_SIZE = 1000;
/** A safety limit, far above what a small landlord will have. */
const MAX_ROWS = 100_000;

export const OWNERS_ONLY_EXPORT = "Only the account owner can download data.";
export const TOO_MUCH_TO_EXPORT =
  "There is too much to download in one file. Please contact us for a copy.";

function isMissingColumn(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;
  return code === "42703" || code === "PGRST204";
}

/** Reads every page of a query, in a stable order, up to MAX_ROWS. */
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
    if (rows.length >= MAX_ROWS) throw new UserFacingError(TOO_MUCH_TO_EXPORT);
  }
}

async function readHomes(ctx: Ctx, organisationId: string) {
  return readAll<HomeExportRow>((from, to) =>
    ctx.supabase
      .from("properties")
      .select(
        "name, address_line1, address_line2, city, postcode, property_type, notes, archived_at, rooms(name, archived_at), owner_leases(owner_name, owner_phone, owner_email, rent_pence, due_day, start_date, end_date, created_at)",
      )
      .eq("organisation_id", organisationId)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

async function readTenants(ctx: Ctx, organisationId: string) {
  return readAll<TenantExportRow>((from, to) =>
    ctx.supabase
      .from("tenancies")
      .select(
        "tenant_name, tenant_phone, tenant_email, rent_pence, due_day, deposit_pence, start_date, end_date, properties(name), rooms(name)",
      )
      .eq("organisation_id", organisationId)
      .order("start_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

async function readPayments(ctx: Ctx, organisationId: string) {
  const base = () =>
    ctx.supabase
      .from("payments")
      .select(
        "paid_on, amount_pence, method, note, removed_at, rent_charges(period_start, tenancies(tenant_name, properties(name), rooms(name)))",
      )
      .eq("organisation_id", organisationId)
      .order("paid_on", { ascending: true })
      .order("id", { ascending: true });

  try {
    return await readAll<PaymentExportRow>((from, to) =>
      base().range(from, to),
    );
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
  }

  // The removed_at migration is not applied yet, so nothing is removed.
  return readAll<PaymentExportRow>((from, to) =>
    ctx.supabase
      .from("payments")
      .select(
        "paid_on, amount_pence, method, note, rent_charges(period_start, tenancies(tenant_name, properties(name), rooms(name)))",
      )
      .eq("organisation_id", organisationId)
      .order("paid_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

const TABLE_OF: Record<ExportKind, string> = {
  homes: "properties",
  tenants: "tenancies",
  payments: "payments",
};

/** Builds one CSV file for the user's organisation. Owners only. */
export async function exportData(
  ctx: Ctx,
  kind: ExportKind,
): Promise<{ csv: string; rows: number }> {
  const organisationId = await getOrganisationId(ctx);
  if (!(await isOrganisationOwner(ctx, organisationId))) {
    throw new UserFacingError(OWNERS_ONLY_EXPORT);
  }

  let csv: string;
  let rows: number;
  if (kind === "homes") {
    const homes = await readHomes(ctx, organisationId);
    csv = homesCsv(homes);
    rows = homes.length;
  } else if (kind === "tenants") {
    const tenants = await readTenants(ctx, organisationId);
    csv = tenantsCsv(tenants);
    rows = tenants.length;
  } else {
    const payments = await readPayments(ctx, organisationId);
    csv = paymentsCsv(payments);
    rows = payments.length;
  }

  await writeAudit(ctx, {
    organisationId,
    action: "data.exported",
    table: TABLE_OF[kind],
    recordId: null,
    changes: { kind, rows },
  });

  return { csv, rows };
}
