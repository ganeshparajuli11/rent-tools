import { StatusPill, type StatusTone } from "@/components/app/status-pill";
import { RENT_STATUS_LABELS, type RentStatus } from "@/lib/rent";

/** The fixed colour for each rent status (docs/DESIGN_SYSTEM.md §4). */
export const RENT_STATUS_TONES = {
  late: "bad",
  due: "warn",
  part_paid: "info",
  paid: "good",
} as const satisfies Record<RentStatus, StatusTone>;

/**
 * The status of a month's rent, always as a word (never colour alone):
 * "Late", "Due", "Part paid" or "Paid".
 */
export function RentStatusBadge({
  status,
  className,
}: {
  status: RentStatus;
  className?: string;
}) {
  return (
    <StatusPill tone={RENT_STATUS_TONES[status]} className={className}>
      {RENT_STATUS_LABELS[status]}
    </StatusPill>
  );
}
