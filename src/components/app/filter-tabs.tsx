import Link from "next/link";

import { cn } from "@/lib/utils";

export type FilterTab = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

/**
 * A segmented control for filtering a list, e.g. All / Late / Still due /
 * Paid (docs/DESIGN_SYSTEM.md §4). Each tab is a link, so filters live in
 * the address, work without JavaScript, and the server does the filtering.
 */
export function FilterTabs({
  label,
  tabs,
  className,
}: {
  /** Names the group for screen readers, e.g. "Filter homes". */
  label: string;
  tabs: FilterTab[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("max-w-full", className)}>
      <ul className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-subtle p-1">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-none">
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-[9px] px-3 text-sm whitespace-nowrap lg:min-h-9",
                tab.active
                  ? "bg-surface font-semibold text-ink shadow-sm"
                  : "font-medium text-ink-2 hover:text-ink",
              )}
            >
              {tab.label}{" "}
              {tab.count !== undefined ? (
                <span className="font-medium text-muted-foreground tabular-nums">
                  {tab.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
