/**
 * Row-level security isolation test. Runs against the Supabase project in
 * .env.local (use your DEV project, never production).
 *
 *   pnpm test:rls
 *
 * What it does:
 *  1. Uses the service role key ONLY to create two throwaway users (A and B)
 *     and sign them in. No emails are sent.
 *  2. The sign-up trigger gives each user their own organisation.
 *  3. Each user, through their own session (publishable key + RLS), creates
 *     one row in every business table.
 *  4. Checks each user sees only their own organisation's rows, cannot write
 *     rows into the other organisation, and cannot change or delete the
 *     other organisation's rows. Also checks signed-out (anon) sees nothing.
 *  5. Deletes everything it created, even if a test fails.
 */
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import type { UpdateHomeValues } from "@/lib/validation/homes";
import type { TenantValues } from "@/lib/validation/tenants";
import { todayInLondon } from "@/lib/dates";
import { addMonths, monthOf, monthStart } from "@/lib/rent";
import { type Ctx, UserFacingError } from "@/server/context";
import { getDashboard } from "@/server/dashboard";
import * as homes from "@/server/homes";
import * as rent from "@/server/rent";
import type { EmailMessage } from "@/server/email";
import { sendOverdueDigests } from "@/server/overdue-reminders";
import { generateAllRentCharges } from "@/server/rent-charges";
import * as settings from "@/server/settings";
import * as tenants from "@/server/tenants";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    "RLS test needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
      "and SUPABASE_SERVICE_ROLE_KEY in .env.local (dev project only).",
  );
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

// Test-only admin client. Never import this pattern into app code.
const admin = createClient(url, serviceRoleKey, clientOptions);
const anon = createClient(url, publishableKey, clientOptions);

const runId = randomUUID().slice(0, 8);

type TableName =
  | "organisations"
  | "memberships"
  | "properties"
  | "owner_leases"
  | "rooms"
  | "tenancies"
  | "rent_charges"
  | "payments"
  | "audit_log";

const TABLES: TableName[] = [
  "organisations",
  "memberships",
  "properties",
  "owner_leases",
  "rooms",
  "tenancies",
  "rent_charges",
  "payments",
  "audit_log",
];

/** Column holding the organisation id. */
const orgColumn = (table: TableName) =>
  table === "organisations" ? "id" : "organisation_id";

/** A harmless change used to test "cannot update the other org's row". */
const UPDATE_PATCH: Record<TableName, Record<string, unknown>> = {
  organisations: { name: "hacked" },
  memberships: { role: "staff" },
  properties: { notes: "hacked" },
  owner_leases: { owner_phone: "hacked" },
  rooms: { name: "hacked" },
  tenancies: { tenant_phone: "hacked" },
  rent_charges: { amount_pence: 1 },
  payments: { note: "hacked" },
  audit_log: { action: "hacked" },
};

type TestUser = {
  label: "A" | "B";
  userId: string;
  client: SupabaseClient;
  orgId: string;
  ids: Record<TableName, string>;
};

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

