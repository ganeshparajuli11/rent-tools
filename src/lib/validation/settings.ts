import { z } from "zod";

/**
 * Shared schema for the Settings page: the switch for the daily late rent
 * email. Only a real true or false is accepted (not "true", 1 or "on").
 */
export const overdueEmailSettingSchema = z.object({
  enabled: z.boolean({ error: "Choose on or off" }),
});

export type OverdueEmailSetting = z.output<typeof overdueEmailSettingSchema>;
