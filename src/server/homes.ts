import "server-only";

import { todayInLondon } from "@/lib/dates";
import {
  DEFAULT_HOMES_SORT,
  type HomeSortKey,
  type HomesSort,
} from "@/lib/homes-sort";
import type { LetType, UpdateHomeValues } from "@/lib/validation/homes";
import { PHOTO_BUCKET } from "@/lib/validation/photos";
import { type CreateHomeValues } from "@/lib/validation/homes";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  requireRole,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * Homes (database: properties) and rooms.
 *
 * Every function takes the signed-in user's own Supabase client, so RLS
 * applies. Writes also filter by the organisation looked up on the server,
 * so a request for another organisation's row simply finds nothing.
 * Nothing is ever hard-deleted by users: homes and rooms are archived.
 */

export const HOMES_PAGE_SIZE = 20;

export type HomeListItem = {
  id: string;
  name: string;
  /** Full address on one line, for cards. */
  address: string;
  /** Address without the postcode, for the table's own postcode column. */
  street: string;
  postcode: string;
  roomCount: number;
  letType: LetType;
  archived: boolean;
  /** Short-lived signed link to the home's first photo, or null. */
  coverUrl: string | null;
};

export type HomeOwner = {
  id: string;
  name: string;
  phone: string | null;
  rentPence: number;
  dueDay: number;
};

/** The current tenant of a room or of a whole home, as shown on the home page. */
export type TenantSummary = {
  id: string;
  name: string;
  rentPence: number;
  dueDay: number;
};

export type PastTenant = {
  id: string;
  name: string;
  /** The room they lived in, or null for a whole-home let. */
  roomName: string | null;
  endDate: string;
};

/** How many past tenants the home page lists (newest first). */
export const PAST_TENANTS_SHOWN = 20;

export type HomeDetail = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  letType: LetType;
  archived: boolean;
  /** Each room with its current tenant, or null when the room is empty. */
  rooms: { id: string; name: string; tenant: TenantSummary | null }[];
  archivedRooms: { id: string; name: string }[];
  /** The current tenant when the home is let as a whole (no room). */
  wholeHomeTenant: TenantSummary | null;
  pastTenants: PastTenant[];
  pastTenantCount: number;
  owner: HomeOwner | null;
};

function toLetType(value: string | null): LetType {
  return value === "by_room" ? "by_room" : "whole_home";
}

export function formatAddress(parts: {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
}) {
  return [parts.address_line1, parts.address_line2, parts.city, parts.postcode]
    .filter(Boolean)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Database column behind each sortable heading. Fixed list, never user text. */
const SORT_COLUMNS = {
  name: "name",
  address: "address_line1",
  postcode: "postcode",
} as const satisfies Record<HomeSortKey, string>;

export async function listHomes(
  ctx: Ctx,
  {
    page,
    includeArchived,
    sort = DEFAULT_HOMES_SORT,
  }: { page: number; includeArchived: boolean; sort?: HomesSort },
) {
  const organisationId = await getOrganisationId(ctx);
  const from = (page - 1) * HOMES_PAGE_SIZE;

  // One query: homes plus their rooms (ids only) to count active rooms.
  let query = ctx.supabase
    .from("properties")
    .select(
      "id, name, address_line1, address_line2, city, postcode, property_type, archived_at, rooms(id, archived_at), property_photos(storage_path, created_at)",
      { count: "exact" },
    )
    .eq("organisation_id", organisationId)
    // Only the first photo of each home, for the cover picture.
    .order("created_at", {
      referencedTable: "property_photos",
      ascending: true,
    })
    .limit(1, { referencedTable: "property_photos" });

  if (!includeArchived) query = query.is("archived_at", null);

  // Current homes first, then the chosen column. Name and id break ties so
  // the order is stable from one page to the next.
  const { data, count, error } = await query
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order(SORT_COLUMNS[sort.key], { ascending: sort.direction === "asc" })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + HOMES_PAGE_SIZE - 1);

  if (error) throw error;

  // Sign every cover photo in one call. A failure only hides the pictures.
  const coverPaths = (data ?? []).flatMap((row) =>
    row.property_photos[0] ? [row.property_photos[0].storage_path] : [],
  );
  const coverUrls = new Map<string, string>();
  if (coverPaths.length) {
    const { data: signed, error: signError } = await ctx.supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(coverPaths, 60 * 60);
    if (signError) {
      console.error("[homes] cover signing failed", { name: signError.name });
    }
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) coverUrls.set(item.path, item.signedUrl);
    }
  }

  const homes: HomeListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: formatAddress(row),
    street: formatAddress({ ...row, postcode: null }),
    postcode: row.postcode ?? "",
    roomCount: row.rooms.filter((room) => room.archived_at === null).length,
    letType: toLetType(row.property_type),
    archived: row.archived_at !== null,
    coverUrl: row.property_photos[0]
      ? (coverUrls.get(row.property_photos[0].storage_path) ?? null)
      : null,
  }));

  const total = count ?? homes.length;
  return {
    homes,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / HOMES_PAGE_SIZE)),
  };
}

