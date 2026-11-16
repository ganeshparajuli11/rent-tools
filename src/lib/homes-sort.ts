import { z } from "zod";

/**
 * Sorting and paging for the homes list, read from the page address
 * (`/homes?sort=postcode&dir=desc&page=2`).
 *
 * The list is paginated, so sorting happens in the database, never in the
 * browser: sorting one page of results on screen would give a wrong order.
 * Anything unexpected in the address falls back to the default, so a bad
 * link can never cause an error or reach the database.
 */

export const HOME_SORT_KEYS = ["name", "address", "postcode"] as const;
export type HomeSortKey = (typeof HOME_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";
export type HomesSort = { key: HomeSortKey; direction: SortDirection };

export const DEFAULT_HOMES_SORT: HomesSort = { key: "name", direction: "asc" };

const sortKeySchema = z.enum(HOME_SORT_KEYS).catch(DEFAULT_HOMES_SORT.key);
const directionSchema = z
  .enum(["asc", "desc"])
  .catch(DEFAULT_HOMES_SORT.direction);

type Param = string | string[] | undefined;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Page number from the address. Anything that is not 1 or more becomes 1. */
export function parsePageNumber(value: Param): number {
  const text = first(value);
  if (!text || !/^\d{1,6}$/.test(text)) return 1;
  const n = Number(text);
  return n >= 1 ? n : 1;
}

export function parseHomesSort(params: {
  sort?: Param;
  dir?: Param;
}): HomesSort {
  return {
    key: sortKeySchema.parse(first(params.sort)),
    direction: directionSchema.parse(first(params.dir)),
  };
}

/**
 * What choosing a column heading does: a new column starts A to Z, and
 * choosing the current column again flips the direction.
 */
export function nextHomesSort(current: HomesSort, key: HomeSortKey): HomesSort {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/** Value for a column heading's `aria-sort`. */
export function ariaSortFor(
  current: HomesSort,
  key: HomeSortKey,
): "ascending" | "descending" | "none" {
  if (current.key !== key) return "none";
  return current.direction === "asc" ? "ascending" : "descending";
}

/** Link to the homes list. Defaults are left out to keep addresses short. */
export function homesListHref({
  page = 1,
  archived = false,
  sort = DEFAULT_HOMES_SORT,
}: {
  page?: number;
  archived?: boolean;
  sort?: HomesSort;
}): string {
  const params = new URLSearchParams();
  if (sort.key !== DEFAULT_HOMES_SORT.key) params.set("sort", sort.key);
  if (sort.direction !== DEFAULT_HOMES_SORT.direction)
    params.set("dir", sort.direction);
  if (page > 1) params.set("page", String(page));
  if (archived) params.set("archived", "1");
  const qs = params.toString();
  return qs ? `/homes?${qs}` : "/homes";
}
