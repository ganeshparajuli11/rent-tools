/**
 * Roles (roadmap B3, PRODUCT_SPEC.md §5): what owner, admin, manager and
 * staff can each do, in two organisations. Runs against the Supabase
 * project in .env.local (use your DEV project, never production).
 *
 *   pnpm test:rls
 *
 * Organisation X has one person in every role (plus, during one test, a
 * removed member); organisation Y has an owner and an admin. The service
 * role key is used ONLY to create the throwaway users, add the extra
 * memberships (invitations arrive in B4) and clean up. Every check runs
 * through each person's own session, so row-level security decides, and
 * through the server data functions, so requireRole is checked too.
 */
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { roleTooLowMessage, type Role } from "@/lib/roles";
import type { Database } from "@/lib/supabase/database.types";
import { type Ctx, requireRole } from "@/server/context";
import * as homes from "@/server/homes";
import * as rent from "@/server/rent";
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
const admin = createClient<Database>(url, serviceRoleKey, clientOptions);

const runId = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

type Person = {
  label: string;
  role: Role;
  userId: string;
  client: SupabaseClient<Database>;
  ctx: Ctx;
  membershipId: string;
};

function must<T>(result: { data: T | null; error: unknown }, what: string): T {
  if (result.error || result.data === null) {
    throw new Error(`${what} failed: ${JSON.stringify(result.error)}`);
  }
  return result.data;
}