export async function getHome(
  ctx: Ctx,
  id: string,
): Promise<HomeDetail | null> {
  const organisationId = await getOrganisationId(ctx);

  const { data, error } = await ctx.supabase
    .from("properties")
    .select(
      "id, name, address_line1, address_line2, city, postcode, property_type, archived_at, rooms(id, name, archived_at, created_at), owner_leases(id, owner_name, owner_phone, rent_pence, due_day, start_date, end_date, created_at), tenancies(id, room_id, tenant_name, rent_pence, due_day, end_date)",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Tenants came back in the same query, so there is no query per room.
  const summary = (t: (typeof data.tenancies)[number]): TenantSummary => ({
    id: t.id,
    name: t.tenant_name,
    rentPence: t.rent_pence,
    dueDay: t.due_day,
  });
  const currentTenants = data.tenancies.filter((t) => t.end_date === null);
  const wholeHomeTenant = currentTenants.find((t) => t.room_id === null);
  const roomNames = new Map(data.rooms.map((room) => [room.id, room.name]));
  const past = data.tenancies
    .flatMap((t) =>
      t.end_date === null
        ? []
        : [
            {
              id: t.id,
              name: t.tenant_name,
              roomName: t.room_id ? (roomNames.get(t.room_id) ?? null) : null,
              endDate: t.end_date,
            },
          ],
    )
    .sort(
      (a, b) =>
        b.endDate.localeCompare(a.endDate) || a.name.localeCompare(b.name),
    );

  const rooms = [...data.rooms].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.name.localeCompare(b.name),
  );

  // The current owner lease: not ended, newest first.
  const lease = [...data.owner_leases]
    .filter((l) => l.end_date === null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return {
    id: data.id,
    name: data.name,
    addressLine1: data.address_line1 ?? "",
    addressLine2: data.address_line2,
    city: data.city,
    postcode: data.postcode ?? "",
    letType: toLetType(data.property_type),
    archived: data.archived_at !== null,
    rooms: rooms
      .filter((r) => r.archived_at === null)
      .map((r) => {
        const tenant = currentTenants.find((t) => t.room_id === r.id);
        return {
          id: r.id,
          name: r.name,
          tenant: tenant ? summary(tenant) : null,
        };
      }),
    archivedRooms: rooms
      .filter((r) => r.archived_at !== null)
      .map((r) => ({ id: r.id, name: r.name })),
    wholeHomeTenant: wholeHomeTenant ? summary(wholeHomeTenant) : null,
    pastTenants: past.slice(0, PAST_TENANTS_SHOWN),
    pastTenantCount: past.length,
    owner: lease
      ? {
          id: lease.id,
          name: lease.owner_name,
          phone: lease.owner_phone,
          rentPence: lease.rent_pence,
          dueDay: lease.due_day,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * How many current tenants (no end date) a home has: in one room, in the
 * home let as a whole (`roomId: null`), or anywhere in it (`roomId` left out).
 */
async function countCurrentTenants(
  ctx: Ctx,
  organisationId: string,
  where: { propertyId: string; roomId?: string | null },
): Promise<number> {
  let query = ctx.supabase
    .from("tenancies")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("property_id", where.propertyId)
    .is("end_date", null);
  if (where.roomId === null) query = query.is("room_id", null);
  else if (where.roomId) query = query.eq("room_id", where.roomId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

const WHOLE_HOME_HAS_TENANT =
  "This home has a tenant for the whole home. Mark them as moved out before you add rooms.";

function roomRows(
  organisationId: string,
  propertyId: string,
  from: number,
  count: number,
) {
  return Array.from({ length: count }, (_, i) => ({
    organisation_id: organisationId,
    property_id: propertyId,
    name: `Room ${from + i}`,
  }));
}

export async function createHome(ctx: Ctx, values: CreateHomeValues) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: home, error } = await ctx.supabase
    .from("properties")
    .insert({
      organisation_id: organisationId,
      name: values.name,
      address_line1: values.addressLine1,
      address_line2: values.addressLine2,
      city: values.city,
      postcode: values.postcode,
      property_type: values.letType,
    })
    .select("id")
    .single();
  if (error) throw error;

  try {
    if (values.letType === "by_room" && values.roomCount) {
      const { error: roomsError } = await ctx.supabase
        .from("rooms")
        .insert(roomRows(organisationId, home.id, 1, values.roomCount));
      if (roomsError) throw roomsError;
    }

    if (values.owner) {
      const { error: leaseError } = await ctx.supabase
        .from("owner_leases")
        .insert({
          organisation_id: organisationId,
          property_id: home.id,
          owner_name: values.owner.name,
          owner_phone: values.owner.phone,
          rent_pence: values.owner.rentPence,
          due_day: values.owner.dueDay,
          start_date: todayInLondon(),
        });
      if (leaseError) throw leaseError;
    }
  } catch (stepError) {
    // Don't leave a half-made home behind. Owners can remove it (rooms and
    // leases cascade); if that is not allowed, archive it instead.
    const { data: removed } = await ctx.supabase
      .from("properties")
      .delete()
      .eq("id", home.id)
      .select("id");
    if (!removed?.length) {
      await ctx.supabase
        .from("properties")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", home.id);
    }
    throw stepError;
  }

  await writeAudit(ctx, {
    organisationId,
    action: "home.created",
    table: "properties",
    recordId: home.id,
    changes: { after: values },
  });

  return { id: home.id };
}

export async function updateHome(
  ctx: Ctx,
  id: string,
  values: UpdateHomeValues,
) {
  const { organisationId } = await requireRole(ctx, "manager");
  const before = await getHome(ctx, id);
  if (!before) throw new UserFacingError(NOT_FOUND);

  // Rules for changing how the home is let.
  let roomsToCreate = 0;
  if (values.letType === "by_room" && before.rooms.length === 0) {
    if (!values.roomCount) {
      throw new UserFacingError("Enter how many rooms this home has.");
    }
    roomsToCreate = values.roomCount;
    if (before.wholeHomeTenant) {
      throw new UserFacingError(WHOLE_HOME_HAS_TENANT);
    }
  }
  if (values.letType === "whole_home" && before.rooms.length > 0) {
    throw new UserFacingError(
      "This home still has rooms. Archive the rooms on the home page first, then change it to a whole home.",
    );
  }

  const { data: updated, error } = await ctx.supabase
    .from("properties")
    .update({
      name: values.name,
      address_line1: values.addressLine1,
      address_line2: values.addressLine2,
      city: values.city,
      postcode: values.postcode,
      property_type: values.letType,
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select("id");
  if (error) throw error;
  if (!updated.length) throw new UserFacingError(NOT_FOUND);

  if (roomsToCreate > 0) {
    const total = before.rooms.length + before.archivedRooms.length;
    const { error: roomsError } = await ctx.supabase
      .from("rooms")
      .insert(roomRows(organisationId, id, total + 1, roomsToCreate));
    if (roomsError) throw roomsError;
  }

  // Owner lease: update, add, or end it (never delete it).
  if (values.owner && before.owner) {
    const { error: leaseError } = await ctx.supabase
      .from("owner_leases")
      .update({
        owner_name: values.owner.name,
        owner_phone: values.owner.phone,
        rent_pence: values.owner.rentPence,
        due_day: values.owner.dueDay,
      })
      .eq("id", before.owner.id)
      .eq("organisation_id", organisationId);
    if (leaseError) throw leaseError;
  } else if (values.owner) {
    const { error: leaseError } = await ctx.supabase
      .from("owner_leases")
      .insert({
        organisation_id: organisationId,
        property_id: id,
        owner_name: values.owner.name,
        owner_phone: values.owner.phone,
        rent_pence: values.owner.rentPence,
        due_day: values.owner.dueDay,
        start_date: todayInLondon(),
      });
    if (leaseError) throw leaseError;
  } else if (before.owner) {
    const { error: leaseError } = await ctx.supabase
      .from("owner_leases")
      .update({ end_date: todayInLondon() })
      .eq("id", before.owner.id)
      .eq("organisation_id", organisationId);
    if (leaseError) throw leaseError;
  }

  await writeAudit(ctx, {
    organisationId,
    action: "home.updated",
    table: "properties",
    recordId: id,
    // Tenant names are left out: the audit log holds no tenant personal data.
    changes: {
      before: {
        name: before.name,
        addressLine1: before.addressLine1,
        addressLine2: before.addressLine2,
        city: before.city,
        postcode: before.postcode,
        letType: before.letType,
        roomCount: before.rooms.length,
        owner: before.owner,
      },
      after: values,
    },
  });
}

export async function setHomeArchived(ctx: Ctx, id: string, archived: boolean) {
  const { organisationId } = await requireRole(ctx, "manager");

  // A home with tenants living in it stays on the list.
  if (
    archived &&
    (await countCurrentTenants(ctx, organisationId, { propertyId: id })) > 0
  ) {
    throw new UserFacingError(
      "This home still has a tenant. Mark each tenant as moved out before you archive it.",
    );
  }

  let query = ctx.supabase
    .from("properties")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("organisation_id", organisationId);
  query = archived
    ? query.is("archived_at", null)
    : query.not("archived_at", "is", null);

  const { data, error } = await query.select("id, name");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: archived ? "home.archived" : "home.restored",
    table: "properties",
    recordId: id,
  });
  return { name: data[0]!.name };
}

export async function addRoom(ctx: Ctx, propertyId: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: home, error } = await ctx.supabase
    .from("properties")
    .select("id, property_type, rooms(id)")
    .eq("id", propertyId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!home) throw new UserFacingError(NOT_FOUND);

  // A home is let as a whole or by the room, not both at once.
  if (
    (await countCurrentTenants(ctx, organisationId, {
      propertyId,
      roomId: null,
    })) > 0
  ) {
    throw new UserFacingError(WHOLE_HOME_HAS_TENANT);
  }

  const name = `Room ${home.rooms.length + 1}`;
  const { data: room, error: insertError } = await ctx.supabase
    .from("rooms")
    .insert({ organisation_id: organisationId, property_id: propertyId, name })
    .select("id, name")
    .single();
  if (insertError) throw insertError;

  // A home with rooms is let by the room.
  if (home.property_type !== "by_room") {
    await ctx.supabase
      .from("properties")
      .update({ property_type: "by_room" })
      .eq("id", propertyId)
      .eq("organisation_id", organisationId);
  }

  await writeAudit(ctx, {
    organisationId,
    action: "room.created",
    table: "rooms",
    recordId: room.id,
    changes: { after: { name, propertyId } },
  });
  return room;
}

export async function renameRoom(ctx: Ctx, roomId: string, name: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: before } = await ctx.supabase
    .from("rooms")
    .select("name")
    .eq("id", roomId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (!before) throw new UserFacingError(NOT_FOUND);

  const { data, error } = await ctx.supabase
    .from("rooms")
    .update({ name })
    .eq("id", roomId)
    .eq("organisation_id", organisationId)
    .select("id, property_id");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "room.renamed",
    table: "rooms",
    recordId: roomId,
    changes: { before: { name: before.name }, after: { name } },
  });
  return { propertyId: data[0]!.property_id };
}

export async function setRoomArchived(
  ctx: Ctx,
  roomId: string,
  archived: boolean,
) {
  const { organisationId } = await requireRole(ctx, "manager");

  if (archived) {
    // A room with a tenant living in it cannot be archived.
    const { count, error: tenantError } = await ctx.supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("room_id", roomId)
      .is("end_date", null);
    if (tenantError) throw tenantError;
    if ((count ?? 0) > 0) {
      throw new UserFacingError(
        "This room has a tenant. Mark them as moved out before you archive it.",
      );
    }
  }

  let query = ctx.supabase
    .from("rooms")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", roomId)
    .eq("organisation_id", organisationId);
  query = archived
    ? query.is("archived_at", null)
    : query.not("archived_at", "is", null);

  const { data, error } = await query.select("id, name, property_id");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: archived ? "room.archived" : "room.restored",
    table: "rooms",
    recordId: roomId,
  });
  return { name: data[0]!.name, propertyId: data[0]!.property_id };
}
