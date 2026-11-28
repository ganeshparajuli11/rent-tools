import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RoleNotice } from "@/components/app/role-notice";
import { HomeWizard } from "@/components/homes/home-wizard";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";

export const metadata: Metadata = { title: "Add a home" };

export default async function NewHomePage() {
  const user = await requireUser();
  const canAdd = await hasRoleAtLeast(
    { supabase: await createClient(), userId: user.id },
    "manager",
  );
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href="/homes"
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Cancel
      </Link>
      <h1 className="text-2xl font-semibold">Add a home</h1>
      {canAdd ? (
        <HomeWizard />
      ) : (
        <RoleNotice
          min="manager"
          back={{ href: "/homes", label: "All homes" }}
        />
      )}
    </div>
  );
}
