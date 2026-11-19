import { type CsvCell, penceForCsv, toCsv } from "./csv";
import { monthOf } from "./rent";

/**
 * The columns of the three "Download your data" files, and how a database
 * row becomes a line. Pure, so it is unit tested; the queries are in
 * src/server/data-export.ts.
 *
 * Money is pounds with two decimals ("650.50"), dates are YYYY-MM-DD and
 * months are YYYY-MM, so a spreadsheet can sort and add them up.
 */

type Named = { name: string } | null;

export type HomeExportRow = {
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type: string | null;
  notes: string | null;
  archived_at: string | null;
  rooms: { name: string; archived_at: string | null }[];
  owner_leases: {
    owner_name: string;
    owner_phone: string | null;
    owner_email: string | null;
    rent_pence: number;
    due_day: number;
    start_date: string;
    end_date: string | null;
    created_at: string;
  }[];
};

export type TenantExportRow = {
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  rent_pence: number;
  due_day: number;
  deposit_pence: number;
  start_date: string;
  end_date: string | null;
  properties: Named;
  rooms: Named;
};

export type PaymentExportRow = {
  paid_on: string;
  amount_pence: number;
  method: string | null;
  note: string | null;
  /** Missing until the `payments.removed_at` migration is applied. */
  removed_at?: string | null;
  rent_charges: {
    period_start: string;
    tenancies: {
      tenant_name: string;
      properties: Named;
      rooms: Named;
    } | null;
  } | null;
};

export const HOMES_HEADER = [
  "Home",
  "Address line 1",
  "Address line 2",
  "Town or city",
  "Postcode",
  "Type",
  "Notes",
  "Rooms",
  "Archived",
  "Owner",
  "Owner phone",
  "Owner email",
  "Rent to owner (£ a month)",
  "Owner rent due day",
  "Owner agreement start",
] as const;

export const TENANTS_HEADER = [
  "Tenant",
  "Phone",
  "Email",
  "Home",
  "Room",
  "Rent (£ a month)",
  "Rent due day",
  "Deposit (£)",
  "Moved in",
  "Moved out",
  "Current tenant",
] as const;

export const PAYMENTS_HEADER = [
  "Date paid",
  "Amount (£)",
  "Rent for month",
  "Tenant",
  "Home",
  "Room",
  "Method",
  "Note",
  "Removed",
] as const;

/** The owner agreement that is running now: not ended, newest first. */
function currentLease(leases: HomeExportRow["owner_leases"]) {
  return [...leases]
    .filter((lease) => lease.end_date === null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function homeCells(home: HomeExportRow): CsvCell[] {
  const rooms = home.rooms
    .filter((room) => room.archived_at === null)
    .map((room) => room.name)
    .sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }));
  const lease = currentLease(home.owner_leases);
  return [
    home.name,
    home.address_line1,
    home.address_line2,
    home.city,
    home.postcode,
    home.property_type,
    home.notes,
    rooms.join("; "),
    home.archived_at !== null,
    lease?.owner_name,
    lease?.owner_phone,
    lease?.owner_email,
    lease ? penceForCsv(lease.rent_pence) : null,
    lease?.due_day,
    lease?.start_date,
  ];
}

export function tenantCells(tenant: TenantExportRow): CsvCell[] {
  return [
    tenant.tenant_name,
    tenant.tenant_phone,
    tenant.tenant_email,
    tenant.properties?.name,
    tenant.rooms?.name,
    penceForCsv(tenant.rent_pence),
    tenant.due_day,
    penceForCsv(tenant.deposit_pence),
    tenant.start_date,
    tenant.end_date,
    tenant.end_date === null,
  ];
}

export function paymentCells(payment: PaymentExportRow): CsvCell[] {
  const charge = payment.rent_charges;
  const tenancy = charge?.tenancies ?? null;
  return [
    payment.paid_on,
    penceForCsv(payment.amount_pence),
    charge ? monthOf(charge.period_start) : null,
    tenancy?.tenant_name,
    tenancy?.properties?.name,
    tenancy?.rooms?.name,
    payment.method,
    payment.note,
    // Unknown (empty) until the removed_at migration is applied.
    payment.removed_at === undefined ? null : payment.removed_at !== null,
  ];
}

export function homesCsv(rows: readonly HomeExportRow[]): string {
  return toCsv(HOMES_HEADER, rows.map(homeCells));
}

export function tenantsCsv(rows: readonly TenantExportRow[]): string {
  return toCsv(TENANTS_HEADER, rows.map(tenantCells));
}

export function paymentsCsv(rows: readonly PaymentExportRow[]): string {
  return toCsv(PAYMENTS_HEADER, rows.map(paymentCells));
}
