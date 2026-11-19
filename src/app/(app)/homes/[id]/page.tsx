import {
  ChevronLeftIcon,
  DoorOpenIcon,
  HouseIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArchiveHomeButton,
  RestoreHomeButton,
} from "@/components/homes/home-archive-buttons";
import { HomePhotos } from "@/components/homes/home-photos";
import { RoomList } from "@/components/homes/room-list";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getHome } from "@/server/homes";
import { listHomePhotos } from "@/server/photos";

export const metadata: Metadata = { title: "Home" };

/** One figure in the summary row at the top of the page. */
function Stat({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-2xl font-semibold tabular-nums",
          tone === "good" && "text-emerald-700 dark:text-emerald-400",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {note ? <dd className="text-sm text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

/** A titled box that groups one part of the page. */
function Panel({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function HomeDetailPage({
  params,
}: PageProps<"/homes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [home, photos] = await Promise.all([
    getHome(ctx, id),
    listHomePhotos(ctx, id),
  ]);
  if (!home) notFound();

  const address = [
    home.addressLine1,
    home.addressLine2,
    home.city,
    home.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  // Summary figures, all from data already on the page.
  const currentTenants = [
    ...home.rooms.flatMap((room) => (room.tenant ? [room.tenant] : [])),
    ...(home.wholeHomeTenant ? [home.wholeHomeTenant] : []),
  ];
  const rentInPence = currentTenants.reduce((sum, t) => sum + t.rentPence, 0);
  const ownerPence = home.owner?.rentPence ?? 0;
  const leftPence = rentInPence - ownerPence;
  const byRoom = home.rooms.length > 0;
  const roomsLet = home.rooms.filter((room) => room.tenant).length;
  const occupancy = byRoom
    ? `${roomsLet} of ${home.rooms.length}`
    : home.wholeHomeTenant
      ? "Let"
      : "Empty";
  const occupancyNote = byRoom
    ? `${home.rooms.length === 1 ? "room" : "rooms"} let`
    : "whole home";

  const showWholeHomeTenant = !byRoom || home.wholeHomeTenant !== null;

  return (
    <article className="flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/homes"
        className="inline-flex min-h-11 items-center gap-1 self-start text-base text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        All homes
      </Link>

      {home.archived ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-base font-medium">
            This home is archived. It is hidden from your list.
          </p>
          <RestoreHomeButton homeId={home.id} />
        </div>
      ) : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
              {byRoom ? (
                <DoorOpenIcon aria-hidden="true" className="size-4" />
              ) : (
                <HouseIcon aria-hidden="true" className="size-4" />
              )}
              {byRoom
                ? `Let by the room · ${home.rooms.length} ${home.rooms.length === 1 ? "room" : "rooms"}`
                : "Let as a whole home"}
            </span>
            {home.archived ? (
              <span className="rounded-full border px-3 py-1 text-sm font-medium">
                Archived
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight break-words">
            {home.name}
          </h1>
          {address ? (
            <address className="flex items-start gap-1.5 text-base text-muted-foreground not-italic">
              <MapPinIcon aria-hidden="true" className="mt-1 size-4 shrink-0" />
              <span>{address}</span>
            </address>
          ) : null}
        </div>
        <Link
          href={`/homes/${home.id}/edit`}
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "h-12 shrink-0 gap-2 px-6 text-base",
          )}
        >
          <PencilIcon aria-hidden="true" className="size-5" />
          Edit home
        </Link>
      </header>

      <HomePhotos
        homeId={home.id}
        homeName={home.name}
        photos={photos}
        readOnly={home.archived}
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Rent from tenants"
          value={formatPence(rentInPence)}
          note="a month"
        />
        <Stat
          label="Rent to owner"
          value={home.owner ? formatPence(ownerPence) : "None"}
          note={
            home.owner
              ? `due on the ${ordinal(home.owner.dueDay)}`
              : "you own this home"
          }
        />
        <Stat
          label="Left each month"
          value={formatPence(leftPence)}
          note="after the owner is paid"
          tone={leftPence > 0 ? "good" : leftPence < 0 ? "bad" : "default"}
        />
        <Stat label="Tenants" value={occupancy} note={occupancyNote} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="rounded-2xl border bg-card p-4 sm:p-6">
            <RoomList
              homeId={home.id}
              letType={home.letType}
              rooms={home.rooms}
              archivedRooms={home.archivedRooms}
              readOnly={home.archived}
            />
          </div>

          {/* Let as a whole home: the tenant is shown here, not against a room. */}
          {showWholeHomeTenant ? (
            <Panel id="tenant-heading" title="Tenant">
              {home.wholeHomeTenant ? (
                <Link
                  href={`/tenants/${home.wholeHomeTenant.id}`}
                  className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-medium break-words">
                      {home.wholeHomeTenant.name}
                    </span>
                    <span className="text-base text-muted-foreground">
                      {formatPence(home.wholeHomeTenant.rentPence)} a month, due
                      on the {ordinal(home.wholeHomeTenant.dueDay)}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-base text-muted-foreground">
                    Empty. This home has no tenant.
                  </p>
                  {!home.archived ? (
                    <Link
                      href={`/homes/${home.id}/tenants/new`}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-12 gap-2 px-6 text-base sm:self-start",
                      )}
                    >
                      <UserPlusIcon aria-hidden="true" className="size-5" />
                      Add a tenant
                    </Link>
                  ) : null}
                </div>
              )}
            </Panel>
          ) : null}

          {home.pastTenantCount > 0 ? (
            <details className="group rounded-2xl border bg-card p-4 sm:p-6">
              <summary className="min-h-11 cursor-pointer content-center text-base font-medium">
                Past tenants ({home.pastTenantCount})
              </summary>
              <ul className="mt-3 flex flex-col divide-y">
                {home.pastTenants.map((tenant) => (
                  <li key={tenant.id} className="flex flex-col py-3 text-base">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="inline-flex min-h-11 items-center self-start font-medium break-words underline underline-offset-4"
                    >
                      {tenant.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {tenant.roomName ? `${tenant.roomName}. ` : ""}Moved out
                      on {formatDate(tenant.endDate)}
                    </span>
                  </li>
                ))}
              </ul>
              {home.pastTenantCount > home.pastTenants.length ? (
                <p className="mt-3 text-base text-muted-foreground">
                  Showing the {home.pastTenants.length} most recent.
                </p>
              ) : null}
            </details>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <Panel id="owner-heading" title="Owner">
            {home.owner ? (
              <div className="flex flex-col gap-4 text-base">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserIcon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-medium break-words">
                    {home.owner.name}
                  </span>
                </div>
                {home.owner.phone ? (
                  <a
                    href={`tel:${home.owner.phone.replace(/\s+/g, "")}`}
                    className="inline-flex min-h-11 items-center gap-2 self-start font-medium underline underline-offset-4"
                  >
                    <PhoneIcon aria-hidden="true" className="size-4" />
                    {home.owner.phone}
                  </a>
                ) : null}
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Rent you pay the owner
                  </p>
                  <p className="font-medium">
                    {formatPence(home.owner.rentPence)} a month, due on the{" "}
                    {ordinal(home.owner.dueDay)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-base text-muted-foreground">
                You do not rent this home from an owner.
              </p>
            )}
          </Panel>

          {!home.archived ? (
            <section className="flex flex-col gap-2 rounded-2xl border border-dashed p-4 sm:p-6">
              <p className="text-base text-muted-foreground">
                Not letting this home any more? Archive it to hide it from your
                list. You can bring it back later.
              </p>
              <ArchiveHomeButton homeId={home.id} homeName={home.name} />
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
