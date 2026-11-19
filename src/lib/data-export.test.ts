import { describe, expect, it } from "vitest";

import { CSV_BOM } from "./csv";
import {
  homeCells,
  HOMES_HEADER,
  homesCsv,
  type HomeExportRow,
  paymentCells,
  PAYMENTS_HEADER,
  paymentsCsv,
  type PaymentExportRow,
  tenantCells,
  TENANTS_HEADER,
  type TenantExportRow,
  tenantsCsv,
} from "./data-export";

const home: HomeExportRow = {
  name: "12 High Street",
  address_line1: "12 High Street",
  address_line2: null,
  city: "Leeds",
  postcode: "LS1 4AB",
  property_type: "house",
  notes: "Boiler serviced in May",
  archived_at: null,
  rooms: [
    { name: "Room 10", archived_at: null },
    { name: "Room 2", archived_at: null },
    { name: "Old box room", archived_at: "2026-10-01T10:00:00Z" },
  ],
  owner_leases: [
    {
      owner_name: "Old Owner",
      owner_phone: null,
      owner_email: null,
      rent_pence: 90000,
      due_day: 1,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
      created_at: "2025-01-01T09:00:00Z",
    },
    {
      owner_name: "Pat Owner",
      owner_phone: "07700 900123",
      owner_email: "pat@example.com",
      rent_pence: 120050,
      due_day: 5,
      start_date: "2026-01-01",
      end_date: null,
      created_at: "2026-01-01T09:00:00Z",
    },
  ],
};

const tenant: TenantExportRow = {
  tenant_name: "Ann Lee",
  tenant_phone: "+44 7700 900456",
  tenant_email: "ann@example.com",
  rent_pence: 65050,
  due_day: 3,
  deposit_pence: 0,
  start_date: "2026-02-14",
  end_date: null,
  properties: { name: "12 High Street" },
  rooms: { name: "Room 2" },
};

const payment: PaymentExportRow = {
  paid_on: "2026-11-03",
  amount_pence: 30000,
  method: null,
  note: "Paid in cash",
  removed_at: null,
  rent_charges: {
    period_start: "2026-11-01",
    tenancies: {
      tenant_name: "Ann Lee",
      properties: { name: "12 High Street" },
      rooms: null,
    },
  },
};

describe("homes", () => {
  it("has one cell for each column", () => {
    expect(homeCells(home)).toHaveLength(HOMES_HEADER.length);
  });

  it("lists rooms in use in order and uses the current owner agreement", () => {
    expect(homeCells(home)).toEqual([
      "12 High Street",
      "12 High Street",
      null,
      "Leeds",
      "LS1 4AB",
      "house",
      "Boiler serviced in May",
      "Room 2; Room 10",
      false,
      "Pat Owner",
      "07700 900123",
      "pat@example.com",
      "1200.50",
      5,
      "2026-01-01",
    ]);
  });

  it("leaves the owner columns empty when there is no current owner", () => {
    const cells = homeCells({ ...home, owner_leases: [] });
    expect(cells.slice(9)).toEqual([
      undefined,
      undefined,
      undefined,
      null,
      undefined,
      undefined,
    ]);
  });

  it("marks an archived home", () => {
    expect(homeCells({ ...home, archived_at: "2026-11-01T00:00:00Z" })[8]).toBe(
      true,
    );
  });
});

describe("tenants", () => {
  it("has one cell for each column", () => {
    expect(tenantCells(tenant)).toHaveLength(TENANTS_HEADER.length);
  });

  it("writes money as pounds and says if they are a current tenant", () => {
    expect(tenantCells(tenant)).toEqual([
      "Ann Lee",
      "+44 7700 900456",
      "ann@example.com",
      "12 High Street",
      "Room 2",
      "650.50",
      3,
      "0.00",
      "2026-02-14",
      null,
      true,
    ]);
    expect(tenantCells({ ...tenant, end_date: "2026-10-31" })[10]).toBe(false);
  });
});

describe("payments", () => {
  it("has one cell for each column", () => {
    expect(paymentCells(payment)).toHaveLength(PAYMENTS_HEADER.length);
  });

  it("writes the month the payment was for", () => {
    expect(paymentCells(payment)).toEqual([
      "2026-11-03",
      "300.00",
      "2026-11",
      "Ann Lee",
      "12 High Street",
      undefined,
      null,
      "Paid in cash",
      false,
    ]);
  });

  it("marks removed payments, and leaves it empty when not known", () => {
    expect(
      paymentCells({ ...payment, removed_at: "2026-11-04T00:00:00Z" })[8],
    ).toBe(true);
    const { removed_at: _unused, ...withoutColumn } = payment;
    void _unused;
    expect(paymentCells(withoutColumn)[8]).toBeNull();
  });
});

describe("whole files", () => {
  it("start with the header row", () => {
    expect(homesCsv([home]).startsWith(`${CSV_BOM}"Home",`)).toBe(true);
    expect(tenantsCsv([]).startsWith(`${CSV_BOM}"Tenant",`)).toBe(true);
    expect(paymentsCsv([]).startsWith(`${CSV_BOM}"Date paid",`)).toBe(true);
  });

  it("keep a phone number that starts with + as text", () => {
    expect(tenantsCsv([tenant])).toContain(`"'+44 7700 900456"`);
  });

  it("have one line per row plus the header", () => {
    const lines = tenantsCsv([tenant, tenant]).trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
  });
});
