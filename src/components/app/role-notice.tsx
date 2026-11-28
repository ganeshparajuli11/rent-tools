import { LockIcon } from "lucide-react";
import Link from "next/link";

import { roleTooLowMessage, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

import { secondaryActionClass } from "./action-classes";
import { EmptyState } from "./empty-state";

/**
 * Shown instead of a form the person's role cannot use (for example a
 * staff member who opens "Add a home" from a saved link). The server and
 * the database refuse the change anyway; this just says so plainly.
 */
export function RoleNotice({
  min,
  back,
}: {
  /** The least role that can use this page. */
  min: Role;
  back: { href: string; label: string };
}) {
  return (
    <EmptyState
      icon={<LockIcon />}
      title="You can look, but not change this"
      description={`${roleTooLowMessage(min)} Ask them if something needs changing.`}
      action={
        <Link
          href={back.href}
          className={cn(secondaryActionClass, "w-full sm:w-auto")}
        >
          {back.label}
        </Link>
      }
    />
  );
}
