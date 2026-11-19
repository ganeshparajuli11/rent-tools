"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { removeTenantDetailsSchema } from "@/lib/validation/data-rights";
import { idSchema } from "@/lib/validation/homes";
import { tenantPlaceSchema, tenantSchema } from "@/lib/validation/tenants";
import { invalidInput, runAction } from "@/server/run-action";
import * as tenants from "@/server/tenants";

/**
 * Server actions for tenants. Each one:
 *  1. validates input with the shared Zod schema,
 *  2. goes through runAction (src/server/run-action.ts), which checks the
 *     session, applies the rate limiter and runs the data function with the
 *     user's own client (RLS applies). The data function derives the
 *     organisation on the server and writes audit_log.
 */

const TENANT_NOT_FOUND = "We could not find that tenant.";

function refresh(homeId: string, tenantId?: string) {
  revalidatePath("/homes");
  revalidatePath(`/homes/${homeId}`);
  if (tenantId) revalidatePath(`/tenants/${tenantId}`);
  // Tenants change what the rent page and the dashboard show.
  revalidatePath("/rent");
  revalidatePath("/dashboard");
}

export async function createTenantAction(
  place: unknown,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const where = tenantPlaceSchema.safeParse(place);
  if (!where.success) {
    return { ok: false, error: "We could not find that home or room." };
  }
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("tenants", "createTenant", (ctx) =>
    tenants.createTenant(ctx, where.data, parsed.data),
  );
  if (result.ok) refresh(where.data.homeId, result.data.id);
  return result;
}

export async function updateTenantAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const tenantId = idSchema.safeParse(id);
  if (!tenantId.success) return { ok: false, error: TENANT_NOT_FOUND };
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await runAction("tenants", "updateTenant", (ctx) =>
    tenants.updateTenant(ctx, tenantId.data, parsed.data),
  );
  if (!result.ok) return result;
  refresh(result.data.homeId, tenantId.data);
  return { ok: true, data: undefined };
}

export async function moveTenantOutAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  const tenantId = idSchema.safeParse(id);
  if (!tenantId.success) return { ok: false, error: TENANT_NOT_FOUND };

  const result = await runAction("tenants", "moveTenantOut", (ctx) =>
    tenants.moveTenantOut(ctx, tenantId.data),
  );
  if (!result.ok) return result;
  refresh(result.data.homeId, tenantId.data);
  return { ok: true, data: { name: result.data.name } };
}

export async function undoMoveTenantOutAction(
  id: unknown,
): Promise<ActionResult<{ name: string }>> {
  const tenantId = idSchema.safeParse(id);
  if (!tenantId.success) return { ok: false, error: TENANT_NOT_FOUND };

  const result = await runAction("tenants", "undoMoveTenantOut", (ctx) =>
    tenants.undoMoveTenantOut(ctx, tenantId.data),
  );
  if (!result.ok) return result;
  refresh(result.data.homeId, tenantId.data);
  return { ok: true, data: { name: result.data.name } };
}

/**
 * Removes a past tenant's personal details for good (owners only). There is
 * no Undo, so the browser must send `confirm: true`.
 */
export async function removeTenantDetailsAction(
  input: unknown,
): Promise<ActionResult<{ alreadyRemoved: boolean }>> {
  const parsed = removeTenantDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? TENANT_NOT_FOUND,
    };
  }

  const result = await runAction("tenants", "removeTenantDetails", (ctx) =>
    tenants.removeTenantDetails(ctx, parsed.data.tenantId),
  );
  if (!result.ok) return result;
  refresh(result.data.homeId, parsed.data.tenantId);
  return { ok: true, data: { alreadyRemoved: result.data.alreadyRemoved } };
}
