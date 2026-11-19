import { describe, expect, it } from "vitest";

import {
  exportKindSchema,
  hasRemovedDetails,
  REMOVED_TENANT_NAME,
  removeTenantDetailsSchema,
} from "./data-rights";

const TENANT_ID = "6f1c1a52-5d0a-4a43-9a8e-3f0c2f6b1e4d";

describe("exportKindSchema", () => {
  it.each(["homes", "tenants", "payments"])("accepts %s", (kind) => {
    expect(exportKindSchema.parse(kind)).toBe(kind);
  });

  it("refuses anything else", () => {
    for (const kind of ["", "audit_log", "HOMES", "homes ", null, 1]) {
      expect(exportKindSchema.safeParse(kind).success).toBe(false);
    }
  });
});

describe("removeTenantDetailsSchema", () => {
  it("accepts a tenant id with confirm: true", () => {
    expect(
      removeTenantDetailsSchema.parse({ tenantId: TENANT_ID, confirm: true }),
    ).toEqual({ tenantId: TENANT_ID, confirm: true });
  });

  it("refuses without a real confirm: true", () => {
    for (const confirm of [false, "true", 1, undefined, null]) {
      expect(
        removeTenantDetailsSchema.safeParse({ tenantId: TENANT_ID, confirm })
          .success,
      ).toBe(false);
    }
  });

  it("refuses an id that is not a uuid", () => {
    expect(
      removeTenantDetailsSchema.safeParse({ tenantId: "1", confirm: true })
        .success,
    ).toBe(false);
  });

  it("drops anything else sent with it, such as an organisation id", () => {
    expect(
      removeTenantDetailsSchema.parse({
        tenantId: TENANT_ID,
        confirm: true,
        organisationId: "someone-else",
      }),
    ).toEqual({ tenantId: TENANT_ID, confirm: true });
  });
});

describe("hasRemovedDetails", () => {
  it("is true only for the removed name with no phone or email", () => {
    expect(
      hasRemovedDetails({
        name: REMOVED_TENANT_NAME,
        phone: null,
        email: null,
      }),
    ).toBe(true);
    expect(
      hasRemovedDetails({ name: "Ann Lee", phone: null, email: null }),
    ).toBe(false);
    expect(
      hasRemovedDetails({
        name: REMOVED_TENANT_NAME,
        phone: "07700 900123",
        email: null,
      }),
    ).toBe(false);
  });
});