/** Throws if a Supabase call failed; returns its data as the expected shape. */
function must<T = Record<string, unknown>>(
  result: { data: unknown; error: unknown },
  what: string,
): T {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what} failed: ${JSON.stringify(result.error)}`);
  }
  return result.data as T;
}

async function createSignedInUser(label: "A" | "B"): Promise<TestUser> {
  const email = `rls-test-${runId}-${label.toLowerCase()}@example.com`;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { organisation_name: `RLS test ${runId} ${label}` },
  });
  if (created.error || !created.data.user) {
    throw new Error(`create user ${label} failed: ${created.error?.message}`);
  }
  const userId = created.data.user.id;
  createdUserIds.push(userId);

  // Sign in without sending an email: generate a magic link server-side and
  // verify its token hash with a normal (publishable key) client.
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (link.error || !link.data.properties) {
    throw new Error(`generate link ${label} failed: ${link.error?.message}`);
  }
  const client = createClient(url!, publishableKey!, clientOptions);
  must(
    await client.auth.verifyOtp({
      type: "email",
      token_hash: link.data.properties.hashed_token,
    }),
    `sign in ${label}`,
  );

  // The sign-up trigger should have made exactly one owner membership.
  const membership = must<{
    id: string;
    organisation_id: string;
    role: string;
  }>(
    await client
      .from("memberships")
      .select("id, organisation_id, role")
      .single(),
    `read membership ${label}`,
  );
  expect(membership.role).toBe("owner");
  const orgId = membership.organisation_id;
  createdOrgIds.push(orgId);

  // Create one row in every business table, as this user.
  const insert = async (table: TableName, row: Record<string, unknown>) =>
    must<{ id: string }>(
      await client.from(table).insert(row).select("id").single(),
      `${label} insert ${table}`,
    ).id;

  const property = await insert("properties", {
    organisation_id: orgId,
    name: `Test house ${label}`,
    postcode: "AB1 2CD",
  });
  const ownerLease = await insert("owner_leases", {
    organisation_id: orgId,
    property_id: property,
    owner_name: `Owner ${label}`,
    rent_pence: 100_000,
    due_day: 1,
    start_date: "2026-01-01",
  });
  const room = await insert("rooms", {
    organisation_id: orgId,
    property_id: property,
    name: "Room 1",
  });
  const tenancy = await insert("tenancies", {
    organisation_id: orgId,
    property_id: property,
    room_id: room,
    tenant_name: `Tenant ${label}`,
    rent_pence: 55_000,
    due_day: 5,
    deposit_pence: 60_000,
    start_date: "2026-01-05",
  });
  const rentCharge = await insert("rent_charges", {
    organisation_id: orgId,
    tenancy_id: tenancy,
    period_start: "2026-01-05",
    due_date: "2026-01-05",
    amount_pence: 55_000,
  });
  const payment = await insert("payments", {
    organisation_id: orgId,
    rent_charge_id: rentCharge,
    amount_pence: 55_000,
    method: "bank_transfer",
  });
  const audit = await insert("audit_log", {
    organisation_id: orgId,
    action: "test.created",
    table_name: "properties",
    record_id: property,
  });

  return {
    label,
    userId,
    client,
    orgId,
    ids: {
      organisations: orgId,
      memberships: membership.id,
      properties: property,
      owner_leases: ownerLease,
      rooms: room,
      tenancies: tenancy,
      rent_charges: rentCharge,
      payments: payment,
      audit_log: audit,
    },
  };
}

/** A minimal row for `table` that claims to belong to `orgId`. */
function rowForOrg(
  table: TableName,
  orgId: string,
  other: TestUser,
): Record<string, unknown> {
  switch (table) {
    case "organisations":
      return { id: randomUUID(), name: "Sneaky org" };
    case "memberships":
      return { user_id: null, organisation_id: orgId, role: "owner" };
    case "properties":
      return { organisation_id: orgId, name: "Sneaky" };
    case "owner_leases":
      return {
        organisation_id: orgId,
        property_id: other.ids.properties,
        owner_name: "Sneaky",
        rent_pence: 1,
        due_day: 1,
        start_date: "2026-01-01",
      };
    case "rooms":
      return {
        organisation_id: orgId,
        property_id: other.ids.properties,
        name: "Sneaky",
      };
    case "tenancies":
      return {
        organisation_id: orgId,
        property_id: other.ids.properties,
        tenant_name: "Sneaky",
        rent_pence: 1,
        due_day: 1,
        start_date: "2026-01-01",
      };
    case "rent_charges":
      return {
        organisation_id: orgId,
        tenancy_id: other.ids.tenancies,
        period_start: "2027-01-01",
        due_date: "2027-01-01",
        amount_pence: 1,
      };
    case "payments":
      return {
        organisation_id: orgId,
        rent_charge_id: other.ids.rent_charges,
        amount_pence: 1,
      };
    case "audit_log":
      return { organisation_id: orgId, action: "sneaky", table_name: "x" };
  }
}

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createSignedInUser("A");
  b = await createSignedInUser("B");
});

afterAll(async () => {
  // Deleting an organisation cascades to everything inside it.
  if (createdOrgIds.length) {
    const { error } = await admin
      .from("organisations")
      .delete()
      .in("id", createdOrgIds);
    if (error) console.error("cleanup: delete organisations failed", error);
  }
  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error("cleanup: delete user failed", error);
  }
});

describe("row-level security isolation", () => {
  const pairs = () =>
    [
      [a, b],
      [b, a],
    ] as const;

  describe.each(TABLES)("%s", (table) => {
    it("each user reads only their own organisation's rows", async () => {
      for (const [me, other] of pairs()) {
        const { data, error } = await me.client.from(table).select("*");
        expect(error, `${me.label} select ${table}`).toBeNull();
        const rows = (data ?? []) as Record<string, unknown>[];
        const ids = rows.map((r) => r.id);

        expect(ids, `${me.label} sees own ${table} row`).toContain(
          me.ids[table],
        );
        expect(
          ids,
          `${me.label} must not see ${other.label}'s row`,
        ).not.toContain(other.ids[table]);
        for (const row of rows) {
          expect(row[orgColumn(table)]).toBe(me.orgId);
        }
      }
    });

    it("cannot look up the other organisation's row by id", async () => {
      for (const [me, other] of pairs()) {
        const { data } = await me.client
          .from(table)
          .select("id")
          .eq("id", other.ids[table]);
        expect(data ?? []).toHaveLength(0);
      }
    });

    it("cannot insert a row with the other organisation's id", async () => {
      for (const [me, other] of pairs()) {
        const row = rowForOrg(table, other.orgId, other);
        if (table === "memberships") row.user_id = me.userId;
        const { data, error } = await me.client
          .from(table)
          .insert(row)
          .select();
        expect(
          error,
          `${me.label} insert into ${other.label}'s ${table}`,
        ).not.toBeNull();
        expect(data).toBeNull();
      }
    });

    it("cannot update or delete the other organisation's row", async () => {
      for (const [me, other] of pairs()) {
        const updated = await me.client
          .from(table)
          .update(UPDATE_PATCH[table])
          .eq("id", other.ids[table])
          .select("id");
        expect(updated.error !== null || updated.data?.length === 0).toBe(true);

        const deleted = await me.client
          .from(table)
          .delete()
          .eq("id", other.ids[table])
          .select("id");
        expect(deleted.error !== null || deleted.data?.length === 0).toBe(true);

        // Double-check with the admin client that the row is untouched.
        const { data: still } = await admin
          .from(table)
          .select("*")
          .eq("id", other.ids[table])
          .single();
        expect(
          still,
          `${other.label}'s ${table} row still exists`,
        ).not.toBeNull();
        for (const [column, value] of Object.entries(UPDATE_PATCH[table])) {
          expect((still as Record<string, unknown>)[column]).not.toBe(value);
        }
      }
    });

    it("signed-out visitors (anon) see nothing", async () => {
      const { data } = await anon.from(table).select("id");
      expect(data ?? []).toHaveLength(0);
    });
  });

  it("cannot point a row in my organisation at the other organisation's property", async () => {
    const { error } = await a.client.from("rooms").insert({
      organisation_id: a.orgId,
      property_id: b.ids.properties,
      name: "Cross-org room",
    });
    expect(error).not.toBeNull();
  });

  it("audit log rows cannot be changed or deleted, even your own", async () => {
    const updated = await a.client
      .from("audit_log")
      .update({ action: "edited" })
      .eq("id", a.ids.audit_log)
      .select("id");
    expect(updated.error !== null || updated.data?.length === 0).toBe(true);

    const deleted = await a.client
      .from("audit_log")
      .delete()
      .eq("id", a.ids.audit_log)
      .select("id");
    expect(deleted.error !== null || deleted.data?.length === 0).toBe(true);

    const { data } = await admin
      .from("audit_log")
      .select("action")
      .eq("id", a.ids.audit_log)
      .single();
    expect(data?.action).toBe("test.created");
  });

  it("the last owner cannot remove themselves from their organisation", async () => {
    const { error } = await a.client
      .from("memberships")
      .delete()
      .eq("id", a.ids.memberships);
    expect(error).not.toBeNull();
  });
});

