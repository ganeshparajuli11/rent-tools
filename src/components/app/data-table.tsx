import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A table in a white card (docs/DESIGN_SYSTEM.md §4): sticky header, row
 * hover, 14px text, and its own sideways scroll on narrow screens so the
 * page itself never scrolls sideways. Use plain <thead>/<tbody>/<tr>
 * inside, with <DataTableHead> and <DataTableCell>.
 */
export function DataTable({
  caption,
  children,
  className,
  minWidth = "40rem",
}: {
  /** Read out by screen readers; not shown. */
  caption: string;
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[20px] border border-border bg-surface",
        className,
      )}
    >
      <table
        className="w-full border-collapse text-left text-sm [&_tbody_tr]:hover:bg-canvas [&_tbody_tr:last-child>*]:border-b-0"
        style={{ minWidth }}
      >
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/** A column heading (or, with scope="row", the first cell of a row). */
export function DataTableHead({
  children,
  scope = "col",
  align = "left",
  className,
  ariaSort,
  sortable = false,
}: {
  children?: React.ReactNode;
  scope?: "col" | "row";
  align?: "left" | "right";
  className?: string;
  ariaSort?: "ascending" | "descending" | "none";
  /** Holds a sorting link, which brings its own height. */
  sortable?: boolean;
}) {
  if (scope === "row") {
    return (
      <th
        scope="row"
        className={cn(
          "border-b border-divider px-4 py-3 align-middle font-semibold text-ink",
          align === "right" && "text-right",
          className,
        )}
      >
        {children}
      </th>
    );
  }
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface px-4 font-medium whitespace-nowrap text-muted-foreground",
        sortable ? "py-1" : "py-2.5",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DataTableCell({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-divider px-4 py-3 align-middle text-ink-2",
        align === "right" && "text-right tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

const SORT_WORDS = {
  ascending: "sorted A to Z",
  descending: "sorted Z to A",
  none: "not sorted",
} as const;

/**
 * A column heading that sorts the list. It is a plain link, so it works
 * with Tab and Enter and without JavaScript; the server does the sorting.
 */
export function SortableHead({
  label,
  href,
  state,
  className,
}: {
  label: string;
  /** Where choosing the heading goes (the list sorted by this column). */
  href: string;
  state: "ascending" | "descending" | "none";
  className?: string;
}) {
  const Icon =
    state === "ascending"
      ? ArrowUpIcon
      : state === "descending"
        ? ArrowDownIcon
        : ArrowUpDownIcon;
  return (
    <DataTableHead ariaSort={state} sortable className={className}>
      <Link
        href={href}
        className={cn(
          "-mx-2 inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-2 hover:bg-subtle hover:text-ink",
          state !== "none" && "text-ink",
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn("size-3.5", state === "none" && "opacity-60")}
        />
        <span className="sr-only">({SORT_WORDS[state]}, choose to change)</span>
      </Link>
    </DataTableHead>
  );
}
