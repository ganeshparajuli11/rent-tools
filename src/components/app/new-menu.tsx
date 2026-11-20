"use client";

import { Building2Icon, PlusIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Things you can add from anywhere. Only items that work today are listed;
 * Tenant, Owner, Payment, Repair and Contractor join as their pages arrive.
 */
const NEW_ITEMS = [
  { href: "/homes/new", label: "Property", icon: Building2Icon },
] as const;

export function NewMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4.5 text-[15px] font-medium text-surface hover:bg-ink-2",
          className,
        )}
      >
        <PlusIcon aria-hidden="true" className="size-4.5" />
        New
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 p-1.5">
        {NEW_ITEMS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            render={<Link href={href} />}
            className="min-h-11 gap-2.5 px-2.5 text-[15px]"
          >
            <Icon aria-hidden="true" className="size-4.5" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