/**
 * The homes server actions are thin wrappers (session check, Zod, rate
 * limit) around these data functions. Calling the functions with user A's
 * own session client tests exactly the code the actions run.
 */
describe("homes server actions: user A cannot touch user B's home or rooms", () => {
  const ctxOf = (user: TestUser): Ctx => ({
    supabase: user.client as unknown as SupabaseClient<Database>,
    userId: user.userId,
  });

  const edit: UpdateHomeValues = {
    name: "Taken over",
    addressLine1: "1 Hacker Street",
    addressLine2: null,
    city: null,
    postcode: "SW1A 1AA",
    letType: "by_room",
    roomCount: null,
    owner: null,
  };

  async function snapshotB() {
    const { data: property } = await admin
      .from("properties")
      .select("name, address_line1, archived_at")
      .eq("id", b.ids.properties)
      .single();
    const { data: rooms } = await admin
      .from("rooms")
      .select("id, name, archived_at")
      .eq("property_id", b.ids.properties)
      .order("id");
    return { property, rooms };
  }

  it("cannot read B's home", async () => {
    expect(await homes.getHome(ctxOf(a), b.ids.properties)).toBeNull();

    const list = await homes.listHomes(ctxOf(a), {
      page: 1,
      includeArchived: true,
    });
    expect(list.homes.map((h) => h.id)).not.toContain(b.ids.properties);
    expect(list.homes.map((h) => h.id)).toContain(a.ids.properties);
  });

  it("cannot edit, archive, or add rooms to B's home, or rename or archive B's rooms", async () => {
    const before = await snapshotB();
    const ctx = ctxOf(a);

    const attempts: [string, () => Promise<unknown>][] = [
      ["updateHome", () => homes.updateHome(ctx, b.ids.properties, edit)],
      ["archiveHome", () => homes.setHomeArchived(ctx, b.ids.properties, true)],
      [
        "restoreHome",
        () => homes.setHomeArchived(ctx, b.ids.properties, false),
      ],
      ["addRoom", () => homes.addRoom(ctx, b.ids.properties)],
      ["renameRoom", () => homes.renameRoom(ctx, b.ids.rooms, "Taken over")],
      ["archiveRoom", () => homes.setRoomArchived(ctx, b.ids.rooms, true)],
    ];

    for (const [name, attempt] of attempts) {
      await expect(attempt(), name).rejects.toBeInstanceOf(UserFacingError);
    }

    expect(await snapshotB()).toEqual(before);
  });

  it("still works on A's own home (positive control)", async () => {
    const ctx = ctxOf(a);
    const created = await homes.createHome(ctx, {
      name: `Control ${runId}`,
      addressLine1: "2 Test Road",
      addressLine2: null,
      city: null,
      postcode: "LS6 1AA",
      letType: "by_room",
      roomCount: 2,
      owner: { name: "Owner", phone: null, rentPence: 65_050, dueDay: 1 },
    });

    const home = await homes.getHome(ctx, created.id);
    expect(home?.rooms.map((r) => r.name)).toEqual(["Room 1", "Room 2"]);
    expect(home?.owner?.rentPence).toBe(65_050);

    await homes.renameRoom(ctx, home!.rooms[0]!.id, "Front bedroom");
    await homes.setHomeArchived(ctx, created.id, true);
    expect((await homes.getHome(ctx, created.id))?.archived).toBe(true);
    await homes.setHomeArchived(ctx, created.id, false);

    const after = await homes.getHome(ctx, created.id);
    expect(after?.archived).toBe(false);
    expect(after?.rooms.map((r) => r.name)).toEqual([
      "Front bedroom",
      "Room 2",
    ]);

    // Every write left an audit row.
    const { data: audit } = await a.client
      .from("audit_log")
      .select("action")
      .eq("record_id", created.id);
    expect(audit?.map((r) => r.action)).toEqual(
      expect.arrayContaining([
        "home.created",
        "home.archived",
        "home.restored",
      ]),
    );
  });
});

