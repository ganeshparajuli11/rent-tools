import { cn } from "@/lib/utils";

export const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-bad-soft text-bad" },
  high: { label: "High", className: "bg-orange-soft text-orange" },
  normal: { label: "Normal", className: "bg-subtle text-ink-2" },
  low: { label: "Low", className: "border border-border text-ink-2" },
};

/** A repair's priority: Urgent (red), High (orange), Normal, Low. */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const { label, className: toneClass } = PRIORITY[priority];
  return (
    <span
      className={cn(
        "inline-flex w-16 flex-none items-center justify-center rounded-lg py-1 text-xs font-semibold",
        toneClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
