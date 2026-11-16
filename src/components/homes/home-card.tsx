import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomeListItem } from "@/server/homes";

export function roomsLabel(home: HomeListItem) {
  if (home.letType === "whole_home" && home.roomCount === 0)
    return "Whole home";
  return home.roomCount === 1 ? "1 room" : `${home.roomCount} rooms`;
}

/** One home in the list. The whole card is the link (big touch target). */
export function HomeCard({ home }: { home: HomeListItem }) {
  return (
    <Link
      href={`/homes/${home.id}`}
      className="flex min-h-24 items-center gap-3 rounded-xl border p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{home.name}</span>
          {home.archived ? <Badge variant="secondary">Archived</Badge> : null}
        </span>
        <span className="text-base text-muted-foreground">{home.address}</span>
        <span className="text-base">{roomsLabel(home)}</span>
      </div>
      <ChevronRightIcon
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
