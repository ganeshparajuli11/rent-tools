"use client";

import { MailOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptInvitationAction } from "@/app/(setup)/setup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateUK } from "@/lib/dates";
import { roleInSentence } from "@/lib/people";

export type InvitationChoice = {
  id: string;
  organisationName: string;
  role: string;
  expiresAt: string;
};

/**
 * Invitations for the signed-in person (roadmap B4), each with a Join
 * button. People who have not given their name yet are asked for it once,
 * so colleagues see who they are. The server checks again that the
 * invitation is theirs and still open.
 */
export function AcceptInvitations({
  invitations,
  askForName,
}: {
  invitations: InvitationChoice[];
  askForName: boolean;
}) {
  const router = useRouter();
  const nameId = useId();
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join(invitation: InvitationChoice) {
    setError(null);
    if (askForName && fullName.trim().length === 0) {
      setError("Enter your full name");
      document.getElementById(nameId)?.focus();
      return;
    }
    setJoining(invitation.id);
    startTransition(async () => {
      const result = await acceptInvitationAction({
        invitationId: invitation.id,
        fullName: askForName ? fullName : undefined,
      });
      setJoining(null);
      if (!result.ok) {
        setError(result.fieldErrors?.fullName ?? result.error);
        return;
      }
      toast.success(`You have joined ${invitation.organisationName}`);
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {askForName ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-base font-medium">
            Your full name
          </label>
          <p id={`${nameId}-hint`} className="text-base text-muted-foreground">
            Shown to people you work with in PropDesk.
          </p>
          <Input
            id={nameId}
            value={fullName}
            autoComplete="name"
            aria-describedby={`${nameId}-hint`}
            onChange={(event) => setFullName(event.target.value)}
            className="h-12 text-base"
          />
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
          >
            <MailOpenIcon
              aria-hidden="true"
              className="hidden size-5.5 shrink-0 sm:block"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-base font-medium break-words">
                {invitation.organisationName}
              </p>
              <p className="text-[13px] text-muted-foreground">
                Join as {roleInSentence(invitation.role)} · open until{" "}
                {formatDateUK(invitation.expiresAt)}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 px-6 text-base"
              disabled={pending}
              onClick={() => join(invitation)}
            >
              {joining === invitation.id ? "Joining…" : "Join"}
              <span className="sr-only"> {invitation.organisationName}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
