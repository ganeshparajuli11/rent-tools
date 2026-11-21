import { cn } from "@/lib/utils";

/**
 * The colours a status may use (docs/DESIGN_SYSTEM.md §1). Colour is never
 * the only signal: every pill also shows its word.
 */
const TONE_CLASSES = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  orange: "bg-orange-soft text-orange",
  neutral: "bg-subtle text-ink-2",
  outline: "border border-border bg-surface text-ink-2",
};

export type StatusTone = keyof typeof TONE_CLASSES;

/** A status word in a coloured pill: "Paid", "Late", "Fully let"… */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.75 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A small grey number, e.g. beside a heading or a filter tab. */
export function CountPill({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  /** Read out instead of the bare number, e.g. "12 homes". */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-subtle px-2 text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
    >
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

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
