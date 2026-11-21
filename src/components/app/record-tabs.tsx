import Link from "next/link";

import { cn } from "@/lib/utils";

export type RecordTab = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

/**
 * The tabs on a record page (Overview, Photos, History…). Each tab is a
 * link (`?tab=photos`), so the server only loads what the open tab needs,
 * the browser's Back button works, and a tab can be shared as a link.
 */
export function RecordTabs({
  label,
  tabs,
  className,
}: {
  /** Names the tabs for screen readers, e.g. "Sections of this home". */
  label: string;
  tabs: RecordTab[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0", className)}
    >
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-[15px]",
                tab.active
                  ? "border-ink font-semibold text-ink"
                  : "border-transparent font-medium text-muted-foreground hover:text-ink",
              )}
            >
              {tab.label}{" "}
              {tab.count !== undefined ? (
                <span className="rounded-full bg-subtle px-2 text-xs font-medium text-muted-foreground tabular-nums">
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
