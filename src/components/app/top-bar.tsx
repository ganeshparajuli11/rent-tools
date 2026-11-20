"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { AppLogo } from "./app-logo";
import { CommandSearch } from "./command-search";
import { NewMenu } from "./new-menu";

/**
 * The bar at the top of every signed-in page. Wide screens: the search box
 * (opens the ⌘K dialog) and + New. Phones and tablets: the logo, a search
 * button and + New.
 */
export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-2 backdrop-blur-sm lg:px-8 lg:py-3.5">
      <AppLogo className="-ml-2 lg:hidden" />

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-haspopup="dialog"
        className="hidden h-11 max-w-140 flex-1 items-center gap-2.5 rounded-xl bg-subtle px-3.5 text-left text-[15px] text-muted-foreground hover:bg-border/60 lg:flex"
      >
        <SearchIcon aria-hidden="true" className="size-4.5 flex-none" />
        <span className="flex-1 truncate">Search homes and tenants…</span>
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-xs text-muted-foreground">
          <span className="sr-only">Shortcut: </span>⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-haspopup="dialog"
          aria-label="Search"
          className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-ink hover:bg-subtle lg:hidden"
        >
          <SearchIcon aria-hidden="true" className="size-4.5" />
        </button>
        <NewMenu />
      </div>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
