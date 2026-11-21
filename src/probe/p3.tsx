import { cn } from "@/lib/utils";

/**
 * The colours a status may use (docs/DESIGN_SYSTEM.md §1). Colour is never
 * the only signal: every pill also shows its word.
 */
export type StatusTone =
  | "good"
  | "bad"
  | "warn"
  | "info"
  | "orange"
  | "neutral"
  | "outline";

const TONE_CLASSES: Record<StatusTone, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  orange: "bg-orange-soft text-orange",
  neutral: "bg-subtle text-ink-2",
  outline: "border border-border bg-surface text-ink-2",
};

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
