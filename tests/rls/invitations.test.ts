/**
 * Members and invitations (roadmap B4, PRODUCT_SPEC.md §5), in two
 * organisations and every role. Runs against the Supabase project in
 * .env.local (use your DEV project, never production).
 *
 *   pnpm test:rls
 *
 * Organisation X has one person in every role; organisation Y has an
 * owner. Two more people have no organisation: the one invited, and
 * someone else. The service role key is used ONLY to create the throwaway
 * users, add X's extra members and clean up. Every check runs through
 * each person's own session, so row-level security and the database
 * functions decide, and through the server data functions, so requireRole
 * is checked too. No invitation email is sent: invitations are added
 * through the person's own client, the way inviteMember does it.
 */
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashInvitationToken, newInvitationToken } from "@/lib/invitations";
import { roleTooLowMessage, type Role } from "@/lib/roles";
import type { Database } from "@/lib/supabase/database.types";
import type { Ctx } from "@/server/context";
import * as invitations from "@/server/invitations";
import * as members from "@/server/members";

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

type User = {
  label: string;
  email: string;
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

async function signedInUser(label: string): Promise<User> {
  const email = `rls-invite-${runId}-${label}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
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
  return {
    label,
    email,
    userId,
    client,
    ctx: { supabase: client as unknown as Ctx["supabase"], userId },
  };
}

async function setUp(owner: User, name: string): Promise<string> {
  const orgId = must(
    await owner.client.rpc("create_organisation", {
      org_name: `Invite test ${runId} ${name}`,
      org_account_type: "property_manager",
      org_contact_email: `contact-${name}@example.com`,
      creator_full_name: `Tester ${name} Owner`,
    }),
    `set up ${name}`,
  );
  createdOrgIds.push(orgId);
  return orgId;
}

let X: string;
let Y: string;
const inX: Record<Role, User> = {} as Record<Role, User>;
let ownerY: User;
let invitee: User;
let stranger: User;
const membershipIdOf: Record<string, string> = {};

/** An invitation added through `by`'s own client (RLS applies). */
async function invite(
  by: User,
  org: string,
  email: string,
  role: string,
): Promise<{ id: string; token: string; error: unknown }> {
  const token = newInvitationToken();
  const { data, error } = await by.client
    .from("invitations")
    .insert({
      organisation_id: org,
      email,
      role,
      token_hash: await hashInvitationToken(token),
    })
    .select("id")
    .single();
  return { id: data?.id ?? "", token, error };
}

beforeAll(async () => {
  inX.owner = await signedInUser("x-owner");
  X = await setUp(inX.owner, "x");
  for (const role of ["admin", "manager", "staff"] as const) {
    inX[role] = await signedInUser(`x-${role}`);
    must(
      await admin
        .from("memberships")
        .insert({ user_id: inX[role].userId, organisation_id: X, role })
        .select("id")
        .single(),
      `add x ${role}`,
    );
  }
  ownerY = await signedInUser("y-owner");
  Y = await setUp(ownerY, "y");
  invitee = await signedInUser("invitee");
  stranger = await signedInUser("stranger");

  const { data } = await admin
    .from("memberships")
    .select("id, user_id")
    .eq("organisation_id", X);
  for (const row of data ?? []) membershipIdOf[row.user_id] = row.id;
});

afterAll(async () => {
  // Deleting an organisation cascades to its memberships and invitations.
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

describe("invitations: who can invite and see them", () => {
  it("managers, staff and other organisations cannot invite into X", async () => {
    for (const by of [inX.manager, inX.staff, ownerY]) {
      const { error } = await invite(
        by,
        X,
        `nope-${runId}@example.com`,
        "staff",
      );
      expect(error, by.label).not.toBeNull();
    }
    // The server says so plainly too, before any email could be sent.
    await expect(
      members.inviteMember(inX.staff.ctx, {
        email: `nope-${runId}@example.com`,
        role: "staff",
      }),
    ).rejects.toThrow(roleTooLowMessage("admin"));
  });

  it("nobody can invite an owner, or set the expiry or who invited", async () => {
    expect(
      (await invite(inX.owner, X, `o-${runId}@example.com`, "owner")).error,
    ).not.toBeNull();
    const token = newInvitationToken();
    const sneaky = await inX.owner.client
      .from("invitations")
      .insert({
        organisation_id: X,
        email: `o-${runId}@example.com`,
        role: "staff",
        token_hash: await hashInvitationToken(token),
        expires_at: "2099-01-01T00:00:00Z",
        invited_by: inX.staff.userId,
      })
      .select("id");
    expect(sneaky.error).not.toBeNull();
  });

  it("owners and admins see X's invitations; nobody else does", async () => {
    const made = await invite(inX.admin, X, invitee.email, "manager");
    expect(made.error).toBeNull();

    for (const role of ["owner", "admin"] as const) {
      const list = await members.listOpenInvitations(inX[role].ctx);
      expect(
        list.map((i) => i.id),
        role,
      ).toContain(made.id);
    }
    for (const who of [inX.manager, inX.staff, ownerY, invitee, stranger]) {
      const { data } = await who.client.from("invitations").select("id");
      expect(data ?? [], who.label).toEqual([]);
    }
    // The token's hash is never readable, even by an owner.
    const hash = await inX.owner.client
      .from("invitations")
      .select("token_hash");
    expect(hash.error).not.toBeNull();

    // Y's owner invites into Y; X's owner never sees it.
    const inY = await invite(ownerY, Y, `y-${runId}@example.com`, "staff");
    expect(inY.error).toBeNull();
    const xList = await members.listOpenInvitations(inX.owner.ctx);
    expect(xList.map((i) => i.id)).not.toContain(inY.id);
    await expect(
      members.cancelInvitation(inX.owner.ctx, inY.id),
    ).rejects.toThrow();

    // Cancel it again so the next tests start clean.
    await members.cancelInvitation(inX.owner.ctx, made.id);
  });
});

describe("invitations: accepting", () => {
  it("only the invited email can see and accept it, once", async () => {
    const made = await invite(inX.owner, X, invitee.email, "manager");
    expect(made.error).toBeNull();

    // The invited person sees it; nobody else does.
    const mine = await invitations.getMyInvitations(invitee.ctx);
    expect(mine.map((i) => i.id)).toEqual([made.id]);
    expect(mine[0]?.role).toBe("manager");
    expect(await invitations.getMyInvitations(stranger.ctx)).toEqual([]);
    expect(
      await invitations.getInvitationForToken(stranger.ctx, made.token),
    ).toEqual({ state: "not_for_you" });

    // Someone else holding the link still cannot use it.
    await expect(
      invitations.acceptInvitation(stranger.ctx, made.id, null),
    ).rejects.toThrow(invitations.INVITATION_UNUSABLE);

    const joined = await invitations.acceptInvitation(
      invitee.ctx,
      made.id,
      "Taylor Example",
    );
    expect(joined.organisationId).toBe(X);
    const { data: membership } = await invitee.client
      .from("memberships")
      .select("id, role, status")
      .eq("organisation_id", X)
      .single();
    expect(membership).toMatchObject({ role: "manager", status: "active" });
    membershipIdOf[invitee.userId] = membership!.id;

    // Used: a second try fails and the link says so.
    await expect(
      invitations.acceptInvitation(invitee.ctx, made.id, null),
    ).rejects.toThrow(invitations.INVITATION_UNUSABLE);
    expect(
      await invitations.getInvitationForToken(invitee.ctx, made.token),
    ).toEqual({ state: "accepted" });

    // The audit row names nobody.
    const { data: audit } = await inX.owner.client
      .from("audit_log")
      .select("changes")
      .eq("action", "membership.joined");
    expect(JSON.stringify(audit)).not.toContain("@");
    expect(JSON.stringify(audit)).not.toContain("Taylor");
  });

  it("a cancelled invitation cannot be used, and Undo brings it back", async () => {
    const made = await invite(inX.admin, X, stranger.email, "staff");
    expect(made.error).toBeNull();
    await members.cancelInvitation(inX.admin.ctx, made.id);
    expect(
      await invitations.getInvitationForToken(stranger.ctx, made.token),
    ).toEqual({ state: "cancelled" });
    await expect(
      invitations.acceptInvitation(stranger.ctx, made.id, null),
    ).rejects.toThrow(invitations.INVITATION_UNUSABLE);

    await members.restoreInvitation(inX.admin.ctx, made.id);
    expect(
      (await invitations.getMyInvitations(stranger.ctx)).map((i) => i.id),
    ).toEqual([made.id]);
    await members.cancelInvitation(inX.admin.ctx, made.id);
  });

  it("nobody can insert a membership directly any more", async () => {
    for (const who of [inX.owner, inX.admin, stranger]) {
      const { error } = await who.client.from("memberships").insert({
        user_id: stranger.userId,
        organisation_id: X,
        role: "staff",
      });
      expect(error, who.label).not.toBeNull();
    }
  });
});

describe("members: roles and removal", () => {
  it("managers can list members; staff cannot", async () => {
    const list = await members.listMembers(inX.manager.ctx, { page: 1 });
    expect(list.members.map((m) => m.userId)).toEqual(
      expect.arrayContaining([inX.owner.userId, invitee.userId]),
    );
    await expect(
      members.listMembers(inX.staff.ctx, { page: 1 }),
    ).rejects.toThrow(roleTooLowMessage("manager"));
  });

  it("only owners and admins change roles, never their own or an owner's", async () => {
    const target = membershipIdOf[invitee.userId]!;
    for (const who of [inX.manager, inX.staff, ownerY]) {
      await expect(
        members.changeMemberRole(who.ctx, target, "staff"),
        who.label,
      ).rejects.toThrow();
    }
    await expect(
      members.changeMemberRole(
        inX.admin.ctx,
        membershipIdOf[inX.owner.userId]!,
        "staff",
      ),
    ).rejects.toThrow("The owner can only change by transferring ownership.");
    await expect(
      members.changeMemberRole(
        inX.admin.ctx,
        membershipIdOf[inX.admin.userId]!,
        "staff",
      ),
    ).rejects.toThrow("You cannot change your own role or remove yourself.");

    const changed = await members.changeMemberRole(
      inX.admin.ctx,
      target,
      "staff",
    );
    expect(changed).toMatchObject({ role: "staff", previousRole: "manager" });
    // Undo.
    await members.changeMemberRole(inX.admin.ctx, target, "manager");
  });

  it("removing someone ends their access; a new invitation brings them back", async () => {
    const target = membershipIdOf[invitee.userId]!;
    await expect(members.removeMember(inX.manager.ctx, target)).rejects.toThrow(
      roleTooLowMessage("admin"),
    );
    await members.removeMember(inX.admin.ctx, target);
    const { data } = await invitee.client.from("organisations").select("id");
    expect(data).toEqual([]);

    const again = await invite(inX.owner, X, invitee.email, "staff");
    await invitations.acceptInvitation(invitee.ctx, again.id, null);
    const { data: back } = await invitee.client
      .from("memberships")
      .select("role, status")
      .eq("organisation_id", X)
      .single();
    expect(back).toEqual({ role: "staff", status: "active" });
  });
});

describe("ownership transfer", () => {
  it("only the owner, with the organisation's name, to an active member", async () => {
    const toAdmin = membershipIdOf[inX.admin.userId]!;
    await expect(
      members.transferOwnership(
        inX.admin.ctx,
        toAdmin,
        `Invite test ${runId} x`,
      ),
    ).rejects.toThrow(roleTooLowMessage("owner"));
    await expect(
      members.transferOwnership(ownerY.ctx, toAdmin, `Invite test ${runId} x`),
    ).rejects.toThrow();
    await expect(
      members.transferOwnership(inX.owner.ctx, toAdmin, "Wrong name"),
    ).rejects.toThrow("That is not the organisation's name");

    await members.transferOwnership(
      inX.owner.ctx,
      toAdmin,
      `  invite test ${runId} X `,
    );
    const { data } = await admin
      .from("memberships")
      .select("user_id, role")
      .eq("organisation_id", X)
      .in("user_id", [inX.owner.userId, inX.admin.userId]);
    const roles = Object.fromEntries(
      (data ?? []).map((row) => [row.user_id, row.role]),
    );
    expect(roles[inX.admin.userId]).toBe("owner");
    expect(roles[inX.owner.userId]).toBe("admin");

    // The old owner (now an admin) cannot change the new owner.
    await expect(
      members.changeMemberRole(inX.owner.ctx, toAdmin, "staff"),
    ).rejects.toThrow();
  });
});
