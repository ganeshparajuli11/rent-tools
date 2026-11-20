import { z } from "zod";

/**
 * Shared schema for the ⌘K search box. The term is used inside a PostgREST
 * filter, so everything except letters, numbers, spaces and a few harmless
 * marks (' . - &) is removed first. Commas, brackets, quotes, backslashes,
 * % and _ can never reach the query. Spaces are squeezed to one.
 */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

export function cleanSearchTerm(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'.&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH)
    .trim();
}

export const searchQuerySchema = z.object({
  query: z
    .string({ error: "Type something to search for" })
    .max(200, { error: "Please use fewer words" })
    .transform(cleanSearchTerm)
    .pipe(
      z.string().min(SEARCH_MIN_LENGTH, {
        error: `Type at least ${SEARCH_MIN_LENGTH} letters or numbers`,
      }),
    ),
});

export type SearchQuery = z.output<typeof searchQuerySchema>;
