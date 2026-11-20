import { LogOutIcon } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { initialsOf } from "@/lib/people";
import { cn } from "@/lib/utils";

/**
 * The signed-in person: initials, name and role, with Sign out. People have
 * no stored name until profiles arrive (roadmap item B2), so the email
 * address stands in for it.
 */
export function PersonBlock({
  email,
  role,
  className,
}: {
  email: string;
  role: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2.5 px-2.5">
        <span
          aria-hidden="true"
          className="flex size-8.5 flex-none items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-surface"
        >
          {initialsOf(email)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-ink">
            {email}
          </span>
          {role ? (
            <span className="text-xs text-muted-foreground">{role}</span>
          ) : null}
        </span>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-2.5 text-[15px] font-medium text-ink-2 hover:bg-subtle hover:text-ink"
        >
          <LogOutIcon
            aria-hidden="true"
            strokeWidth={1.8}
            className="size-4.5"
          />
          Sign out
        </button>
      </form>
    </div>
  );
}