async function signedInUser(label: string) {
  const email = `rls-roles-${runId}-${label}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: `Tester ${label} Example` },
  });
  if (created.error || !created.data.user) {
    throw new Error(`create user ${label} failed: ${created.error?.message}`);
  }
  const userId = created.data.user.id;
  createdUserIds.push(userId);

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (link.error || !link.data.properties) {
    throw new Error(`generate link ${label} failed: ${link.error?.message}`);
  }
  const client = createClient<Database>(url!, publishableKey!, clientOptions);
  must(
    await client.auth.verifyOtp({
      type: "email",
      token_hash: link.data.properties.hashed_token,
    }),
    `sign in ${label}`,
  );
  return { userId, client };
}

/** An organisation with an owner (set up as /setup does) and other roles. */
async function organisationWith(name: string, others: Role[]) {
  const owner = await signedInUser(`${name}-owner`);
  const orgId = must(
    await owner.client.rpc("create_organisation", {
      org_name: `Roles test ${runId} ${name}`,
      org_account_type: "property_manager",
      org_contact_email: `contact-${name}@example.com`,
      creator_full_name: `Tester ${name} Owner`,
    }),
    `set up ${name}`,
  );
  createdOrgIds.push(orgId);

  const people: Record<string, Person> = {};
  const add = async (
    role: Role,
    user: { userId: string; client: SupabaseClient<Database> },
  ) => {
    const membership =
      role === "owner"
        ? must(
            await admin
              .from("memberships")
              .select("id")
              .eq("user_id", user.userId)
              .eq("organisation_id", orgId)
              .single(),
            `read ${name} owner membership`,
          )
        : must(
            await admin
              .from("memberships")
              .insert({ user_id: user.userId, organisation_id: orgId, role })
              .select("id")
              .single(),
            `add ${name} ${role}`,
          );
    people[role] = {
      label: `${name} ${role}`,
      role,
      userId: user.userId,
      client: user.client,
      ctx: {
        supabase: user.client as unknown as Ctx["supabase"],
        userId: user.userId,
      },
      membershipId: membership.id,
    };
  };
  await add("owner", owner);
  for (const role of others)
    await add(role, await signedInUser(`${name}-${role}`));
  return { orgId, people };
}

const ROLES_IN_ORDER: Role[] = ["owner", "admin", "manager", "staff"];
const CAN_MANAGE: Record<Role, boolean> = {
  owner: true,
  admin: true,
  manager: true,
  staff: false,
};

let X: { orgId: string; people: Record<string, Person> };
let Y: { orgId: string; people: Record<string, Person> };
let homeId: string;
let tenancyId: string;
let chargeId: string;

const person = (org: typeof X, role: Role) => org.people[role]!;

beforeAll(async () => {
  X = await organisationWith("x", ["admin", "manager", "staff"]);
  Y = await organisationWith("y", ["admin"]);

  // A home, a tenant and a month's rent in X, made by X's owner.
  const owner = person(X, "owner").client;
  homeId = must(
    await owner
      .from("properties")
      .insert({ organisation_id: X.orgId, name: "Sample House 01" })
      .select("id")
      .single(),
    "add home",
  ).id;
  tenancyId = must(
    await owner
      .from("tenancies")
      .insert({
        organisation_id: X.orgId,
        property_id: homeId,
        tenant_name: "Taylor Example",
        rent_pence: 50_000,
        due_day: 1,
        start_date: "2026-11-01",
      })
      .select("id")
      .single(),
    "add tenant",
  ).id;
  chargeId = must(
    await owner
      .from("rent_charges")
      .insert({
        organisation_id: X.orgId,
        tenancy_id: tenancyId,
        period_start: "2026-11-01",
        due_date: "2026-11-01",
        amount_pence: 50_000,
      })
      .select("id")
      .single(),
    "add rent charge",
  ).id;
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

describe("roles: reading", () => {
  it.each(ROLES_IN_ORDER)(
    "%s in X reads X's homes and members, and nothing of Y's",
    async (role) => {
      const { client } = person(X, role);
      const { data: homesSeen } = await client.from("properties").select("id");
      expect(homesSeen?.map((h) => h.id)).toEqual([homeId]);
      const { data: members } = await client
        .from("memberships")
        .select("organisation_id");
      expect(members?.length).toBe(4);
      expect(members?.every((m) => m.organisation_id === X.orgId)).toBe(true);
    },
  );

  it("Y's owner and admin read nothing of X's", async () => {
    for (const role of ["owner", "admin"] as const) {
      const { client } = person(Y, role);
      const { data } = await client
        .from("properties")
        .select("id")
        .eq("organisation_id", X.orgId);
      expect(data, role).toEqual([]);
    }
  });
});

describe("roles: homes, tenants and rent charges (managers and above)", () => {
  it.each(ROLES_IN_ORDER)("%s", async (role) => {
    const { client, userId } = person(X, role);
    const allowed = CAN_MANAGE[role];

    const room = await client
      .from("rooms")
      .insert({ organisation_id: X.orgId, property_id: homeId, name: role })
      .select("id");
    expect((room.data?.length ?? 0) === 1, "add room").toBe(allowed);

    const changedHome = await client
      .from("properties")
      .update({ notes: `checked by ${role}` })
      .eq("id", homeId)
      .select("id");
    expect(changedHome.data?.length ?? 0, "change home").toBe(allowed ? 1 : 0);

    const changedTenant = await client
      .from("tenancies")
      .update({ tenant_phone: "07700 900000" })
      .eq("id", tenancyId)
      .select("id");
    expect(changedTenant.data?.length ?? 0, "change tenant").toBe(
      allowed ? 1 : 0,
    );

    const charge = await client
      .from("rent_charges")
      .insert({
        organisation_id: X.orgId,
        tenancy_id: tenancyId,
        period_start: `2027-0${ROLES_IN_ORDER.indexOf(role) + 1}-01`,
        due_date: `2027-0${ROLES_IN_ORDER.indexOf(role) + 1}-01`,
        amount_pence: 50_000,
      })
      .select("id");
    expect(charge.error === null, "add rent charge").toBe(allowed);

    const photo = await client
      .from("property_photos")
      .insert({
        organisation_id: X.orgId,
        property_id: homeId,
        storage_path: `${X.orgId}/${homeId}/${role}-${runId}.jpg`,
        created_by: userId,
      })
      .select("id");
    expect(photo.error === null, "add photo").toBe(allowed);
  });

  it("staff get a plain message from the server, and nothing changes", async () => {
    const { ctx } = person(X, "staff");
    const message = roleTooLowMessage("manager");
    await expect(
      homes.createHome(ctx, {
        name: `Staff ${runId}`,
        addressLine1: "5 Test Road",
        addressLine2: null,
        city: null,
        postcode: "LS6 1AA",
        letType: "by_room",
        roomCount: 1,
        owner: null,
      }),
    ).rejects.toThrow(message);
    await expect(homes.setHomeArchived(ctx, homeId, true)).rejects.toThrow(
      message,
    );
    await expect(homes.addRoom(ctx, homeId)).rejects.toThrow(message);
    await expect(tenants.moveTenantOut(ctx, tenancyId)).rejects.toThrow(
      message,
    );

    const { data } = await admin
      .from("properties")
      .select("archived_at")
      .eq("organisation_id", X.orgId);
    expect(data).toEqual([{ archived_at: null }]);
  });

  it("managers pass the same server check", async () => {
    const result = await requireRole(person(X, "manager").ctx, "manager");
    expect(result).toEqual({ organisationId: X.orgId, role: "manager" });
    await expect(
      requireRole(person(X, "manager").ctx, "admin"),
    ).rejects.toThrow(roleTooLowMessage("admin"));
  });
});

describe("roles: rent payments (every role)", () => {
  it("staff record a payment, remove it and put it back", async () => {
    const { ctx } = person(X, "staff");
    const paid = await rent.recordPayment(ctx, chargeId, 1_000);
    expect(paid.amountPence).toBe(1_000);
    await rent.removePayment(ctx, paid.paymentId);
    await rent.restorePayment(ctx, paid.paymentId);

    const { data } = await admin
      .from("audit_log")
      .select("action, user_id")
      .eq("organisation_id", X.orgId)
      .eq("record_id", paid.paymentId);
    expect(data?.map((row) => row.action).sort()).toEqual([
      "payment.recorded",
      "payment.removed",
      "payment.restored",
    ]);
    expect(
      data?.every((row) => row.user_id === person(X, "staff").userId),
    ).toBe(true);
  });

  it("Y's admin cannot record a payment on X's rent", async () => {
    const { client, userId } = person(Y, "admin");
    const { error } = await client.from("payments").insert({
      organisation_id: X.orgId,
      rent_charge_id: chargeId,
      amount_pence: 1,
      recorded_by: userId,
    });
    expect(error).not.toBeNull();
  });
});

describe("roles: settings and deletes (owners only)", () => {
  it.each(ROLES_IN_ORDER)("%s", async (role) => {
    const { client, ctx } = person(X, role);
    const isOwner = role === "owner";

    const changed = await client
      .from("organisations")
      .update({ name: `Roles test ${runId} x` })
      .eq("id", X.orgId)
      .select("id");
    expect(changed.data?.length ?? 0, "rename organisation").toBe(
      isOwner ? 1 : 0,
    );

    if (isOwner) {
      await expect(settings.setOverdueEmailEnabled(ctx, true)).resolves.toEqual(
        { enabled: true },
      );
    } else {
      await expect(settings.setOverdueEmailEnabled(ctx, false)).rejects.toThrow(
        roleTooLowMessage("owner"),
      );
    }

    if (!isOwner) {
      const deleted = await client
        .from("properties")
        .delete()
        .eq("id", homeId)
        .select("id");
      expect(deleted.data?.length ?? 0, "hard delete").toBe(0);
    }
  });
});

describe("roles: members", () => {
  const setRole = (who: Person, target: Person, role: string) =>
    who.client
      .from("memberships")
      .update({ role })
      .eq("id", target.membershipId)
      .select("id");

  const roleOf = async (target: Person) =>
    must(
      await admin
        .from("memberships")
        .select("role, status")
        .eq("id", target.membershipId)
        .single(),
      "read role",
    );

  it("an admin changes the role of anyone who is not an owner, but never makes an owner", async () => {
    const adminX = person(X, "admin");
    const staff = person(X, "staff");

    expect((await setRole(adminX, staff, "manager")).data).toHaveLength(1);
    expect((await roleOf(staff)).role).toBe("manager");
    expect((await setRole(adminX, staff, "staff")).data).toHaveLength(1);

    const toOwner = await setRole(adminX, staff, "owner");
    expect(toOwner.error !== null || toOwner.data?.length === 0).toBe(true);
    const selfToOwner = await setRole(adminX, adminX, "owner");
    expect(selfToOwner.error !== null || selfToOwner.data?.length === 0).toBe(
      true,
    );
    expect((await roleOf(staff)).role).toBe("staff");
    expect((await roleOf(adminX)).role).toBe("admin");
  });

  it("an admin cannot demote or remove the owner", async () => {
    const adminX = person(X, "admin");
    const owner = person(X, "owner");
    expect((await setRole(adminX, owner, "staff")).data ?? []).toEqual([]);
    const removed = await adminX.client
      .from("memberships")
      .delete()
      .eq("id", owner.membershipId)
      .select("id");
    expect(removed.data ?? []).toEqual([]);
    expect(await roleOf(owner)).toEqual({ role: "owner", status: "active" });
  });

  it("managers and staff cannot change anyone's role", async () => {
    for (const role of ["manager", "staff"] as const) {
      const who = person(X, role);
      const result = await setRole(who, person(X, "staff"), "admin");
      expect(result.data ?? [], role).toEqual([]);
    }
    expect((await roleOf(person(X, "staff"))).role).toBe("staff");
  });

  it("only the role and status of a membership can be changed", async () => {
    const owner = person(X, "owner");
    const moved = await owner.client
      .from("memberships")
      .update({ organisation_id: Y.orgId })
      .eq("id", person(X, "staff").membershipId)
      .select("id");
    expect(moved.error).not.toBeNull();
    const madeUp = await setRole(owner, person(X, "staff"), "superadmin");
    expect(madeUp.error).not.toBeNull();
  });

  it("nobody in Y changes X's members, and an admin cannot add members yet (B4)", async () => {
    for (const role of ["owner", "admin"] as const) {
      const result = await setRole(
        person(Y, role),
        person(X, "staff"),
        "admin",
      );
      expect(result.data ?? [], role).toEqual([]);
    }
    const added = await person(X, "admin")
      .client.from("memberships")
      .insert({
        user_id: person(Y, "admin").userId,
        organisation_id: X.orgId,
        role: "staff",
      })
      .select("id");
    expect(added.error).not.toBeNull();
  });

  it("the last owner cannot step down or be marked removed", async () => {
    const owner = person(X, "owner");
    const down = await setRole(owner, owner, "admin");
    expect(down.error).not.toBeNull();
    const removed = await owner.client
      .from("memberships")
      .update({ status: "removed" })
      .eq("id", owner.membershipId)
      .select("id");
    expect(removed.error).not.toBeNull();
    expect(await roleOf(owner)).toEqual({ role: "owner", status: "active" });
  });

  it("a removed member loses all access, and gets it back when made active", async () => {
    const adminX = person(X, "admin");
    const staff = person(X, "staff");
    const setStatus = (status: string) =>
      adminX.client
        .from("memberships")
        .update({ status })
        .eq("id", staff.membershipId)
        .select("id");

    expect((await setStatus("removed")).data).toHaveLength(1);
    for (const table of [
      "properties",
      "tenancies",
      "rent_charges",
      "memberships",
      "organisations",
    ] as const) {
      const { data } = await (staff.client as SupabaseClient)
        .from(table)
        .select("id");
      expect(data, table).toEqual([]);
    }
    await expect(rent.recordPayment(staff.ctx, chargeId, 1)).rejects.toThrow(
      "Please finish setting up your organisation first.",
    );

    expect((await setStatus("active")).data).toHaveLength(1);
    const { data } = await staff.client.from("properties").select("id");
    expect(data?.map((h) => h.id)).toEqual([homeId]);
  });
});
