"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, visibleNavGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { NavIcon } from "./nav-icon";

/**
 * The grouped menu in the sidebar (1024px and wider). Pages that do not
 * exist yet are left out (see src/lib/nav.ts). `counts` adds a grey count
 * pill to an item, by its link.
 */
export function SidebarNav({
  counts = {},
}: {
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {visibleNavGroups().map((group) => (
        <div key={group.label || "start"} className="flex flex-col gap-0.5">
          {group.label ? (
            <h2 className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {group.label}
            </h2>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const count = counts[item.href];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[10px] px-2.5 text-[15px]",
                      active
                        ? "bg-ink font-semibold text-surface"
                        : "font-medium text-ink-2 hover:bg-subtle hover:text-ink",
                    )}
                  >
                    <NavIcon name={item.icon} />
                    <span className="flex-1">{item.label}</span>
                    {count !== undefined ? (
                      <span
                        className={cn(
                          "rounded-full px-2 text-xs font-medium tabular-nums",
                          active
                            ? "bg-surface/15 text-surface"
                            : "bg-subtle text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
