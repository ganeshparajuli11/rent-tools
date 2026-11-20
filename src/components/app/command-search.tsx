"use client";

import { Building2Icon, Loader2Icon, SearchIcon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { searchAction } from "@/app/(app)/search/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SEARCH_MIN_LENGTH } from "@/lib/validation/search";
import type { SearchResult, SearchResults } from "@/server/search";

const DEBOUNCE_MS = 250;

/**
 * The search dialog. ⌘K (Mac) or Ctrl K opens it from anywhere in the app.
 * Results are links; ↑ and ↓ move between them and Enter opens one.
 */
export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  // ⌘K / Ctrl K anywhere toggles the dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Search as people type, after a short pause.
  useEffect(() => {
    const term = query.trim();
    if (term.length < SEARCH_MIN_LENGTH) return;
    const ticket = ++latest.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchAction({ query: term });
        if (ticket !== latest.current) return;
        if (result.ok) {
          setResults(result.data);
          setError(null);
        } else {
          setResults(null);
          setError(result.error);
        }
        setActive(0);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const items: SearchResult[] = results
    ? [...results.homes, ...results.tenants]
    : [];
  const tooShort = query.trim().length < SEARCH_MIN_LENGTH;

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setResults(null);
    setError(null);
    setActive(0);
  }, [onOpenChange]);

  function go(item: SearchResult) {
    close();
    router.push(item.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active];
      if (item) go(item);
    }
  }

  const activeItem = tooShort ? undefined : items[active];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent className="top-4 max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:top-[12vh] sm:max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search your homes and tenants. Use the up and down arrows to choose a
          result and Enter to open it.
        </DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          {pending ? (
            <Loader2Icon
              aria-hidden="true"
              className="size-4.5 flex-none animate-spin text-muted-foreground"
            />
          ) : (
            <SearchIcon
              aria-hidden="true"
              className="size-4.5 flex-none text-muted-foreground"
            />
          )}
          <label htmlFor={inputId} className="sr-only">
            Search homes and tenants
          </label>
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded={items.length > 0 && !tooShort}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeItem
                ? `${listId}-${activeItem.kind}-${activeItem.id}`
                : undefined
            }
            autoComplete="off"
            autoFocus
            placeholder="Search homes and tenants…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {tooShort ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type a home&rsquo;s name, street or postcode, or a tenant&rsquo;s
              name.
            </p>
          ) : error ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-bad">
              {error}
            </p>
          ) : results && items.length === 0 ? (
            <p
              role="status"
              className="px-3 py-6 text-center text-sm text-muted-foreground"
            >
              Nothing matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : null}

          <ul
            id={listId}
            role="listbox"
            aria-label="Results"
            className={cn((tooShort || items.length === 0) && "hidden")}
          >
            {(["homes", "tenants"] as const).map((group) =>
              results && results[group].length > 0 ? (
                <li key={group} role="presentation">
                  <p
                    role="presentation"
                    className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
                  >
                    {group === "homes" ? "Homes" : "Tenants"}
                  </p>
                  <ul role="presentation">
                    {results[group].map((item) => {
                      const selected = activeItem === item;
                      const Icon =
                        item.kind === "home" ? Building2Icon : UserIcon;
                      return (
                        <li
                          key={item.id}
                          id={`${listId}-${item.kind}-${item.id}`}
                          role="option"
                          aria-selected={selected}
                          onClick={() => go(item)}
                          onMouseMove={() => setActive(items.indexOf(item))}
                          className={cn(
                            "flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2",
                            selected && "bg-subtle",
                          )}
                        >
                          <Icon
                            aria-hidden="true"
                            className="size-4.5 flex-none text-muted-foreground"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-[15px] font-medium text-ink">
                              {item.title}
                            </span>
                            {item.detail ? (
                              <span className="truncate text-[13px] text-muted-foreground">
                                {item.detail}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
