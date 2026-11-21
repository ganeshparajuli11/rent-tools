/**
 * The status word for a home (docs/DESIGN_SYSTEM.md §4): "Fully let",
 * "1 room empty", "Empty" or "Archived", with the colour it is shown in.
 * The word is always shown, so colour is never the only signal.
 */
export type HomeStatus = {
  label: string;
  tone: "good" | "warn" | "neutral" | "outline";
};

export function homeStatus(home: {
  archived: boolean;
  /** Rooms in use (not archived). 0 for a home let as a whole. */
  roomCount: number;
  /** Rooms with a current tenant. */
  roomsLet: number;
  /** A home let as a whole: does it have a current tenant? */
  wholeHomeLet: boolean;
}): HomeStatus {
  if (home.archived) return { label: "Archived", tone: "outline" };

  if (home.roomCount === 0) {
    return home.wholeHomeLet
      ? { label: "Fully let", tone: "good" }
      : { label: "Empty", tone: "neutral" };
  }

  const let_ = Math.min(Math.max(home.roomsLet, 0), home.roomCount);
  const empty = home.roomCount - let_;
  if (empty === 0) return { label: "Fully let", tone: "good" };
  if (let_ === 0) return { label: "Empty", tone: "neutral" };
  return {
    label: empty === 1 ? "1 room empty" : `${empty} rooms empty`,
    tone: "warn",
  };
}
