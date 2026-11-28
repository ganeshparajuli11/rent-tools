import "server-only";

import {
  monthlyRentToOwner,
  oneLineAddress,
  ownerDisplayName,
} from "@/lib/owners";
import type { OwnerType, OwnerValues } from "@/lib/validation/owners";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  requireRole,
  UserFacingError,
  writeAudit,
} from "./context";

/**
 * Owner records (database: property_owners) and the links between owners
 * and homes (property_owner_links), roadmap C1.
 *
 * Every function takes the signed-in user's own Supabase client, so RLS
 * applies. Writes also filter by the organisation looked up on the server
 * and check the role first. Owners are archived, never deleted. The audit
 * log records what happened and to which record, never names or contact
 * details.
 */

export const OWNERS_PAGE_SIZE = 20;

/** How many owners the "Link an owner" picker offers, at most. */
export const OWNER_OPTIONS_LIMIT = 200;

export type OwnerListItem = {
  id: string;
  name: string;
  ownerType: OwnerType;
  email: string | null;
  phone: string | null;
  homeCount: number;
  /** Rent the organisation pays them each month (current leases). */
  monthlyRentPence: number;
  archived: boolean;
};

export type OwnerHome = {
  linkId: string;
  id: string;
  name: string;
  address: string;
  archived: boolean;
};

export type OwnerLease = {
  id: string;
  homeId: string;
  homeName: string;
  rentPence: number;
  dueDay: number;
  startDate: string;
  endDate: string | null;
};

export type OwnerDetail = {
  id: string;
  name: string;
  ownerType: OwnerType;
  fullName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  address: string;
  notes: string | null;
  archived: boolean;
  homes: OwnerHome[];
  /** Rent paid to them: current leases first, then ended ones. */
  leases: OwnerLease[];
  monthlyRentPence: number;
};

export type OwnerOption = { id: string; name: string };

function toOwnerType(value: string): OwnerType {
  return value === "company" ? "company" : "individual";
}

function nameOf(row: {
  owner_type: string;
  full_name: string | null;
  company_name: string | null;
}) {
  return ownerDisplayName({
    ownerType: row.owner_type,
    fullName: row.full_name,
    companyName: row.company_name,
  });
}

function rowFrom(values: OwnerValues) {
  return {
    owner_type: values.ownerType,
    full_name: values.fullName,
    company_name: values.companyName,
    email: values.email,
    phone: values.phone,
    address_line1: values.addressLine1,
    address_line2: values.addressLine2,
    city: values.city,
    postcode: values.postcode,
    notes: values.notes,
  };
}

/** Which fields were filled in, without their values (for audit_log). */
function filledFields(values: OwnerValues): string[] {
  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key]) => key)
    .sort();
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listOwners(
  ctx: Ctx,
  { page, archived }: { page: number; archived: boolean },
) {
  const organisationId = await getOrganisationId(ctx);
  const from = (page - 1) * OWNERS_PAGE_SIZE;

  // One query: owners, their links (to count homes) and their leases (to
  // add up the rent paid to them).
  let query = ctx.supabase
    .from("property_owners")
    .select(
      "id, owner_type, full_name, company_name, email, phone, archived_at, property_owner_links(id), owner_leases(rent_pence, end_date)",
      { count: "exact" },
    )
    .eq("organisation_id", organisationId);
  query = archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const { data, count, error } = await query
    .order("display_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + OWNERS_PAGE_SIZE - 1);
  if (error) throw error;

  const owners: OwnerListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: nameOf(row),
    ownerType: toOwnerType(row.owner_type),
    email: row.email,
    phone: row.phone,
    homeCount: row.property_owner_links.length,
    monthlyRentPence: monthlyRentToOwner(row.owner_leases),
    archived: row.archived_at !== null,
  }));

  const total = count ?? owners.length;
  return {
    owners,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / OWNERS_PAGE_SIZE)),
  };
}

