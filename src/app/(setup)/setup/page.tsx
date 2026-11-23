import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { OrganisationSetupForm } from "@/components/setup/organisation-setup-form";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getFullName, hasOrganisation } from "@/server/organisation";

export const metadata: Metadata = { title: "Set up your organisation" };

/**
 * First-time setup (PRODUCT_SPEC.md §6.1): a new account names its
 * organisation, picks the account type and gives a contact email, and
 * becomes its owner. People who already have an organisation go to Today.
 */
export default async function SetupPage() {
  const user = await requireUser();
  const ctx = { supabase: await createClient(), userId: user.id };
  const [alreadySetUp, fullName] = await Promise.all([
    hasOrganisation(ctx),
    getFullName(ctx),
  ]);
  if (alreadySetUp) redirect("/dashboard");

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Set up your organisation</h1>
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
