import "server-only";

import { todayInLondon } from "@/lib/dates";
import {
  DEFAULT_HOMES_SORT,
  type HomeSortKey,
  type HomesSort,
} from "@/lib/homes-sort";
import type { LetType, UpdateHomeValues } from "@/lib/validation/homes";
import { type CreateHomeValues } from "@/lib/validation/homes";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
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
};

export type HomeOwner = {
  id: string;
  name: string;
  phone: string | null;
  rentPence: number;
  dueDay: number;
};

export type HomeDetail = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  letType: LetType;
  archived: boolean;
  rooms: { id: string; name: string }[];
  archivedRooms: { id: string; name: string }[];
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
      "id, name, address_line1, address_line2, city, postcode, property_type, archived_at, rooms(id, archived_at)",
      { count: "exact" },
    )
    .eq("organisation_id", organisationId);

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

  const homes: HomeListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: formatAddress(row),
    street: formatAddress({ ...row, postcode: null }),
    postcode: row.postcode ?? "",
    roomCount: row.rooms.filter((room) => room.archived_at === null).length,
    letType: toLetType(row.property_type),
    archived: row.archived_at !== null,
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
      "id, name, address_line1, address_line2, city, postcode, property_type, archived_at, rooms(id, name, archived_at, created_at), owner_leases(id, owner_name, owner_phone, rent_pence, due_day, start_date, end_date, created_at)",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

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
      .map((r) => ({ id: r.id, name: r.name })),
    archivedRooms: rooms
      .filter((r) => r.archived_at !== null)
      .map((r) => ({ id: r.id, name: r.name })),
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
  const organisationId = await getOrganisationId(ctx);

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
  const organisationId = await getOrganisationId(ctx);
  const before = await getHome(ctx, id);
  if (!before) throw new UserFacingError(NOT_FOUND);

  // Rules for changing how the home is let.
  let roomsToCreate = 0;
  if (values.letType === "by_room" && before.rooms.length === 0) {
    if (!values.roomCount) {
      throw new UserFacingError("Enter how many rooms this home has.");
    }
    roomsToCreate = values.roomCount;
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
    changes: { before, after: values },
  });
}

export async function setHomeArchived(ctx: Ctx, id: string, archived: boolean) {
  const organisationId = await getOrganisationId(ctx);

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
  const organisationId = await getOrganisationId(ctx);

  const { data: home, error } = await ctx.supabase
    .from("properties")
    .select("id, property_type, rooms(id)")
    .eq("id", propertyId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!home) throw new UserFacingError(NOT_FOUND);

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
  const organisationId = await getOrganisationId(ctx);

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
  const organisationId = await getOrganisationId(ctx);

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
