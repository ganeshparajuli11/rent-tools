import { describe, expect, it } from "vitest";

import { overdueEmailSettingSchema } from "./settings";

describe("overdueEmailSettingSchema", () => {
  it("accepts on and off", () => {
    expect(overdueEmailSettingSchema.parse({ enabled: true })).toEqual({
      enabled: true,
    });
    expect(overdueEmailSettingSchema.parse({ enabled: false })).toEqual({
      enabled: false,
    });
  });

  it("refuses anything that is not a real true or false", () => {
    for (const enabled of ["true", "on", 1, 0, null, undefined]) {
      expect(overdueEmailSettingSchema.safeParse({ enabled }).success).toBe(
        false,
      );
    }
    expect(overdueEmailSettingSchema.safeParse(null).success).toBe(false);
  });

  it("drops anything else sent with it, such as an organisation id", () => {
    expect(
      overdueEmailSettingSchema.parse({
        enabled: true,
        organisationId: "someone-else",
      }),
    ).toEqual({ enabled: true });
  });
});
