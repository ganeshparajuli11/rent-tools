import { PhotoCard } from "@/components/app/photo-card";
import type { HomeListItem } from "@/server/homes";

export function roomsLabel(home: HomeListItem) {
  if (home.letType === "whole_home" && home.roomCount === 0)
    return "Whole home";
  return home.roomCount === 1 ? "1 room" : `${home.roomCount} rooms`;
}

/** One home in the list on phones and tablets: its photo, name and rooms. */
export function HomeCard({ home }: { home: HomeListItem }) {
  return (
    <PhotoCard
      href={`/homes/${home.id}`}
      photoUrl={home.coverUrl}
      title={home.name}
      meta={`${roomsLabel(home)} · ${home.address}`}
      chip={home.archived ? { label: "Archived", tone: "outline" } : undefined}
    />
  );
}
