import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { AcceptInvitations } from "@/components/setup/accept-invitations";
import { OrganisationSetupForm } from "@/components/setup/organisation-setup-form";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getMyInvitations } from "@/server/invitations";
import { getFullName, hasOrganisation } from "@/server/organisation";

export const metadata: Metadata = { title: "Set up your organisation" };

/**
 * First-time setup (PRODUCT_SPEC.md §6.1): a new account names its
 * organisation, picks the account type and gives a contact email, and
 * becomes its owner. Someone who was invited (roadmap B4) sees their
 * invitations first and can join instead. People who already have an
 * organisation go to Today.
 */
export default async function SetupPage() {
  const user = await requireUser();
  const ctx = { supabase: await createClient(), userId: user.id };
  const [alreadySetUp, fullName, invitations] = await Promise.all([
    hasOrganisation(ctx),
    getFullName(ctx),
    getMyInvitations(ctx),
  ]);
  if (alreadySetUp) redirect("/dashboard");

  return (
    <section className="flex flex-col gap-8">
      {invitations.length ? (
        <section
          aria-labelledby="invitations-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <h1 id="invitations-heading" className="text-2xl font-semibold">
              You have been invited
            </h1>
            <p className="text-base text-muted-foreground">
              Join your team&apos;s organisation, or set up your own below.
            </p>
          </div>
          <AcceptInvitations invitations={invitations} askForName={!fullName} />
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        {invitations.length ? (
          <h2 className="border-t pt-8 text-2xl font-semibold">
            Or set up your own organisation
          </h2>
        ) : (
          <h1 className="text-2xl font-semibold">Set up your organisation</h1>
        )}
        <p className="text-base text-muted-foreground">
          Four quick questions, then you can add your first home.
        </p>
      </div>

      <OrganisationSetupForm
        defaultFullName={fullName ?? ""}
        defaultContactEmail={user.email ?? ""}
      />

      <form action={signOut} className="border-t pt-6">
        <p className="text-base text-muted-foreground">
          Not you?{" "}
          <button
            type="submit"
            className="min-h-11 font-medium text-foreground underline underline-offset-4"
          >
            Sign out
          </button>
        </p>
      </form>
    </section>
  );
}
