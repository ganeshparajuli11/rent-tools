import { cn } from "@/lib/utils";

/**
 * The top of a list or simple page (docs/DESIGN_SYSTEM.md §3): the title,
 * an optional count and one line about the page, with the main action on
 * the right.
 */
export function PageHeader({
  title,
  count,
  countLabel,
  description,
  actions,
  className,
}: {
  title: string;
  /** Shown beside the title, e.g. the number of homes. */
  count?: number;
  /** Read out with the count, e.g. "homes". */
  countLabel?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[28px] leading-tight font-semibold tracking-[-0.035em] break-words lg:text-4xl">
          {title}{" "}
          {count !== undefined ? (
            <span className="text-xl font-medium tracking-normal text-muted-foreground tabular-nums">
              {count}
              {countLabel ? (
                <span className="sr-only"> {countLabel}</span>
              ) : null}
            </span>
          ) : null}
        </h1>
        {description ? (
          <div className="text-base text-ink-2">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
