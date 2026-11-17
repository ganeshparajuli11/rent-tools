import { Badge } from "@/components/ui/badge";
import { RENT_STATUS_LABELS, type RentStatus } from "@/lib/rent";
import { cn } from "@/lib/utils";

const VARIANTS = {
  late: "destructive",
  due: "outline",
  part_paid: "secondary",
  paid: "default",
} as const satisfies Record<RentStatus, string>;

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
    <Badge
      variant={VARIANTS[status]}
      className={cn("h-7 px-3 text-sm font-semibold", className)}
    >
      {RENT_STATUS_LABELS[status]}
    </Badge>
  );
}
