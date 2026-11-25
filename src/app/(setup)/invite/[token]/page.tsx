import { MailWarningIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { secondaryActionClass } from "@/components/app/action-classes";
import { EmptyState } from "@/components/app/empty-state";
import { AcceptInvitations } from "@/components/setup/accept-invitations";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { invitationTokenSchema } from "@/lib/validation/members";
import { requireUser } from "@/server/auth";
import {
  getInvitationForToken,
  type InvitationLinkState,
} from "@/server/invitations";
import { getFullName } from "@/server/organisation";

export const metadata: Metadata = { title: "Your invitation" };

const CLOSED: Record<
  Exclude<InvitationLinkState["state"], "open">,
  { title: string; description: string }
> = {
  accepted: {
    title: "This invitation has been used",
    description:
      "Each link works once. If you joined already, go to Today. If not, ask for a new invitation.",
  },
  cancelled: {
    title: "This invitation was cancelled",
    description: "Ask the person who invited you to send a new one.",
  },
  expired: {
    title: "This invitation has expired",
    description:
      "Invitations last 7 days. Ask the person who invited you to send a new one.",
  },
  not_for_you: {
    title: "This invitation is for a different email address",
    description:
      "Sign out, then sign in with the email address the invitation was sent to.",
  },
  not_found: {
    title: "We could not find this invitation",
    description: "Check the link is complete, or ask for a new invitation.",
  },
};

/**
 * Where an invitation link lands (roadmap B4). The proxy sends people who
 * are not signed in to sign in first. The database only shows the
 * invitation to the person it was sent to (matched on their confirmed
 * email), and the Join button checks that again.
 */
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const user = await requireUser();
  const { token } = await params;
  const ctx = { supabase: await createClient(), userId: user.id };

  const parsed = invitationTokenSchema.safeParse(token);
  const limit = await rateLimit("invite-link", user.id, 30, "15 m");
  const [result, fullName] = await Promise.all([
    parsed.success && limit.success
      ? getInvitationForToken(ctx, parsed.data)
      : Promise.resolve<InvitationLinkState>({ state: "not_found" }),
    getFullName(ctx),
  ]);

  if (result.state === "open") {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">You have been invited</h1>
          <p className="text-base text-muted-foreground">
            Join {result.invitation.organisationName} on PropDesk.
          </p>
        </div>
        <AcceptInvitations
          invitations={[result.invitation]}
          askForName={!fullName}
        />
      </section>
    );
  }

  const closed = CLOSED[result.state];
  return (
    <section className="flex flex-col gap-6">
      <h1 className="sr-only">Your invitation</h1>
      <EmptyState
        icon={<MailWarningIcon />}
        title={closed.title}
        description={closed.description}
        headingLevel={2}
        action={
          <Link href="/dashboard" className={secondaryActionClass}>
            Go to PropDesk
          </Link>
        }
      />
      {result.state === "not_for_you" ? (
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-11 text-base font-medium underline underline-offset-4"
          >
            Sign out
          </button>
        </form>
      ) : null}
    </section>
  );
}
