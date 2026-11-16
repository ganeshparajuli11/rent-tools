import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ariaSortFor,
  homesListHref,
  type HomeSortKey,
  type HomesSort,
  nextHomesSort,
} from "@/lib/homes-sort";
import type { HomeListItem } from "@/server/homes";

import { roomsLabel } from "./home-card";

const SORT_WORDS = {
  ascending: "sorted A to Z",
  descending: "sorted Z to A",
  none: "not sorted",
} as const;

/**
 * A column heading that sorts the list. It is a plain link, so it works with
 * the Tab and Enter keys and without JavaScript. The server does the sorting.
 */
function SortHeading({
  label,
  column,
  sort,
  archived,
  className,
}: {
  label: string;
  column: HomeSortKey;
  sort: HomesSort;
  archived: boolean;
  className?: string;
}) {
  const state = ariaSortFor(sort, column);
  const Icon =
    state === "ascending"
      ? ArrowUpIcon
      : state === "descending"
        ? ArrowDownIcon
        : ArrowUpDownIcon;
  return (
    <TableHead scope="col" aria-sort={state} className={className}>
      <Link
        // Sorting again starts from the first page.
        href={homesListHref({ archived, sort: nextHomesSort(sort, column) })}
        className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-base font-semibold hover:bg-muted"
      >
        {label}
        <Icon
          aria-hidden="true"
          className={
            state === "none" ? "size-4 text-muted-foreground" : "size-4"
          }
        />
        <span className="sr-only">({SORT_WORDS[state]}, choose to change)</span>
      </Link>
    </TableHead>
  );
}

/** Homes as a table, shown on wide screens. Phones and tablets get cards. */
export function HomesTable({
  homes,
  sort,
  archived,
}: {
  homes: HomeListItem[];
  sort: HomesSort;
  archived: boolean;
}) {
  return (
    <div className="rounded-xl border">
      <Table className="text-base">
        <caption className="sr-only">
          Your homes. Choose a column heading to sort the list.
        </caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHeading
              label="Home"
              column="name"
              sort={sort}
              archived={archived}
              className="h-14 px-4"
            />
            <SortHeading
              label="Address"
              column="address"
              sort={sort}
              archived={archived}
              className="h-14 px-4"
            />
            <SortHeading
              label="Postcode"
              column="postcode"
              sort={sort}
              archived={archived}
              className="h-14 px-4"
            />
            <TableHead
              scope="col"
              className="h-14 px-4 text-base font-semibold"
            >
              Rooms
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {homes.map((home) => (
            <TableRow key={home.id}>
              <TableHead
                scope="row"
                className="h-auto px-4 py-2 whitespace-normal"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/homes/${home.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg text-base font-semibold underline underline-offset-4"
                  >
                    {home.name}
                  </Link>
                  {home.archived ? (
                    <Badge variant="secondary">Archived</Badge>
                  ) : null}
                </span>
              </TableHead>
              <TableCell className="px-4 py-2 whitespace-normal text-muted-foreground">
                {home.street}
              </TableCell>
              <TableCell className="px-4 py-2">{home.postcode}</TableCell>
              <TableCell className="px-4 py-2">{roomsLabel(home)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
