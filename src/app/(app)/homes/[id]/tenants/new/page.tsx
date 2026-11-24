import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RoleNotice } from "@/components/app/role-notice";
import { TenantWizard } from "@/components/tenants/tenant-wizard";
import { buttonVariants } from "@/components/ui/button";
import { todayInLondon } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { getHome } from "@/server/homes";

export const metadata: Metadata = { title: "Add a tenant" };

/**
 * "Add a tenant" for one room (`?room=`) or for a home let as a whole.
 * A home let by the room with no room chosen shows its empty rooms first.
 */
export default async function NewTenantPage({
  params,
  searchParams,
}: PageProps<"/homes/[id]/tenants/new">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { room: roomParam } = await searchParams;
  const roomValue = Array.isArray(roomParam) ? roomParam[0] : roomParam;
  if (roomValue !== undefined && !idSchema.safeParse(roomValue).success) {
    notFound();
  }

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [home, canAdd] = await Promise.all([
    getHome(ctx, id),
    hasRoleAtLeast(ctx, "manager"),
  ]);
  if (!home || home.archived) notFound();

  const room = roomValue
    ? home.rooms.find((candidate) => candidate.id === roomValue)
    : undefined;
  if (roomValue && !room) notFound();

  const homeHref = `/homes/${home.id}`;
  const backLink = (
    <Link
      href={homeHref}
      className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
    >
      <ChevronLeftIcon aria-hidden="true" className="size-5" />
      Cancel
    </Link>
  );

  if (!canAdd) {
    return (
      <div className="flex max-w-xl flex-col gap-6">
        {backLink}
        <h1 className="text-2xl font-semibold">Add a tenant</h1>
        <RoleNotice
          min="manager"
          back={{ href: homeHref, label: `Back to ${home.name}` }}
        />
      </div>
    );
  }

  // Let by the room, and no room chosen yet: pick an empty room first.
  if (!room && home.rooms.length > 0) {
    const emptyRooms = home.rooms.filter((candidate) => !candidate.tenant);
    return (
      <div className="flex max-w-xl flex-col gap-6">
        {backLink}
        <h1 className="text-2xl font-semibold">Add a tenant</h1>
        {emptyRooms.length > 0 ? (
          <>
            <p className="text-base text-muted-foreground">
              Which room in {home.name} are they moving into?
            </p>
            <ul className="flex flex-col gap-3">
              {emptyRooms.map((candidate) => (
                <li key={candidate.id}>
                  <Link
                    href={`${homeHref}/tenants/new?room=${candidate.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-4 text-base font-medium hover:bg-muted/50"
                  >
                    {candidate.name}
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-base text-muted-foreground">
            Every room in {home.name} has a tenant. Add a room on the home page,
            or mark a tenant as moved out first.
          </p>
        )}
      </div>
    );
  }

  const currentTenant = room ? room.tenant : home.wholeHomeTenant;
  const place = room ? `${room.name}, ${home.name}` : home.name;

  if (currentTenant) {
    return (
      <div className="flex max-w-xl flex-col items-start gap-6">
        {backLink}
        <h1 className="text-2xl font-semibold">Add a tenant</h1>
        <p className="text-base text-muted-foreground">
          {place} already has a tenant: {currentTenant.name}. Mark them as moved
          out before you add someone new.
        </p>
        <Link
          href={`/tenants/${currentTenant.id}`}
          className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
        >
          Go to {currentTenant.name}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {backLink}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Add a tenant</h1>
        <p className="text-base text-muted-foreground">{place}</p>
      </div>
      <TenantWizard
        homeId={home.id}
        roomId={room ? room.id : null}
        today={todayInLondon()}
      />
    </div>
  );
}