/**
 * The tenants server actions are thin wrappers around these data functions,
 * just like homes. Each user already has one current tenant in their room
 * (created in createSignedInUser).
 */
describe("tenants server actions: user A cannot touch user B's tenants", () => {
  const ctxOf = (user: TestUser): Ctx => ({
    supabase: user.client as unknown as SupabaseClient<Database>,
    userId: user.userId,
  });

  const values: TenantValues = {
    name: "Taken over",
    phone: null,
    email: null,
    rentPence: 1,
    dueDay: 1,
    startDate: "2026-02-01",
    depositPence: 0,
  };

  async function snapshotB() {
    const { data } = await admin
      .from("tenancies")
      .select("id, tenant_name, rent_pence, due_day, start_date, end_date")
      .eq("organisation_id", b.orgId)
      .order("id");
    return data;
  }

  it("cannot read B's tenant, and B's tenant is not on A's home", async () => {
    expect(await tenants.getTenant(ctxOf(a), b.ids.tenancies)).toBeNull();
    expect((await tenants.getTenant(ctxOf(b), b.ids.tenancies))?.name).toBe(
      "Tenant B",
    );

    const home = await homes.getHome(ctxOf(a), a.ids.properties);
    expect(home?.rooms.map((r) => r.tenant?.name)).toEqual(["Tenant A"]);
  });

  it("cannot add a tenant to B's home or room, or edit, move out or bring back B's tenant", async () => {
    const before = await snapshotB();
    const ctx = ctxOf(a);

    const attempts: [string, () => Promise<unknown>][] = [
      [
        "createTenant in B's home",
        () =>
          tenants.createTenant(
            ctx,
            { homeId: b.ids.properties, roomId: null },
            values,
          ),
      ],
      [
        "createTenant in B's room",
        () =>
          tenants.createTenant(
            ctx,
            { homeId: b.ids.properties, roomId: b.ids.rooms },
            values,
          ),
      ],
      [
        "createTenant in A's home but B's room",
        () =>
          tenants.createTenant(
            ctx,
            { homeId: a.ids.properties, roomId: b.ids.rooms },
            values,
          ),
      ],
      [
        "updateTenant",
        () => tenants.updateTenant(ctx, b.ids.tenancies, values),
      ],
      ["moveTenantOut", () => tenants.moveTenantOut(ctx, b.ids.tenancies)],
      [
        "undoMoveTenantOut",
        () => tenants.undoMoveTenantOut(ctx, b.ids.tenancies),
      ],
    ];

    for (const [name, attempt] of attempts) {
      await expect(attempt(), name).rejects.toBeInstanceOf(UserFacingError);
    }

    expect(await snapshotB()).toEqual(before);
  });

  it("still works on A's own home, one current tenant per room (positive control)", async () => {
    const ctx = ctxOf(a);
    const created = await homes.createHome(ctx, {
      name: `Tenants ${runId}`,
      addressLine1: "3 Test Road",
      addressLine2: null,
      city: null,
      postcode: "LS6 1AA",
      letType: "by_room",
      roomCount: 2,
      owner: null,
    });
    const home = await homes.getHome(ctx, created.id);
    const [room1, room2] = home!.rooms;
    const place = { homeId: created.id, roomId: room1!.id };

    const first = await tenants.createTenant(ctx, place, {
      ...values,
      name: "Amira Khan",
      email: "amira@example.com",
      rentPence: 55_000,
      dueDay: 5,
    });

    // The room is taken; the other room is not; the home needs a room.
    await expect(
      tenants.createTenant(ctx, place, values),
    ).rejects.toBeInstanceOf(UserFacingError);
    await expect(
      tenants.createTenant(ctx, { homeId: created.id, roomId: null }, values),
    ).rejects.toBeInstanceOf(UserFacingError);
    // A room with a tenant cannot be archived, nor can its home.
    await expect(
      homes.setRoomArchived(ctx, room1!.id, true),
    ).rejects.toBeInstanceOf(UserFacingError);
    await expect(
      homes.setHomeArchived(ctx, created.id, true),
    ).rejects.toBeInstanceOf(UserFacingError);

    const withTenant = await homes.getHome(ctx, created.id);
    expect(withTenant?.rooms.map((r) => r.tenant?.name ?? null)).toEqual([
      "Amira Khan",
      null,
    ]);

    // Edit the rent, then read it back.
    await tenants.updateTenant(ctx, first.id, {
      ...values,
      name: "Amira Khan",
      email: "amira@example.com",
      rentPence: 60_000,
      dueDay: 5,
    });
    const detail = await tenants.getTenant(ctx, first.id);
    expect(detail?.rentPence).toBe(60_000);
    expect(detail?.home.id).toBe(created.id);
    expect(detail?.room?.id).toBe(room1!.id);
    expect(detail?.endDate).toBeNull();

    // Moved out frees the room; undo takes it back.
    await tenants.moveTenantOut(ctx, first.id);
    expect((await tenants.getTenant(ctx, first.id))?.endDate).not.toBeNull();
    const freed = await homes.getHome(ctx, created.id);
    expect(freed?.rooms[0]?.tenant).toBeNull();
    expect(freed?.pastTenants.map((t) => t.name)).toEqual(["Amira Khan"]);

    await tenants.undoMoveTenantOut(ctx, first.id);
    expect((await tenants.getTenant(ctx, first.id))?.endDate).toBeNull();

    // Moved out again, someone new moves in: the old tenant cannot come back.
    await tenants.moveTenantOut(ctx, first.id);
    const second = await tenants.createTenant(ctx, place, {
      ...values,
      name: "Ben Osei",
    });
    await expect(
      tenants.undoMoveTenantOut(ctx, first.id),
    ).rejects.toBeInstanceOf(UserFacingError);
    await tenants.createTenant(
      ctx,
      { homeId: created.id, roomId: room2!.id },
      { ...values, name: "Cara Lee" },
    );

    const after = await homes.getHome(ctx, created.id);
    expect(after?.rooms.map((r) => r.tenant?.name ?? null)).toEqual([
      "Ben Osei",
      "Cara Lee",
    ]);

    // Writes left audit rows, with no names, phone numbers or emails in them.
    const { data: audit } = await a.client
      .from("audit_log")
      .select("action, changes")
      .in("record_id", [first.id, second.id]);
    expect(audit?.map((r) => r.action)).toEqual(
      expect.arrayContaining([
        "tenant.created",
        "tenant.updated",
        "tenant.moved_out",
        "tenant.move_out_undone",
      ]),
    );
    const logged = JSON.stringify(audit);
    expect(logged).not.toContain("Amira");
    expect(logged).not.toContain("amira@example.com");
  });
});