export async function getOwner(
  ctx: Ctx,
  id: string,
): Promise<OwnerDetail | null> {
  const organisationId = await getOrganisationId(ctx);

  const { data, error } = await ctx.supabase
    .from("property_owners")
    .select(
      "id, owner_type, full_name, company_name, email, phone, address_line1, address_line2, city, postcode, notes, archived_at, property_owner_links(id, created_at, properties(id, name, address_line1, city, postcode, archived_at)), owner_leases(id, property_id, rent_pence, due_day, start_date, end_date, properties(id, name))",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const homes: OwnerHome[] = data.property_owner_links
    .flatMap((link) =>
      link.properties
        ? [
            {
              linkId: link.id,
              id: link.properties.id,
              name: link.properties.name,
              address: oneLineAddress([
                link.properties.address_line1,
                link.properties.city,
                link.properties.postcode,
              ]),
              archived: link.properties.archived_at !== null,
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name),
    );

  const leases: OwnerLease[] = data.owner_leases
    .map((lease) => ({
      id: lease.id,
      homeId: lease.property_id,
      homeName: lease.properties?.name ?? "A home",
      rentPence: lease.rent_pence,
      dueDay: lease.due_day,
      startDate: lease.start_date,
      endDate: lease.end_date,
    }))
    .sort(
      (a, b) =>
        Number(a.endDate !== null) - Number(b.endDate !== null) ||
        b.startDate.localeCompare(a.startDate),
    );

  return {
    id: data.id,
    name: nameOf(data),
    ownerType: toOwnerType(data.owner_type),
    fullName: data.full_name,
    companyName: data.company_name,
    email: data.email,
    phone: data.phone,
    addressLine1: data.address_line1,
    addressLine2: data.address_line2,
    city: data.city,
    postcode: data.postcode,
    address: oneLineAddress([
      data.address_line1,
      data.address_line2,
      data.city,
      data.postcode,
    ]),
    notes: data.notes,
    archived: data.archived_at !== null,
    homes,
    leases,
    monthlyRentPence: monthlyRentToOwner(data.owner_leases),
  };
}

/** Current owners for the "Link an owner" picker, by name. */
export async function listOwnerOptions(ctx: Ctx): Promise<OwnerOption[]> {
  const organisationId = await getOrganisationId(ctx);
  const { data, error } = await ctx.supabase
    .from("property_owners")
    .select("id, owner_type, full_name, company_name")
    .eq("organisation_id", organisationId)
    .is("archived_at", null)
    .order("display_name", { ascending: true })
    .order("id", { ascending: true })
    .limit(OWNER_OPTIONS_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: nameOf(row) }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Adds an owner. With `homeId` (from "Add a new owner" on a home page),
 * the new owner is linked to that home too.
 */
export async function createOwner(
  ctx: Ctx,
  values: OwnerValues,
  homeId: string | null = null,
) {
  const { organisationId } = await requireRole(ctx, "manager");

  if (homeId) await requireCurrentHome(ctx, organisationId, homeId);

  const { data, error } = await ctx.supabase
    .from("property_owners")
    .insert({ organisation_id: organisationId, ...rowFrom(values) })
    .select("id")
    .single();
  if (error) throw error;

  await writeAudit(ctx, {
    organisationId,
    action: "owner.created",
    table: "property_owners",
    recordId: data.id,
    // Which fields were filled in, never what they say.
    changes: {
      after: { ownerType: values.ownerType, fields: filledFields(values) },
    },
  });

  if (homeId) {
    const linkId = await insertLink(ctx, organisationId, homeId, data.id);
    await writeAudit(ctx, {
      organisationId,
      action: "owner.linked",
      table: "property_owner_links",
      recordId: linkId,
      changes: { after: { homeId, ownerId: data.id } },
    });
  }

  return { id: data.id, homeId };
}

export async function updateOwner(ctx: Ctx, id: string, values: OwnerValues) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: before, error: readError } = await ctx.supabase
    .from("property_owners")
    .select(
      "owner_type, full_name, company_name, email, phone, address_line1, address_line2, city, postcode, notes",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new UserFacingError(NOT_FOUND);

  const after = rowFrom(values);
  const changed = (Object.keys(after) as (keyof typeof after)[])
    .filter((key) => (before[key] ?? null) !== (after[key] ?? null))
    .sort();

  const { data, error } = await ctx.supabase
    .from("property_owners")
    .update(after)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select("id");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "owner.updated",
    table: "property_owners",
    recordId: id,
    // Which fields changed (their keys only, never what they now say).
    changes: { changed },
  });
}

