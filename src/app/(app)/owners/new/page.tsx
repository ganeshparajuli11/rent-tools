import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RoleNotice } from "@/components/app/role-notice";
import { OwnerForm } from "@/components/owners/owner-form";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/homes";
import { EMPTY_OWNER_FORM } from "@/lib/validation/owners";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { getHomeName } from "@/server/homes";

export const metadata: Metadata = { title: "Add an owner" };

/**
 * "Add an owner". Opened from a home page (`?home=<id>`), the new owner is
 * linked to that home and you go back to it.
 */
export default async function NewOwnerPage({
  searchParams,
}: PageProps<"/owners/new">) {
  const user = await requireUser();
  const homeParam = (await searchParams).home;
  const homeIdText = Array.isArray(homeParam) ? homeParam[0] : homeParam;
  const homeId = idSchema.safeParse(homeIdText);

  const ctx = { supabase: await createClient(), userId: user.id };
  const [canAdd, home] = await Promise.all([
    hasRoleAtLeast(ctx, "manager"),
    homeId.success ? getHomeName(ctx, homeId.data) : Promise.resolve(null),
  ]);
  // Only a current home can take a new owner; otherwise add them on their own.
  const forHome = home && !home.archived ? home : null;
  const back = forHome
    ? { href: `/homes/${forHome.id}`, label: `Back to ${forHome.name}` }
    : { href: "/owners", label: "All owners" };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Cancel
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Add an owner</h1>
        {forHome ? (
          <p className="text-base text-muted-foreground">
            They will be linked to {forHome.name}.
          </p>
        ) : null}
      </div>
      {canAdd ? (
        <OwnerForm
          mode="create"
          homeId={forHome?.id ?? null}
          defaultValues={EMPTY_OWNER_FORM}
          cancelHref={back.href}
        />
      ) : (
        <RoleNotice min="manager" back={back} />
      )}
    </div>
  );
}
