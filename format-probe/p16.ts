/* eslint-disable */
// @ts-nocheck
// Temporary: finds which part Prettier 3.10 formats differently.
/** Whether to send an organisation its email today, and if not, why not. */
export function digestDecision({
  enabled,
  alreadySentToday,
  overdueCount,
  recipientCount,
}: {
  enabled: boolean;
  alreadySentToday: boolean;
  overdueCount: number;
  recipientCount: number;
}): DigestDecision {
  if (!enabled) return "turned-off";
  if (alreadySentToday) return "already-sent";
  if (overdueCount === 0) return "nothing-late";
  if (recipientCount === 0) return "no-recipients";
  return "send";
}
