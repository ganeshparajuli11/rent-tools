"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/lib/people";
import { cn } from "@/lib/utils";

type Organisation = { id: string; name: string; accountType: string };

function Summary({ organisation }: { organisation: Organisation }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-8 flex-none items-center justify-center rounded-lg bg-border text-[13px] font-semibold text-ink"
      >
        {initialsOf(organisation.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-semibold text-ink">
          {organisation.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {organisation.accountType}
        </span>
      </span>
    </>
  );
}

const boxClass =
  "flex min-h-13 w-full items-center gap-2.5 rounded-xl border border-border bg-canvas/50 px-2.5 py-2";

/**
 * The active organisation: name and account type. With more than one
 * organisation it opens a menu listing them; picking another one arrives
 * with the switcher in roadmap item B5, so for now the others are shown
 * but cannot be chosen.
 */
export function OrganisationBlock({
  organisations,
  activeId,
  className,
}: {
  organisations: Organisation[];
  activeId: string;
  className?: string;
}) {
  const active =
    organisations.find((organisation) => organisation.id === activeId) ??
    organisations[0];
  if (!active) return null;

  if (organisations.length < 2) {
    return (
      <div className={cn(boxClass, className)}>
        <Summary organisation={active} />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(boxClass, "hover:bg-subtle", className)}
        aria-label={`Organisation: ${active.name}. Show your organisations`}
      >
        <Summary organisation={active} />
        <ChevronsUpDownIcon
          aria-hidden="true"
          className="size-4 flex-none text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-60 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your organisations</DropdownMenuLabel>
          {organisations.map((organisation) => {
            const current = organisation.id === active.id;
            return (
              <DropdownMenuItem
                key={organisation.id}
                disabled={!current}
                className="min-h-11 gap-2 px-2 text-sm"
              >
                <span className="flex-1 truncate">{organisation.name}</span>
                {current ? (
                  <CheckIcon aria-label="Current organisation" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuLabel className="px-2 pt-2 text-xs">
            Switching between organisations is coming soon.
          </DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
