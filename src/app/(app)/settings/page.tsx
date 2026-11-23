import type { Metadata } from "next";

import { DataDownloads } from "@/components/settings/data-downloads";
import { OrganisationDetails } from "@/components/settings/organisation-details";
import { OverdueEmailSwitch } from "@/components/settings/overdue-email-switch";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getOrganisationDetails } from "@/server/organisation";
import { getOverdueEmailSettings, NOT_READY } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings for the account: the organisation's details, the daily late
 * rent email and data downloads.
 */
export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const user = await requireUser();
  const params = await searchParams;
  // Set by /api/export when a download could not be made.
  const exportProblem =
    typeof params.export === "string" ? params.export : undefined;
  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [settings, organisation] = await Promise.all([
    getOverdueEmailSettings(ctx),
    getOrganisationDetails(ctx),
  ]);

  const disabledReason =
    settings.enabled === null
      ? NOT_READY
      : !settings.isOwner
        ? "Only the account owner can change this."
        : undefined;

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-base text-muted-foreground">
          {settings.organisationName}
        </p>
      </div>

      <OrganisationDetails
        name={organisation.name}
        accountType={organisation.accountType}
        contactEmail={organisation.contactEmail}
      />

      <OverdueEmailSwitch
        enabled={settings.enabled ?? false}
        disabledReason={disabledReason}
      />

      {user.email && settings.isOwner ? (
        <p className="text-base text-muted-foreground">
          Emails go to the email address you sign in with: {user.email}
        </p>
      ) : null}

      {settings.isOwner ? <DataDownloads problem={exportProblem} /> : null}
    </section>
  );
}
