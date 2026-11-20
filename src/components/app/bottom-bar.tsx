"use client";

import { EllipsisIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { bottomBarItems, isActivePath, moreItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";

const tabClass =
  "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium";

/**
 * Phones and tablets (below 1024px): Today, Properties, Rent (and Repairs
 * once it exists) in a bar at the bottom, and More for everything else.
 * `account` is shown at the top of the More sheet (organisation, person,
 * Sign out).
 */
export function BottomBar({ account }: { account: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const links = bottomBarItems();
  const more = moreItems();
  const moreActive = more.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {links.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  tabClass,
                  active ? "text-ink" : "text-muted-foreground",
                )}
              >
                <NavIcon name={item.icon} className="size-6" />
                <span
                  className={cn(
                    active && "font-semibold underline underline-offset-4",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              tabClass,
              moreActive ? "text-ink" : "text-muted-foreground",
            )}
          >
            <EllipsisIcon aria-hidden="true" className="size-6" />
            <span
              className={cn(
                moreActive && "font-semibold underline underline-offset-4",
              )}
            >
              More
            </span>
          </button>
        </li>
      </ul>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-4 overflow-y-auto rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-0">
            <SheetTitle className="text-lg font-semibold">More</SheetTitle>
            <SheetDescription className="sr-only">
              The rest of the menu, your organisation and signing out.
            </SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col gap-0.5 px-4">
            {more.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-[10px] px-2.5 text-base",
                      active
                        ? "bg-ink font-semibold text-surface"
                        : "font-medium text-ink-2 hover:bg-subtle",
                    )}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col gap-3 border-t border-border px-4 pt-4">
            {account}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
