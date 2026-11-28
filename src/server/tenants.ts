import "server-only";

import { laterDate, todayInLondon } from "@/lib/dates";
import {
  hasRemovedDetails,
  REMOVED_TENANT_NAME,
} from "@/lib/validation/data-rights";
import type { TenantPlace, TenantValues } from "@/lib/validation/tenants";

import {
  type Ctx,
  getOrganisationId,
  NOT_FOUND,
  requireRole,
  UserFacingError,
  writeAudit,
} from "./context";
import { ensureRentCharges, type TenancyForCharges } from "./rent-charges";

/**
 * Tenants (database: tenancies).
 *
 * A tenant is "current" while end_date is empty. A room, or a home let as a
 * whole, has at most one current tenant. This is checked here and, once the
 * migration in docs/PENDING_MIGRATIONS.md is applied, by the database too.
 *
 * Every function takes the signed-in user's own Supabase client, so RLS
 * applies, and writes also filter by the organisation looked up on the
 * server. Nothing is deleted: "moved out" sets end_date and can be undone.
 *
 * Rent changes only ever change `tenancies.rent_pence`. Charges for months
 * already created (`rent_charges`) keep the amount they were made with, so a
 * change affects future months only.
 *
 * Adding a tenant makes their rent charges from the month they moved in to
 * this month. The daily cron job makes each new month's charge after that,
 * and fills in anything that was missed.
 *
 * The audit log records what changed but not names, phone numbers or email
 * addresses, so a tenant's personal data lives in one place only.
 */

const ROOM_TAKEN = "This room already has a tenant.";
const HOME_TAKEN = "This home already has a tenant.";
const UNIQUE_VIOLATION = "23505";

export type TenantDetail = {
  id: string;
  organisationId: string;
  name: string;
  phone: string | null;
  email: string | null;
  rentPence: number;
  dueDay: number;
  depositPence: number;
  startDate: string;
  /** Set when the tenant has moved out. */
  endDate: string | null;
  home: { id: string; name: string };
  room: { id: string; name: string } | null;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Makes this tenant's rent charges up to this month (existing ones are left
 * alone). If it fails, the tenant is still saved: the problem is logged and
 * the daily cron job fills in the missing months.
 */
