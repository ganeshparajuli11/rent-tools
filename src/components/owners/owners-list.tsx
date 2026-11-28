import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/app/avatar";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
} from "@/components/app/data-table";
import { StatusPill } from "@/components/app/status-pill";
import { formatPence } from "@/lib/money";
import { homesCountLabel, ownerTypeLabel } from "@/lib/owners";
import type { OwnerListItem } from "@/server/owners";

/** Owners as a table, shown on wide screens. Phones and tablets get cards. */
export function OwnersTable({ owners }: { owners: OwnerListItem[] }) {
  return (
    <DataTable caption="Your owners. Choose a name to open their record.">
      <thead>
        <tr>
          <DataTableHead>Owner</DataTableHead>
          <DataTableHead>Phone</DataTableHead>
          <DataTableHead>Email</DataTableHead>
          <DataTableHead align="right">Homes</DataTableHead>
          <DataTableHead align="right">Rent you pay a month</DataTableHead>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <tr key={owner.id}>
            <DataTableHead scope="row">
              <span className="flex items-center gap-3">
                <Avatar name={owner.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <Link
                    href={`/owners/${owner.id}`}
                    className="inline-flex min-h-10 items-center font-semibold break-words hover:underline"
                  >
                    {owner.name}
                  </Link>
                  <span className="text-[13px] font-normal text-muted-foreground">
                    {ownerTypeLabel(owner.ownerType)}
                  </span>
                </span>
                {owner.archived ? (
                  <StatusPill tone="outline">Archived</StatusPill>
                ) : null}
              </span>
            </DataTableHead>
            <DataTableCell>{owner.phone ?? "—"}</DataTableCell>
            <DataTableCell className="break-all">
              {owner.email ?? "—"}
            </DataTableCell>
            <DataTableCell align="right">{owner.homeCount}</DataTableCell>
            <DataTableCell align="right">
              {owner.monthlyRentPence > 0
                ? formatPence(owner.monthlyRentPence)
                : "—"}
            </DataTableCell>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

/** One owner as a card, for phones and tablets. The whole card is a link. */
export function OwnerCard({ owner }: { owner: OwnerListItem }) {
  return (
    <Link
      href={`/owners/${owner.id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-canvas"
    >
      <Avatar name={owner.name} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold break-words">
            {owner.name}
          </span>
          {owner.archived ? (
            <StatusPill tone="outline">Archived</StatusPill>
          ) : null}
        </span>
        <span className="text-sm text-muted-foreground">
          {ownerTypeLabel(owner.ownerType)} · {homesCountLabel(owner.homeCount)}
          {owner.monthlyRentPence > 0
            ? ` · ${formatPence(owner.monthlyRentPence)} a month`
            : ""}
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-5 flex-none text-muted-foreground"
      />
    </Link>
  );
}
