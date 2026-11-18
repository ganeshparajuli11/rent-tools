import type { Metadata } from "next";

import { OverdueEmailSwitch } from "@/components/settings/overdue-email-switch";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getOverdueEmailSettings, NOT_READY } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

/** Settings for the account. For now: the daily late rent email. */
export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getOverdueEmailSettings({
    supabase,
    userId: user.id,
  });

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

      <OverdueEmailSwitch
        enabled={settings.enabled ?? false}
        disabledReason={disabledReason}
      />

      {user.email && settings.isOwner ? (
        <p className="text-base text-muted-foreground">
          Emails go to the email address you sign in with: {user.email}
        </p>
      ) : null}
    </section>
  );
}
