import { cn } from "@/lib/utils";

/** A row of stat cards. Holds the <dl> that each card's label belongs to. */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))]",
        className,
      )}
    >
      {children}
    </dl>
  );
}

const TONES = {
  default: "",
  good: "text-good",
  bad: "text-bad",
} as const;

/**
 * One figure (docs/DESIGN_SYSTEM.md §4): a label, a big number, an
 * optional "of £5,075" after it, a caption, and room for a progress bar.
 * Use inside <StatGrid>.
 */
export function StatCard({
  label,
  value,
  suffix,
  note,
  tone = "default",
  children,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  tone?: keyof typeof TONES;
  /** Extra content under the figure, e.g. <ProgressBar>. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-3xl font-semibold tracking-[-0.03em] tabular-nums",
          TONES[tone],
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </dd>
      {children ? <dd>{children}</dd> : null}
      {note ? (
        <dd className="text-[13px] text-muted-foreground">{note}</dd>
      ) : null}
    </div>
  );
}

/**
 * A thin black bar showing a share, e.g. rent received. The words are in
 * `label` for screen readers; the card shows the figure as text too.
 */
export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="img"
      aria-label={label}
      className="h-2 overflow-hidden rounded-full bg-subtle"
    >
      <div
        className="h-full rounded-full bg-ink"
        style={{ width: `${Math.round(share * 100)}%` }}
      />
    </div>
  );
}