async function makeRentCharges(ctx: Ctx, tenancy: TenancyForCharges) {
  try {
    await ensureRentCharges(ctx.supabase, [tenancy], todayInLondon());
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[tenants] making rent charges failed", { code });
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getTenant(
  ctx: Ctx,
  id: string,
): Promise<TenantDetail | null> {
  const organisationId = await getOrganisationId(ctx);

  // One query: the tenancy with its home and (if any) room.
  const { data, error } = await ctx.supabase
    .from("tenancies")
    .select(
      "id, tenant_name, tenant_phone, tenant_email, rent_pence, due_day, deposit_pence, start_date, end_date, properties(id, name), rooms(id, name)",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.properties) return null;

  return {
    id: data.id,
    organisationId,
    name: data.tenant_name,
    phone: data.tenant_phone,
    email: data.tenant_email,
    rentPence: data.rent_pence,
    dueDay: data.due_day,
    depositPence: data.deposit_pence,
    startDate: data.start_date,
    endDate: data.end_date,
    home: { id: data.properties.id, name: data.properties.name },
    room: data.rooms ? { id: data.rooms.id, name: data.rooms.name } : null,
  };
}

/** True when the room (or the whole home, for roomId null) has a current tenant. */
async function placeIsTaken(
  ctx: Ctx,
  organisationId: string,
  place: { homeId: string; roomId: string | null },
  exceptTenancyId?: string,
): Promise<boolean> {
  let query = ctx.supabase
    .from("tenancies")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("property_id", place.homeId)
    .is("end_date", null);
  query = place.roomId
    ? query.eq("room_id", place.roomId)
    : query.is("room_id", null);
  if (exceptTenancyId) query = query.neq("id", exceptTenancyId);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data.length > 0;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createTenant(
  ctx: Ctx,
  place: TenantPlace,
  values: TenantValues,
) {
  const { organisationId } = await requireRole(ctx, "manager");

  // One query: the home, its rooms and its current tenants.
  const { data: home, error } = await ctx.supabase
    .from("properties")
    .select(
      "id, archived_at, rooms(id, archived_at), tenancies(id, room_id, end_date)",
    )
    .eq("id", place.homeId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error) throw error;
  if (!home) throw new UserFacingError(NOT_FOUND);
  if (home.archived_at !== null) {
    throw new UserFacingError(
      "This home is archived. Bring it back before you add a tenant.",
    );
  }

  const activeRooms = home.rooms.filter((room) => room.archived_at === null);
  const current = home.tenancies.filter((t) => t.end_date === null);

  if (place.roomId) {
    if (!activeRooms.some((room) => room.id === place.roomId)) {
      throw new UserFacingError(NOT_FOUND);
    }
    if (current.some((t) => t.room_id === place.roomId)) {
      throw new UserFacingError(ROOM_TAKEN);
    }
    if (current.some((t) => t.room_id === null)) {
      throw new UserFacingError(HOME_TAKEN);
    }
  } else {
    if (activeRooms.length > 0) {
      throw new UserFacingError(
        "This home is let by the room. Choose a room for this tenant.",
      );
    }
    if (current.length > 0) throw new UserFacingError(HOME_TAKEN);
  }

  const { data: tenancy, error: insertError } = await ctx.supabase
    .from("tenancies")
    .insert({
      organisation_id: organisationId,
      property_id: place.homeId,
      room_id: place.roomId,
      tenant_name: values.name,
      tenant_phone: values.phone,
      tenant_email: values.email,
      rent_pence: values.rentPence,
      due_day: values.dueDay,
      deposit_pence: values.depositPence,
      start_date: values.startDate,
    })
    .select("id")
    .single();
  if (insertError) {
    // Two people adding a tenant to the same place at the same moment.
    if (isUniqueViolation(insertError)) {
      throw new UserFacingError(place.roomId ? ROOM_TAKEN : HOME_TAKEN);
    }
    throw insertError;
  }

  // Rent from the month they moved in to this month.
  await makeRentCharges(ctx, {
    id: tenancy.id,
    organisation_id: organisationId,
    rent_pence: values.rentPence,
    due_day: values.dueDay,
    start_date: values.startDate,
    end_date: null,
  });

  await writeAudit(ctx, {
    organisationId,
    action: "tenant.created",
    table: "tenancies",
    recordId: tenancy.id,
    changes: {
      after: {
        propertyId: place.homeId,
        roomId: place.roomId,
        rentPence: values.rentPence,
        dueDay: values.dueDay,
        depositPence: values.depositPence,
        startDate: values.startDate,
      },
    },
  });

  return { id: tenancy.id };
}

export async function updateTenant(ctx: Ctx, id: string, values: TenantValues) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: before, error: readError } = await ctx.supabase
    .from("tenancies")
    .select(
      "property_id, tenant_name, tenant_phone, tenant_email, rent_pence, due_day, deposit_pence, start_date, end_date",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new UserFacingError(NOT_FOUND);

  if (before.end_date !== null && values.startDate > before.end_date) {
    throw new UserFacingError(
      "The move-in date must be before the day they moved out.",
    );
  }

  // Only tenancies changes. Existing rent_charges rows keep their amounts,
  // so a new rent applies to future months only.
  const { data: updated, error } = await ctx.supabase
    .from("tenancies")
    .update({
      tenant_name: values.name,
      tenant_phone: values.phone,
      tenant_email: values.email,
      rent_pence: values.rentPence,
      due_day: values.dueDay,
      deposit_pence: values.depositPence,
      start_date: values.startDate,
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select("id");
  if (error) throw error;
  if (!updated.length) throw new UserFacingError(NOT_FOUND);

  // An earlier move-in date can mean earlier months now need a charge.
  await makeRentCharges(ctx, {
    id,
    organisation_id: organisationId,
    rent_pence: values.rentPence,
    due_day: values.dueDay,
    start_date: values.startDate,
    end_date: before.end_date,
  });

  const contactChanged = [
    before.tenant_name !== values.name ? "name" : null,
    before.tenant_phone !== values.phone ? "phone" : null,
    before.tenant_email !== values.email ? "email" : null,
  ].filter((field): field is string => field !== null);

  await writeAudit(ctx, {
    organisationId,
    action: "tenant.updated",
    table: "tenancies",
    recordId: id,
    changes: {
      before: {
        rentPence: before.rent_pence,
        dueDay: before.due_day,
        depositPence: before.deposit_pence,
        startDate: before.start_date,
      },
      after: {
        rentPence: values.rentPence,
        dueDay: values.dueDay,
        depositPence: values.depositPence,
        startDate: values.startDate,
      },
      contactChanged,
    },
  });

  return { homeId: before.property_id };
}

/** "Tenant moved out": sets end_date, which frees the room. */
export async function moveTenantOut(ctx: Ctx, id: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: before, error: readError } = await ctx.supabase
    .from("tenancies")
    .select("tenant_name, property_id, start_date, end_date")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new UserFacingError(NOT_FOUND);
  if (before.end_date !== null) {
    throw new UserFacingError("This tenant has already moved out.");
  }

  // Today in London. A tenant who was due to move in later ends on their
  // start date, because a tenancy cannot end before it starts.
  const endDate = laterDate(todayInLondon(), before.start_date);

  const { data, error } = await ctx.supabase
    .from("tenancies")
    .update({ end_date: endDate })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .is("end_date", null)
    .select("id");
  if (error) throw error;
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  await writeAudit(ctx, {
    organisationId,
    action: "tenant.moved_out",
    table: "tenancies",
    recordId: id,
    changes: { after: { endDate } },
  });

  return { name: before.tenant_name, homeId: before.property_id };
}

/** Undo for "Tenant moved out": clears end_date if the place is still free. */
export async function undoMoveTenantOut(ctx: Ctx, id: string) {
  const { organisationId } = await requireRole(ctx, "manager");

  const { data: before, error: readError } = await ctx.supabase
    .from("tenancies")
    .select(
      "tenant_name, property_id, room_id, rent_pence, due_day, start_date, end_date",
    )
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new UserFacingError(NOT_FOUND);
  if (before.end_date === null) {
    // Already current: nothing to undo.
    return { name: before.tenant_name, homeId: before.property_id };
  }
  if (before.tenant_name === REMOVED_TENANT_NAME) {
    throw new UserFacingError(
      "Their details have been removed, so they cannot move back in. Add them as a new tenant instead.",
    );
  }

  const taken = await placeIsTaken(
    ctx,
    organisationId,
    { homeId: before.property_id, roomId: before.room_id },
    id,
  );
  if (taken) {
    throw new UserFacingError(
      before.room_id
        ? "Someone else has moved into this room since. Mark them as moved out first."
        : "Someone else has moved into this home since. Mark them as moved out first.",
    );
  }

  const { data, error } = await ctx.supabase
    .from("tenancies")
    .update({ end_date: null })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .not("end_date", "is", null)
    .select("id");
  if (error) {
    if (isUniqueViolation(error)) {
      throw new UserFacingError(before.room_id ? ROOM_TAKEN : HOME_TAKEN);
    }
    throw error;
  }
  if (!data.length) throw new UserFacingError(NOT_FOUND);

  // They are a tenant again, so months since they "moved out" need a charge.
  await makeRentCharges(ctx, {
    id,
    organisation_id: organisationId,
    rent_pence: before.rent_pence,
    due_day: before.due_day,
    start_date: before.start_date,
    end_date: null,
  });

  await writeAudit(ctx, {
    organisationId,
    action: "tenant.move_out_undone",
    table: "tenancies",
    recordId: id,
    changes: { before: { endDate: before.end_date } },
  });

  return { name: before.tenant_name, homeId: before.property_id };
}

// ---------------------------------------------------------------------------
// Data rights: removing a past tenant's personal details
// ---------------------------------------------------------------------------

/**
 * Removes a past tenant's personal details: their name (replaced by
 * REMOVED_TENANT_NAME), phone number, email address, and any notes on
 * their payments. Rent charges and payment amounts are kept, because the
 * landlord needs them for their accounts; without a name they no longer
 * say who the person was.
 *
 * Only owners can do this, and only for a tenant who has moved out. It
 * cannot be undone, which is why the browser must confirm it first (see
 * removeTenantDetailsSchema). The audit log never held these details (see
 * the top of this file), so there is nothing to remove there.
 */
export async function removeTenantDetails(
  ctx: Ctx,
  id: string,
): Promise<{ homeId: string; alreadyRemoved: boolean }> {
  const { organisationId } = await requireRole(ctx, "owner");

  const { data: before, error: readError } = await ctx.supabase
    .from("tenancies")
    .select("property_id, tenant_name, tenant_phone, tenant_email, end_date")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (readError) throw readError;
  if (!before) throw new UserFacingError(NOT_FOUND);
  if (before.end_date === null) {
    throw new UserFacingError(
      "You can only remove the details of a tenant who has moved out. Mark them as moved out first.",
    );
  }

  // Payment notes first: if this fails, nothing has been changed yet.
  const { data: charges, error: chargesError } = await ctx.supabase
    .from("rent_charges")
    .select("id")
    .eq("tenancy_id", id)
    .eq("organisation_id", organisationId);
  if (chargesError) throw chargesError;

  let paymentNotesCleared = 0;
  const chargeIds = charges.map((charge) => charge.id);
  // In batches, so a tenant of many years never makes an over-long request.
  for (let i = 0; i < chargeIds.length; i += 200) {
    const { data: cleared, error: notesError } = await ctx.supabase
      .from("payments")
      .update({ note: null })
      .eq("organisation_id", organisationId)
      .in("rent_charge_id", chargeIds.slice(i, i + 200))
      .not("note", "is", null)
      .select("id");
    if (notesError) throw notesError;
    paymentNotesCleared += cleared.length;
  }

  const alreadyRemoved =
    paymentNotesCleared === 0 &&
    hasRemovedDetails({
      name: before.tenant_name,
      phone: before.tenant_phone,
      email: before.tenant_email,
    });
  if (alreadyRemoved) {
    return { homeId: before.property_id, alreadyRemoved: true };
  }

  const { data: updated, error } = await ctx.supabase
    .from("tenancies")
    .update({
      tenant_name: REMOVED_TENANT_NAME,
      tenant_phone: null,
      tenant_email: null,
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .not("end_date", "is", null)
    .select("id");
  if (error) throw error;
  if (!updated.length) throw new UserFacingError(NOT_FOUND);

  // Which kinds of detail were removed, never the details themselves.
  await writeAudit(ctx, {
    organisationId,
    action: "tenant.personal_details_removed",
    table: "tenancies",
    recordId: id,
    changes: {
      removed: {
        name: before.tenant_name !== REMOVED_TENANT_NAME,
        phone: before.tenant_phone !== null,
        email: before.tenant_email !== null,
        paymentNotes: paymentNotesCleared,
      },
    },
  });

  return { homeId: before.property_id, alreadyRemoved: false };
}
