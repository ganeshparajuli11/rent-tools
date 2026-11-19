import { z } from "zod";

/**
 * Shared schemas for data rights: the CSV downloads and removing a past
 * tenant's personal details.
 */

export const EXPORT_KINDS = ["homes", "tenants", "payments"] as const;

export type ExportKind = (typeof EXPORT_KINDS)[number];

/** `?data=homes` on /api/export. Anything else is refused. */
export const exportKindSchema = z.enum(EXPORT_KINDS, {
  error: "Choose homes, tenants or payments",
});

/**
 * Removing a tenant's details cannot be undone, so the browser must send
 * an explicit `confirm: true` along with the tenant's id.
 */
export const removeTenantDetailsSchema = z.object({
  tenantId: z.uuid({ error: "We could not find that tenant." }),
  confirm: z.literal(true, {
    error: "Please confirm that you want to remove their details.",
  }),
});

export type RemoveTenantDetails = z.output<typeof removeTenantDetailsSchema>;

/** What a tenant is called once their personal details are removed. */
export const REMOVED_TENANT_NAME = "Former tenant (details removed)";

/** True when this tenant's personal details have been removed. */
export function hasRemovedDetails(tenant: {
  name: string;
  phone: string | null;
  email: string | null;
}): boolean {
  return (
    tenant.name === REMOVED_TENANT_NAME &&
    tenant.phone === null &&
    tenant.email === null
  );
}
