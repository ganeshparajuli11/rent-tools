/**
 * Owner records and their links to homes (roadmap C1), in two
 * organisations and every role. Runs against the Supabase project in
 * .env.local (use your DEV project, never production).
 *
 *   pnpm test:rls
 *
 * Organisation X has one person in every role; organisation Y has an
 * owner. The service role key is used ONLY to create the throwaway users,
 * add the extra memberships and clean up. Every check runs through each
 * person's own session, so row-level security decides, and through the
 * server data functions, so requireRole is checked too.
 */
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { roleTooLowMessage, type Role } from "@/lib/roles";
import type { Database } from "@/lib/supabase/database.types";
import type { OwnerValues } from "@/lib/validation/owners";
import type { Ctx } from "@/server/context";
import * as owners from "@/server/owners";

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
const anon = createClient<Database>(url, publishableKey, clientOptions);

const runId = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

type Person = {
  role: Role;
  userId: string;
  client: SupabaseClient<Database>;
  ctx: Ctx;
};

function must<T>(
  result: { data: T; error: unknown },
  what: string,
): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what} failed: ${JSON.stringify(result.error)}`);
  }
  return result.data as NonNullable<T>;
}

async function signedInUser(label: string) {
  const email = `rls-owners-${runId}-${label}@example.com`;
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
      org_name: `Owners test ${runId} ${name}`,
      org_account_type: "property_manager",
      org_contact_email: `contact-${name}@example.com`,
      creator_full_name: `Tester ${name} Owner`,
    }),
    `set up ${name}`,
  );
  createdOrgIds.push(orgId);

  const people: Partial<Record<Role, Person>> = {};
  const add = (
    role: Role,
    user: { userId: string; client: SupabaseClient<Database> },
  ) => {
    people[role] = {
      role,
      userId: user.userId,
      client: user.client,
      ctx: {
        supabase: user.client as unknown as Ctx["supabase"],
        userId: user.userId,
      },
    };
  };
  add("owner", owner);
  for (const role of others) {
    const user = await signedInUser(`${name}-${role}`);
    must(
      await admin
        .from("memberships")
        .insert({ user_id: user.userId, organisation_id: orgId, role })
        .select("id")
        .single(),
      `add ${name} ${role}`,
    );
    add(role, user);
  }
  return { orgId, people };
}

const ROLES_IN_ORDER: Role[] = ["owner", "admin", "manager", "staff"];
const CAN_MANAGE: Record<Role, boolean> = {
  owner: true,
  admin: true,
  manager: true,
  staff: false,
};

type Org = Awaited<ReturnType<typeof organisationWith>>;
let X: Org;
let Y: Org;
let homeX: string;
let homeY: string;
let ownerX: string;
let ownerY: string;

const person = (org: Org, role: Role) => org.people[role]!;

const OWNER_NAME = `Taylor Example ${runId}`;

const ownerValues = (fullName: string): OwnerValues => ({
  ownerType: "individual",
  fullName,
  companyName: null,
  email: "taylor@example.com",
  phone: "07700 900123",
  addressLine1: null,
  addressLine2: null,
  city: null,
  postcode: null,
  notes: null,
});

beforeAll(async () => {
  X = await organisationWith("x", ["admin", "manager", "staff"]);
  Y = await organisationWith("y", []);

  const addHome = async (org: Org, name: string) =>
    must(
      await person(org, "owner")
        .client.from("properties")
        .insert({ organisation_id: org.orgId, name })
        .select("id")
        .single(),
      `add ${name}`,
    ).id;
  homeX = await addHome(X, "Sample House 01");
  homeY = await addHome(Y, "Sample House 02");

  ownerX = (
    await owners.createOwner(
      person(X, "owner").ctx,
      ownerValues(OWNER_NAME),
      homeX,
    )
  ).id;
  ownerY = (
    await owners.createOwner(
      person(Y, "owner").ctx,
      ownerValues(`Sam Sample ${runId}`),
      homeY,
    )
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

describe("owners: reading", () => {
  it.each(ROLES_IN_ORDER)(
    "%s in X reads X's owners and links, and nothing of Y's",
    async (role) => {
      const { client } = person(X, role);
      const { data: seen } = await client.from("property_owners").select("id");
      expect(seen?.map((o) => o.id)).toContain(ownerX);
      expect(seen?.map((o) => o.id)).not.toContain(ownerY);

      const { data: links } = await client
        .from("property_owner_links")
        .select("organisation_id, property_id, owner_id");
      expect(links?.length).toBeGreaterThan(0);
      expect(links?.every((l) => l.organisation_id === X.orgId)).toBe(true);
    },
  );

  it("Y's owner reads nothing of X's, through the table or the server", async () => {
    const { client, ctx } = person(Y, "owner");
    const { data } = await client
      .from("property_owners")
      .select("id")
      .eq("organisation_id", X.orgId);
    expect(data).toEqual([]);
    expect(await owners.getOwner(ctx, ownerX)).toBeNull();
  });

  it("signed-out visitors read nothing", async () => {
    const { data: rows } = await anon.from("property_owners").select("id");
    expect(rows ?? []).toEqual([]);
    const { data: links } = await anon
      .from("property_owner_links")
      .select("id");
    expect(links ?? []).toEqual([]);
  });

  it("the record page shows the linked home", async () => {
    const owner = await owners.getOwner(person(X, "staff").ctx, ownerX);
    expect(owner?.name).toBe(OWNER_NAME);
    expect(owner?.homes.map((home) => home.id)).toEqual([homeX]);
  });
});

describe("owners: adding and changing (managers and above)", () => {
  it.each(ROLES_IN_ORDER)("%s", async (role) => {
    const { client } = person(X, role);
    const allowed = CAN_MANAGE[role];

    const added = await client
      .from("property_owners")
      .insert({
        organisation_id: X.orgId,
        owner_type: "company",
        company_name: `Demo Estates ${role} ${runId}`,
      })
      .select("id");
    expect(added.error === null, "add owner").toBe(allowed);

    const changed = await client
      .from("property_owners")
      .update({ notes: `checked by ${role}` })
      .eq("id", ownerX)
      .select("id");
    expect(changed.data?.length ?? 0, "change owner").toBe(allowed ? 1 : 0);
  });

  it("staff get a plain message from the server, and nothing changes", async () => {
    const { ctx } = person(X, "staff");
    const message = roleTooLowMessage("manager");
    await expect(
      owners.createOwner(ctx, ownerValues(`Staff ${runId}`)),
    ).rejects.toThrow(message);
    await expect(
      owners.updateOwner(ctx, ownerX, ownerValues("Changed")),
    ).rejects.toThrow(message);
    await expect(owners.setOwnerArchived(ctx, ownerX, true)).rejects.toThrow(
      message,
    );
    await expect(owners.linkOwner(ctx, homeX, ownerX)).rejects.toThrow(message);
    await expect(owners.unlinkOwner(ctx, homeX, ownerX)).rejects.toThrow(
      message,
    );
    const owner = await owners.getOwner(ctx, ownerX);
    expect(owner?.name).toBe(OWNER_NAME);
    expect(owner?.archived).toBe(false);
  });

  it("nobody can add an owner to, or change one in, another organisation", async () => {
    const { client } = person(Y, "owner");
    const spoofed = await client
      .from("property_owners")
      .insert({ organisation_id: X.orgId, full_name: "Sneaky" })
      .select("id");
    expect(spoofed.error).not.toBeNull();

    const changed = await client
      .from("property_owners")
      .update({ notes: "hacked" })
      .eq("id", ownerX)
      .select("id");
    expect(changed.data ?? []).toEqual([]);

    await expect(
      owners.updateOwner(person(Y, "owner").ctx, ownerX, ownerValues("Hacked")),
    ).rejects.toThrow();
  });

  it("only an owner of the organisation can delete an owner record", async () => {
    const spare = must(
      await person(X, "manager")
        .client.from("property_owners")
        .insert({ organisation_id: X.orgId, full_name: `Spare ${runId}` })
        .select("id")
        .single(),
      "add spare owner",
    ).id;
    for (const role of ["admin", "manager", "staff"] as const) {
      const { data } = await person(X, role)
        .client.from("property_owners")
        .delete()
        .eq("id", spare)
        .select("id");
      expect(data ?? [], role).toEqual([]);
    }
    const { data } = await person(X, "owner")
      .client.from("property_owners")
      .delete()
      .eq("id", spare)
      .select("id");
    expect(data).toHaveLength(1);
  });

  it("the audit log never holds an owner's name or contact details", async () => {
    const { data } = await person(X, "owner")
      .client.from("audit_log")
      .select("action, changes")
      .eq("record_id", ownerX);
    expect(data?.map((row) => row.action)).toContain("owner.created");
    const text = JSON.stringify(data);
    expect(text).not.toContain("Taylor");
    expect(text).not.toContain("taylor@example.com");
    expect(text).not.toContain("07700");
  });
});

describe("owners: links between homes and owners", () => {
  it("staff cannot link or unlink directly", async () => {
    const { client, userId } = person(X, "staff");
    const linked = await client
      .from("property_owner_links")
      .insert({
        organisation_id: X.orgId,
        property_id: homeX,
        owner_id: ownerX,
        created_by: userId,
      })
      .select("id");
    expect(linked.error).not.toBeNull();

    const removed = await client
      .from("property_owner_links")
      .delete()
      .eq("owner_id", ownerX)
      .select("id");
    expect(removed.data ?? []).toEqual([]);
  });

  it("a home can never be linked to another organisation's owner", async () => {
    const { client, userId } = person(X, "manager");
    // X's home with Y's owner, claimed as X's link.
    const crossOwner = await client
      .from("property_owner_links")
      .insert({
        organisation_id: X.orgId,
        property_id: homeX,
        owner_id: ownerY,
        created_by: userId,
      })
      .select("id");
    expect(crossOwner.error).not.toBeNull();

    // Y's home with X's owner, claimed as Y's link.
    const crossHome = await client
      .from("property_owner_links")
      .insert({
        organisation_id: Y.orgId,
        property_id: homeY,
        owner_id: ownerX,
        created_by: userId,
      })
      .select("id");
    expect(crossHome.error).not.toBeNull();

    await expect(
      owners.linkOwner(person(X, "manager").ctx, homeX, ownerY),
    ).rejects.toThrow();
    await expect(
      owners.linkOwner(person(Y, "owner").ctx, homeY, ownerX),
    ).rejects.toThrow();
  });

  it("a manager unlinks with Undo, and linking twice says so", async () => {
    const { ctx } = person(X, "manager");
    await expect(owners.linkOwner(ctx, homeX, ownerX)).rejects.toThrow(
      "This owner is already linked to this home.",
    );
    expect((await owners.unlinkOwner(ctx, homeX, ownerX)).name).toBe(
      OWNER_NAME,
    );
    expect((await owners.getOwner(ctx, ownerX))?.homes).toEqual([]);
    expect((await owners.linkOwner(ctx, homeX, ownerX)).name).toBe(OWNER_NAME);
    expect(
      (await owners.getOwner(ctx, ownerX))?.homes.map((home) => home.id),
    ).toEqual([homeX]);
  });

  it("an archived owner cannot be linked until they are brought back", async () => {
    const { ctx } = person(X, "manager");
    const spare = (await owners.createOwner(ctx, ownerValues(`Kept ${runId}`)))
      .id;
    await owners.setOwnerArchived(ctx, spare, true);
    await expect(owners.linkOwner(ctx, homeX, spare)).rejects.toThrow(
      "This owner is archived.",
    );
    const options = await owners.listOwnerOptions(ctx);
    expect(options.map((option) => option.id)).not.toContain(spare);

    await owners.setOwnerArchived(ctx, spare, false);
    await owners.linkOwner(ctx, homeX, spare);
    const { owners: listed } = await owners.listOwners(ctx, {
      page: 1,
      archived: false,
    });
    expect(listed.find((owner) => owner.id === spare)?.homeCount).toBe(1);
  });
});
