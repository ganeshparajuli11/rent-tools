import { StatusPill } from "@/components/app/status-pill";
import { formatDateUK } from "@/lib/dates";
import { invitationStatus } from "@/lib/invitations";
import { roleLabel } from "@/lib/people";

import { CancelInvitationButton } from "./cancel-invitation-button";

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  sentAt: string;
  expiresAt: string;
};

/**
 * Invitations nobody has accepted or cancelled yet. An expired one stays
 * until it is cancelled or the address is invited again.
 */
export function InvitationList({
  invitations,
}: {
  invitations: InvitationRow[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-divider">
      {invitations.map((invitation) => {
        const expired = invitationStatus(invitation.expiresAt) === "expired";
        return (
          <li
            key={invitation.id}
            data-testid="invitation-row"
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base font-medium break-all">
                {invitation.email}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {roleLabel(invitation.role)} · sent{" "}
                {formatDateUK(invitation.sentAt)} ·{" "}
                {expired ? "expired" : "expires"}{" "}
                {formatDateUK(invitation.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill tone={expired ? "bad" : "warn"}>
                {expired ? "Expired" : "Waiting"}
              </StatusPill>
              <CancelInvitationButton
                invitationId={invitation.id}
                email={invitation.email}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