export async function setOwnerArchived(
  ctx: Ctx,
  id: string,
  archived: boolean,
) {
  const { organisationId } = await requireRole(ctx, "manager");

  let query = ctx.supabase
    .from("property_owners")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("organisation_id", organisationId);
  query = archived
    ? query.is("archived_at", null)
    : query.not("archived_at", "is", null);

  const { data, error } = await query.select(
    "id, owner_type, full_name, company_name",
  );
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: archived ? "owner.archived" : "owner.restored",
    table: "property_owners",
    recordId: id,
  });
  return { name: nameOf(data[0]!) };
}

/** Links an owner to a home. Both must be current and in the organisation. */
export async function linkOwner(ctx: Ctx, homeId: string, ownerId: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  await requireCurrentHome(ctx, organisationId, homeId);
  const { data: owner, error } = await ctx.supabase
    .from("property_owners")
    .select("id, owner_type, full_name, company_name, archived_at")
    .eq("id", ownerId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!owner) throw new UserFacingError(NOT_FOUND);
  if (owner.archived_at !== null) {
    throw new UserFacingError(
      "This owner is archived. Bring them back on their page first.",
    );
  }

  const linkId = await insertLink(ctx, organisationId, homeId, ownerId);
  await writeAudit(ctx, {
    organisationId,
    action: "owner.linked",
    table: "property_owner_links",
    recordId: linkId,
    changes: { after: { homeId, ownerId } },
  });
  return { name: nameOf(owner) };
}

/** Removes the link between an owner and a home. Undo links them again. */
export async function unlinkOwner(ctx: Ctx, homeId: string, ownerId: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data, error } = await ctx.supabase
    .from("property_owner_links")
    .delete()
    .eq("organisation_id", organisationId)
    .eq("property_id", homeId)
    .eq("owner_id", ownerId)
    .select("id, property_owners(owner_type, full_name, company_name)");
  if (error) throw error;
  const link = data[0];
  if (!link) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "owner.unlinked",
    table: "property_owner_links",
    recordId: link.id,
    changes: { before: { homeId, ownerId } },
  });
  return {
    name: link.property_owners ? nameOf(link.property_owners) : "The owner",
  };
}

// ---------------------------------------------------------------------------
// Helpers (not called by actions directly)
// ---------------------------------------------------------------------------

/** Throws a plain message unless the home is in the organisation and current. */
async function requireCurrentHome(
  ctx: Ctx,
  organisationId: string,
  homeId: string,
) {
  const { data, error } = await ctx.supabase
    .from("properties")
    .select("id, archived_at")
    .eq("id", homeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserFacingError(NOT_FOUND);
  if (data.archived_at !== null) {
    throw new UserFacingError(
      "This home is archived. Bring it back before you change its owners.",
    );
  }
}

/** Adds the link row. The caller writes the audit_log entry. */
async function insertLink(
  ctx: Ctx,
  organisationId: string,
  homeId: string,
  ownerId: string,
) {
  const { data, error } = await ctx.supabase
    .from("property_owner_links")
    .insert({
      organisation_id: organisationId,
      property_id: homeId,
      owner_id: ownerId,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) {
    // unique_violation: they are already linked.
    if (error.code === "23505") {
      throw new UserFacingError("This owner is already linked to this home.");
    }
    throw error;
  }
  return data.id;
}
