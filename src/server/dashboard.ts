import "server-only";

import { todayInLondon } from "@/lib/dates";
import {
  buildDashboard,
  type DashboardCharge,
  type DashboardHome,
  type DashboardSummary,
} from "@/lib/dashboard";
import { type AuditEntry, homeCards, type HomeCardData } from "@/lib/today";
import { PHOTO_BUCKET } from "@/lib/validation/photos";

import type { Ctx, Db } from "./context";
import { loadDashboardCharges } from "./rent";

/**
 * Data for the Today page. The number of queries never grows with the
 * number of homes:
 *  1. the user's organisation (and its name),
 *  2. every home with its rooms, owner leases and tenants,
 *  3. this month's rent charges plus every earlier one that is past its due
 *     date, each with its payments (read in pages only for long histories),
 *  4. the latest audit_log rows, for Recent activity,
 *  (2, 3 and 4 run at the same time), then
 *  5. the first photo of each home shown under "Your homes", signed in one
 *     Storage call.
 * The sums are done by the tested, pure `buildDashboard` and the helpers
 * in src/lib/today.ts.
 *
 * Everything is read with the signed-in user's own client, so RLS applies,
 * and filtered by the organisation looked up on the server.
 */

/** Homes shown as photo cards under "Your homes". */
export const TODAY_HOME_CARDS = 4;
/** Rows of Recent activity. */
const ACTIVITY_LIMIT = 6;
/** Audit rows read to find them (some actions are not shown). */
const ACTIVITY_READ = 20;

export type TodayHomeCard = HomeCardData & { photoUrl: string | null };

export type Dashboard = {
  organisationName: string;
  today: string;
  summary: DashboardSummary;
  homes: DashboardHome[];
  charges: DashboardCharge[];
  /** False until the payments.removed_at migration is applied (no Undo). */
  canRemovePayments: boolean;
  homeCards: TodayHomeCard[];
  /** Newest first, at most ACTIVITY_READ rows. */
  activity: AuditEntry[];
  activityLimit: number;
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

  const [homes, { charges, canRemovePayments }, activity] = await Promise.all([
    loadDashboardHomes(ctx.supabase, organisationId),
    loadDashboardCharges(ctx, organisationId, today),
    loadActivity(ctx.supabase, organisationId),
  ]);

  const cards = homeCards(homes, TODAY_HOME_CARDS);
  const photos = await loadCoverPhotos(
    ctx.supabase,
    organisationId,
    cards.map((card) => card.id),
  );

  return {
    organisationName: membership.organisations?.name ?? "Your organisation",
    today,
    summary: buildDashboard({ homes, charges, today }),
    homes,
    charges,
    canRemovePayments,
    homeCards: cards.map((card) => ({
      ...card,
      photoUrl: photos.get(card.id) ?? null,
    })),
    activity,
    activityLimit: ACTIVITY_LIMIT,
  };
}

/** The latest audit_log rows for the organisation, newest first. */
async function loadActivity(
  db: Db,
  organisationId: string,
): Promise<AuditEntry[]> {
  const { data, error } = await db
    .from("audit_log")
    .select("id, action, record_id, changes, created_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ACTIVITY_READ);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    action: row.action,
    recordId: row.record_id,
    changes: row.changes,
    createdAt: row.created_at,
  }));
}

/**
 * The first photo of each of these homes, as short-lived signed links, in
 * one query and one signing call. Photos are a nice extra: any failure
 * (including the photos migration not being applied yet) only hides them.
 */
async function loadCoverPhotos(
  db: Db,
  organisationId: string,
  homeIds: readonly string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (homeIds.length === 0) return urls;
  try {
    const { data, error } = await db
      .from("property_photos")
      .select("property_id, storage_path, created_at")
      .eq("organisation_id", organisationId)
      .in("property_id", [...homeIds])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(200);
    if (error) throw error;

    const firstPath = new Map<string, string>();
    for (const photo of data) {
      if (!firstPath.has(photo.property_id)) {
        firstPath.set(photo.property_id, photo.storage_path);
      }
    }
    if (firstPath.size === 0) return urls;

    const { data: signed, error: signError } = await db.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls([...firstPath.values()], 60 * 60);
    if (signError) throw signError;
    const byPath = new Map(
      (signed ?? []).flatMap((item) =>
        item.path && item.signedUrl
          ? [[item.path, item.signedUrl] as const]
          : [],
      ),
    );
    for (const [homeId, path] of firstPath) {
      const url = byPath.get(path);
      if (url) urls.set(homeId, url);
    }
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[today] cover photos failed", { code });
  }
  return urls;
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
      "id, name, archived_at, created_at, rooms(id, name, archived_at, created_at), owner_leases(rent_pence, start_date, end_date), tenancies(id, room_id, tenant_name, start_date, end_date)",
    )
    .eq("organisation_id", organisationId)
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;

  return data.map((home) => ({
    id: home.id,
    name: home.name,
    archived: home.archived_at !== null,
    createdOn: todayInLondon(new Date(home.created_at)),
    rooms: home.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      archived: room.archived_at !== null,
      createdOn: todayInLondon(new Date(room.created_at)),
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
