import { Avatar } from "@/components/app/avatar";
import { StatusPill } from "@/components/app/status-pill";
import { formatDateUK } from "@/lib/dates";
import { roleLabel } from "@/lib/people";
import type { MemberRole } from "@/lib/validation/members";

import { MemberRoleSelect } from "./member-role-select";
import { RemoveMember } from "./remove-member";

export type MemberRow = {
  membershipId: string;
  name: string;
  role: string;
  joinedAt: string;
  isYou: boolean;
  /** True when the viewer may change this person's role or remove them. */
  canChange: boolean;
};

/**
 * Everyone in the organisation: name, role and when they joined. One list
 * that works as rows on wide screens and stacked cards on phones. Owners
 * and admins get a role select and Remove on the people they may change.
 */
export function MemberList({ members }: { members: MemberRow[] }) {
  return (
    <ul className="flex flex-col divide-y divide-divider">
      {members.map((member) => (
        <li
          key={member.membershipId}
          data-testid="member-row"
          className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:flex-wrap md:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={member.name} />
            <div className="flex min-w-0 flex-col">
              <p className="text-base font-medium break-words">
                {member.name}
                {member.isYou ? (
                  <span className="text-muted-foreground"> (you)</span>
                ) : null}
              </p>
              <p className="text-[13px] text-muted-foreground">
                Joined {formatDateUK(member.joinedAt)}
              </p>
            </div>
          </div>
          {member.canChange ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <MemberRoleSelect
                membershipId={member.membershipId}
                name={member.name}
                role={member.role as MemberRole}
              />
              <RemoveMember
                membershipId={member.membershipId}
                name={member.name}
              />
            </div>
          ) : (
            <StatusPill tone={member.role === "owner" ? "info" : "neutral"}>
              {roleLabel(member.role)}
            </StatusPill>
          )}
        </li>
      ))}
    </ul>
  );
}
