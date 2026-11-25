"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { changeMemberRoleAction } from "@/app/(app)/settings/members/actions";
import { roleInSentence } from "@/lib/people";
import {
  MEMBER_ROLE_OPTIONS,
  MEMBER_ROLES,
  type MemberRole,
} from "@/lib/validation/members";

function isMemberRole(value: string): value is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(value);
}

/**
 * A member's role as a native select (easy on phones and keyboards). A
 * change saves straight away; the toast has Undo instead of a dialog.
 */
export function MemberRoleSelect({
  membershipId,
  name,
  role: initial,
}: {
  membershipId: string;
  name: string;
  role: MemberRole;
}) {
  const router = useRouter();
  const id = useId();
  const [role, setRole] = useState<MemberRole>(initial);
  const [pending, startTransition] = useTransition();

  function save(next: MemberRole, isUndo = false) {
    const before = role;
    setRole(next);
    startTransition(async () => {
      const result = await changeMemberRoleAction({ membershipId, role: next });
      if (!result.ok) {
        setRole(before);
        toast.error(result.error);
        return;
      }
      router.refresh();
      const message = `${name} is now ${roleInSentence(next)}`;
      if (isUndo) {
        toast.success(message);
        return;
      }
      const previous = result.data.previousRole;
      toast(message, {
        duration: 10_000,
        action: isMemberRole(previous)
          ? { label: "Undo", onClick: () => save(previous, true) }
          : undefined,
      });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        Role for {name}
      </label>
      <select
        id={id}
        value={role}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          if (isMemberRole(next) && next !== role) save(next);
        }}
        className="h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 sm:w-40"
      >
        {MEMBER_ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