/**
 * The rent server actions are thin wrappers around these data functions,
 * like homes and tenants. Each user already has one rent charge with one
 * payment (created in createSignedInUser).
 */
describe("rent server actions: user A cannot touch user B's rent or payments", () => {
  const ctxOf = (user: TestUser): Ctx => ({
    supabase: user.client as unknown as SupabaseClient<Database>,
    userId: user.userId,
  });

  const today = todayInLondon();
  const thisMonth = monthOf(today);
  const lastMonth = addMonths(thisMonth, -1);

  async function snapshotB() {
    const { data: charges } = await admin
      .from("rent_charges")
      .select("id, amount_pence, due_date")
      .eq("organisation_id", b.orgId)
      .order("id");
    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("organisation_id", b.orgId)
      .order("id");
    return { charges, payments };
  }

  it("cannot record a payment on B's rent, or remove or put back B's payment", async () => {
    const before = await snapshotB();
    const ctx = ctxOf(a);

    const attempts: [string, () => Promise<unknown>][] = [
      ["markPaid", () => rent.recordPayment(ctx, b.ids.rent_charges, "rest")],
      ["otherAmount", () => rent.recordPayment(ctx, b.ids.rent_charges, 100)],
      ["removePayment", () => rent.removePayment(ctx, b.ids.payments)],
      ["restorePayment", () => rent.restorePayment(ctx, b.ids.payments)],
    ];
    for (const [name, attempt] of attempts) {
      await expect(attempt(), name).rejects.toBeInstanceOf(UserFacingError);
    }

    expect(await snapshotB()).toEqual(before);
  });

  it("the daily job run as A only makes A's charges, and a second run makes none", async () => {
    // The real job uses the service-role client. Run with A's own session,
    // RLS keeps it inside A's organisation, which is what this checks.
    const before = await snapshotB();
    const db = a.client as unknown as SupabaseClient<Database>;

    await generateAllRentCharges(db);
    const second = await generateAllRentCharges(db);
    expect(second.chargesCreated).toBe(0);
    expect(second.today).toBe(today);

    expect(await snapshotB()).toEqual(before);

    // A's tenant (moved in on 5 January 2026) now has this month's charge.
    const { data: mine } = await a.client
      .from("rent_charges")
      .select("period_start, due_date, amount_pence")
      .eq("tenancy_id", a.ids.tenancies)
      .eq("period_start", monthStart(thisMonth));
    expect(mine).toHaveLength(1);
    expect(mine?.[0]?.amount_pence).toBe(55_000);
  });

  it("A's rent page and dashboard never show B's tenants", async () => {
    const page = await rent.getRentMonth(
      ctxOf(a),
      { month: thisMonth, page: 1 },
      today,
    );
    expect(page.rows.map((r) => r.tenantName)).toContain("Tenant A");
    expect(page.rows.map((r) => r.tenantName)).not.toContain("Tenant B");

    const dashboard = await getDashboard(ctxOf(a), today);
    const homeIds = dashboard?.summary.homes.map((h) => h.id) ?? [];
    expect(homeIds).toContain(a.ids.properties);
    expect(homeIds).not.toContain(b.ids.properties);
    expect(JSON.stringify(dashboard)).not.toContain("Tenant B");
  });

  it("still works on A's own rent: charges, part payments, paid, remove and undo (positive control)", async () => {
    const ctx = ctxOf(a);
    const created = await homes.createHome(ctx, {
      name: `Rent ${runId}`,
      addressLine1: "4 Test Road",
      addressLine2: null,
      city: null,
      postcode: "LS6 1AA",
      letType: "whole_home",
      roomCount: null,
      owner: { name: "Owner", phone: null, rentPence: 40_000, dueDay: 1 },
    });
    const values: TenantValues = {
      name: "Rent Payer",
      phone: null,
      email: null,
      rentPence: 60_000,
      dueDay: 1,
      // Moved in on the first day of last month: two months of rent.
      startDate: monthStart(lastMonth),
      depositPence: 0,
    };
    const tenant = await tenants.createTenant(
      ctx,
      { homeId: created.id, roomId: null },
      values,
    );

    const chargesOf = async () => {
      const { data } = await a.client
        .from("rent_charges")
        .select("id, period_start, due_date, amount_pence")
        .eq("tenancy_id", tenant.id)
        .order("period_start");
      return data ?? [];
    };

    // One charge per month from move-in to now, made with the tenant.
    const charges = await chargesOf();
    expect(charges.map((c) => c.period_start)).toEqual([
      monthStart(lastMonth),
      monthStart(thisMonth),
    ]);
    expect(charges.map((c) => c.amount_pence)).toEqual([60_000, 60_000]);

    // A rent change makes no new charges and leaves old amounts alone.
    await tenants.updateTenant(ctx, tenant.id, {
      ...values,
      rentPence: 65_000,
    });
    expect(await chargesOf()).toEqual(charges);

    const rowFor = async (month: string) => {
      const page = await rent.getRentMonth(ctx, { month, page: 1 }, today);
      return {
        page,
        row: page.rows.find((r) => r.tenantId === tenant.id),
      };
    };

    // Last month's rent was due on the 1st of last month, so it is late.
    const first = await rowFor(lastMonth);
    const { page } = first;
    let row = first.row;
    expect(row?.status).toBe("late");
    expect(row?.amountPence).toBe(60_000);
    expect(row?.owedPence).toBe(60_000);
    const chargeId = row!.chargeId;

    // Part payment: still late, with the rest left to pay.
    const part = await rent.recordPayment(ctx, chargeId, 20_000);
    ({ row } = await rowFor(lastMonth));
    expect(row?.status).toBe("late");
    expect(row?.paidPence).toBe(20_000);
    expect(row?.owedPence).toBe(40_000);

    // More than is left is refused; so is nothing.
    await expect(
      rent.recordPayment(ctx, chargeId, 40_001),
    ).rejects.toBeInstanceOf(UserFacingError);
    await expect(rent.recordPayment(ctx, chargeId, 0)).rejects.toBeInstanceOf(
      UserFacingError,
    );

    // "Mark as paid" records what is left.
    const rest = await rent.recordPayment(ctx, chargeId, "rest");
    expect(rest.amountPence).toBe(40_000);
    ({ row } = await rowFor(lastMonth));
    expect(row?.status).toBe("paid");
    expect(row?.payments.map((p) => p.amountPence).sort()).toEqual([
      20_000, 40_000,
    ]);
    await expect(
      rent.recordPayment(ctx, chargeId, "rest"),
    ).rejects.toBeInstanceOf(UserFacingError);

    // Removing and putting back needs the payments.removed_at migration.
    if (page.canRemovePayments) {
      await rent.removePayment(ctx, rest.paymentId);
      ({ row } = await rowFor(lastMonth));
      expect(row?.status).toBe("late");
      expect(row?.paidPence).toBe(20_000);
      // Removing it twice finds nothing to remove.
      await expect(
        rent.removePayment(ctx, rest.paymentId),
      ).rejects.toBeInstanceOf(UserFacingError);

      await rent.restorePayment(ctx, rest.paymentId);
      ({ row } = await rowFor(lastMonth));
      expect(row?.status).toBe("paid");

      // A removed payment cannot come back once the month is paid another way.
      await rent.removePayment(ctx, part.paymentId);
      await rent.recordPayment(ctx, chargeId, "rest");
      await expect(
        rent.restorePayment(ctx, part.paymentId),
      ).rejects.toBeInstanceOf(UserFacingError);
      ({ row } = await rowFor(lastMonth));
      expect(row?.status).toBe("paid");
      expect(row?.paidPence).toBe(60_000);

      // The removed payment is still in the database, marked as removed.
      const { data: kept } = await a.client
        .from("payments")
        .select("id, removed_at")
        .eq("id", part.paymentId)
        .single();
      expect(kept?.removed_at).not.toBeNull();
    }

    // The dashboard counts this month's rent and the owner's rent.
    const dashboard = await getDashboard(ctx, today);
    const home = dashboard?.summary.homes.find((h) => h.id === created.id);
    expect(home?.expectedPence).toBe(60_000);
    expect(home?.ownerRentPence).toBe(40_000);
    expect(home?.marginPence).toBe(20_000);

    // Payments left audit rows, with no tenant name in them.
    const { data: audit } = await a.client
      .from("audit_log")
      .select("action, changes")
      .eq("table_name", "payments");
    expect(audit?.map((r) => r.action)).toEqual(
      expect.arrayContaining(["payment.recorded"]),
    );
    expect(JSON.stringify(audit)).not.toContain("Rent Payer");
  });
});

