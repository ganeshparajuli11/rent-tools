import { HouseIcon } from "lucide-react";
import Link from "next/link";

import {
  DataTable,
  DataTableCell,
  DataTableHead,
  SortableHead,
} from "@/components/app/data-table";
import { StatusPill } from "@/components/app/status-pill";
import {
  ariaSortFor,
  homesListHref,
  type HomeSortKey,
  type HomesSort,
  nextHomesSort,
} from "@/lib/homes-sort";
import type { HomeListItem } from "@/server/homes";

import { roomsLabel } from "./home-card";

const COLUMNS: { key: HomeSortKey; label: string }[] = [
  { key: "name", label: "Home" },
  { key: "address", label: "Address" },
  { key: "postcode", label: "Postcode" },
];

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
    <DataTable caption="Your homes. Choose a column heading to sort the list.">
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <SortableHead
              key={column.key}
              label={column.label}
              // Sorting again starts from the first page.
              href={homesListHref({
                archived,
                sort: nextHomesSort(sort, column.key),
              })}
              state={ariaSortFor(sort, column.key)}
            />
          ))}
          <DataTableHead>Rooms</DataTableHead>
        </tr>
      </thead>
      <tbody>
        {homes.map((home) => (
          <tr key={home.id}>
            <DataTableHead scope="row">
              <span className="flex flex-wrap items-center gap-3">
                <span className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-subtle text-muted-foreground">
                  {home.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={home.coverUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <HouseIcon aria-hidden="true" className="size-4.5" />
                  )}
                </span>
                <Link
                  href={`/homes/${home.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {home.name}
                </Link>
                {home.archived ? (
                  <StatusPill tone="outline">Archived</StatusPill>
                ) : null}
              </span>
            </DataTableHead>
            <DataTableCell>{home.street}</DataTableCell>
            <DataTableCell>{home.postcode}</DataTableCell>
            <DataTableCell>{roomsLabel(home)}</DataTableCell>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
