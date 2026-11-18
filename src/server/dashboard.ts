import "server-only";

import { todayInLondon } from "@/lib/dates";
import {
  buildDashboard,
  type DashboardHome,
  type DashboardSummary,
} from "@/lib/dashboard";

import type { Ctx, Db } from "./context";
import { getDashboardCharges } from "./rent";

/**
 * Data for the dashboard, in three queries however many homes there are:
 *  1. the user's organisation (and its name),
 *  2. every home with its rooms, owner leases and tenants,
 *  3. this month's rent charges plus every earlier one that is past its due
 *     date, each with its payments (read in pages only for long histories).
 * The sums are done by the tested, pure `buildDashboard`.
 *
 * Everything is read with the signed-in user's own client, so RLS applies,
 * and filtered by the organisation looked up on the server.
 */

export type Dashboard = {
  organisationName: string;
  today: string;
  summary: DashboardSummary;
};

/** Null when the user has no organisation yet. */
export async function getDashboard(
  ctx: Ctx,
  today: string = todayInLondon(),
): Promise<Dashboard | null> {
  const { data: membership, error: membershipError } = await ctx.supabase
    .from("memberships")
    .select("organisation_id, organisations(name)")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;
  const organisationId = membership.organisation_id;

  const [homes, charges] = await Promise.all([
    loadDashboardHomes(ctx.supabase, organisationId),
    getDashboardCharges(ctx, organisationId, today),
  ]);

  return {
    organisationName: membership.organisations?.name ?? "Your organisation",
    today,
    summary: buildDashboard({ homes, charges, today }),
  };
}

/**
 * Every home in the organisation with its rooms, owner leases and tenants,
 * in one query. Takes a client so the daily email job can use it too.
 */
export async function loadDashboardHomes(
  db: Db,
  organisationId: string,
): Promise<DashboardHome[]> {
  const { data, error } = await db
    .from("properties")
    .select(
      "id, name, archived_at, rooms(id, name, archived_at), owner_leases(rent_pence, start_date, end_date), tenancies(id, room_id, tenant_name, start_date, end_date)",
    )
    .eq("organisation_id", organisationId)
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;

  return data.map((home) => ({
    id: home.id,
    name: home.name,
    archived: home.archived_at !== null,
    rooms: home.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      archived: room.archived_at !== null,
    })),
    ownerLeases: home.owner_leases.map((lease) => ({
      rentPence: lease.rent_pence,
      startDate: lease.start_date,
      endDate: lease.end_date,
    })),
    tenancies: home.tenancies.map((tenancy) => ({
      id: tenancy.id,
      roomId: tenancy.room_id,
      name: tenancy.tenant_name,
      startDate: tenancy.start_date,
      endDate: tenancy.end_date,
    })),
  }));
}