describe("settings and the late rent email: user A cannot see or change B's", () => {
  const ctxOf = (user: TestUser): Ctx => ({
    supabase: user.client as unknown as SupabaseClient<Database>,
    userId: user.userId,
  });

  async function switchOf(user: TestUser): Promise<boolean | undefined> {
    const { data } = await admin
      .from("organisations")
      .select("overdue_email_enabled")
      .eq("id", user.orgId)
      .single();
    return (data as { overdue_email_enabled?: boolean } | null)
      ?.overdue_email_enabled;
  }

  it("the switch starts on, and A's change only touches A's organisation", async () => {
    expect(await switchOf(a)).toBe(true);
    expect(await switchOf(b)).toBe(true);

    const mine = await settings.getOverdueEmailSettings(ctxOf(a));
    expect(mine.organisationName).toBe(`RLS test ${runId} A`);
    expect(mine.isOwner).toBe(true);
    expect(mine.enabled).toBe(true);

    await settings.setOverdueEmailEnabled(ctxOf(a), false);
    expect(await switchOf(a)).toBe(false);
    expect(await switchOf(b)).toBe(true);

    // Straight at the table: RLS stops A changing B's switch.
    await a.client
      .from("organisations")
      .update({ overdue_email_enabled: false })
      .eq("id", b.orgId);
    expect(await switchOf(b)).toBe(true);

    // The change was audited.
    const { data: audit } = await a.client
      .from("audit_log")
      .select("action, changes")
      .eq("action", "organisation.overdue_email_changed");
    expect(audit).toHaveLength(1);

    await settings.setOverdueEmailEnabled(ctxOf(a), true);
    expect(await switchOf(a)).toBe(true);
  });

  it("the daily email job run as A only reads A's late rent, and respects the switch", async () => {
    // The real job uses the service-role client. With A's own session, RLS
    // keeps it inside A's organisation, which is what this checks.
    const db = a.client as unknown as SupabaseClient<Database>;
    const sent: EmailMessage[] = [];
    const askedFor: string[] = [];
    const run = () =>
      sendOverdueDigests(db, {
        appUrl: "https://rentdesk.example",
        send: async (message) => {
          sent.push(message);
          return { sent: true, id: null };
        },
        recipientsFor: async (organisationId) => {
          askedFor.push(organisationId);
          return ["owner-a@example.com"];
        },
      });

    const result = await run();
    expect(result.status).toBe("done");
    expect(result.organisationsChecked).toBe(1);
    expect(new Set(askedFor)).toEqual(
      askedFor.length ? new Set([a.orgId]) : new Set(),
    );
    for (const message of sent) {
      expect(message.text).not.toContain("Tenant B");
      expect(message.idempotencyKey).toContain(a.orgId);
    }

    // Turned off: nothing is sent.
    await settings.setOverdueEmailEnabled(ctxOf(a), false);
    sent.length = 0;
    const off = await run();
    expect(off.counts["turned-off"]).toBe(1);
    expect(sent).toHaveLength(0);
    await settings.setOverdueEmailEnabled(ctxOf(a), true);
  });
});
