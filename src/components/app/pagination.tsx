import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-border bg-surface px-4 text-[15px] font-medium text-ink hover:bg-subtle";

/**
 * Previous and next links under a list. Pages are links (`?page=2`), so the
 * server loads one page at a time. Shows nothing when there is one page.
 */
export function Pagination({
  page,
  pageCount,
  previousHref,
  nextHref,
  className,
}: {
  page: number;
  pageCount: number;
  previousHref: string;
  nextHref: string;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pages"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      {page > 1 ? (
        <Link href={previousHref} className={linkClass}>
          <ChevronLeftIcon aria-hidden="true" className="size-4.5" />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={nextHref} className={linkClass}>
          Next
          <ChevronRightIcon aria-hidden="true" className="size-4.5" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
