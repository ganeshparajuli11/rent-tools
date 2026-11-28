"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { switchOrganisationAction } from "@/app/(app)/organisation-actions";
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
 * organisation it opens a menu listing them, and picking another one
 * switches to it (roadmap B5): the server checks the person is a member,
 * remembers the choice, and we go to Today, because the page open now
 * belongs to the old organisation.
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active =
    organisations.find((organisation) => organisation.id === activeId) ??
    organisations[0];
  if (!active) return null;

  function switchTo(organisation: Organisation) {
    startTransition(async () => {
      const result = await switchOrganisationAction({
        organisationId: organisation.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      toast.success(`Now working in ${organisation.name}`);
      router.push("/dashboard");
      router.refresh();
    });
  }

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
        aria-label={`Organisation: ${active.name}. Switch organisation`}
        aria-busy={pending || undefined}
        disabled={pending}
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
                disabled={pending}
                aria-current={current ? "true" : undefined}
                onClick={current ? undefined : () => switchTo(organisation)}
                className="min-h-11 gap-2 px-2 text-sm"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{organisation.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {organisation.accountType}
                  </span>
                </span>
                {current ? (
                  <CheckIcon aria-label="Current organisation" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
