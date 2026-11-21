import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  /** What happened, in plain words. Never personal contact details. */
  text: React.ReactNode;
  /** When, e.g. "2 days ago" or "Mon 16 Nov". */
  when: string;
  /** For the <time> element, e.g. "2026-11-16". */
  dateTime?: string;
};

/**
 * What happened and when, newest first: a dot and a line for each event
 * (docs/DESIGN_SYSTEM.md §4). Used for Recent activity and History tabs.
 */
export function ActivityTimeline({
  items,
  emptyText = "Nothing has happened yet.",
  className,
}: {
  items: ActivityItem[];
  emptyText?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="text-base text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="flex flex-none flex-col items-center"
          >
            <span className="mt-1.5 size-2.5 rounded-full bg-ink" />
            {index < items.length - 1 ? (
              <span className="min-h-7 w-px flex-1 bg-border" />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pb-4.5">
            <span className="text-sm break-words text-ink">{item.text}</span>
            <time
              dateTime={item.dateTime}
              className="text-xs text-muted-foreground"
            >
              {item.when}
            </time>
          </span>
        </li>
      ))}
    </ol>
  );
}
