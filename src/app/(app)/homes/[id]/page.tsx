import {
  DoorOpenIcon,
  HouseIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  UserPlusIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  primaryActionClass,
  secondaryActionClass,
} from "@/components/app/action-classes";
import { Avatar } from "@/components/app/avatar";
import { FactChip, RecordHeader } from "@/components/app/record-header";
import { RecordTabs } from "@/components/app/record-tabs";
import { SectionCard } from "@/components/app/section-card";
import { StatCard, StatGrid } from "@/components/app/stat-card";
import { StatusPill } from "@/components/app/status-pill";
import {
  ArchiveHomeButton,
  RestoreHomeButton,
} from "@/components/homes/home-archive-buttons";
import { HomePhotos } from "@/components/homes/home-photos";
import { RoomList } from "@/components/homes/room-list";
import { formatDate, ordinal } from "@/lib/dates";
import { homeStatus } from "@/lib/home-status";
import { formatPence } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { getHome } from "@/server/homes";
import { listHomePhotos } from "@/server/photos";

export const metadata: Metadata = { title: "Home" };

const TABS = ["overview", "photos"] as const;
type Tab = (typeof TABS)[number];

function parseTab(value: string | string[] | undefined): Tab {
  const text = Array.isArray(value) ? value[0] : value;
  return TABS.find((tab) => tab === text) ?? "overview";
}

/** A home (record page template, docs/DESIGN_SYSTEM.md §3). */
export default async function HomeDetailPage({
  params,
  searchParams,
}: PageProps<"/homes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const tab = parseTab((await searchParams).tab);

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [home, photos, canManage] = await Promise.all([
    getHome(ctx, id),
    listHomePhotos(ctx, id),
    // Staff can look but not change (docs/DESIGN_SYSTEM.md §8).
    hasRoleAtLeast(ctx, "manager"),
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
  const status = homeStatus({
    archived: home.archived,
    roomCount: home.rooms.length,
    roomsLet,
    wholeHomeLet: home.wholeHomeTenant !== null,
  });

  const showWholeHomeTenant = !byRoom || home.wholeHomeTenant !== null;
  const coverUrl = photos.find((photo) => photo.url)?.url ?? null;
  const homeId = home.id;
  const tabHref = (to: Tab) =>
    to === "overview" ? `/homes/${homeId}` : `/homes/${homeId}?tab=${to}`;

  return (
    <article className="flex w-full max-w-5xl flex-col gap-6">
      <RecordHeader
        back={{ href: "/homes", label: "All homes" }}
        title={home.name}
        photoUrl={coverUrl}
        chips={
          <>
            <FactChip icon={byRoom ? <DoorOpenIcon /> : <HouseIcon />}>
              {byRoom
                ? `Let by the room · ${home.rooms.length} ${home.rooms.length === 1 ? "room" : "rooms"}`
                : "Let as a whole home"}
            </FactChip>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </>
        }
        subtitle={
          address ? (
            <address className="flex items-start gap-1.5 not-italic">
              <MapPinIcon
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-muted-foreground"
              />
              <span>{address}</span>
            </address>
          ) : null
        }
        actions={
          canManage ? (
            <Link
              href={`/homes/${home.id}/edit`}
              className={cn(secondaryActionClass, "w-full sm:w-auto")}
            >
              <PencilIcon aria-hidden="true" className="size-4.5" />
              Edit home
            </Link>
          ) : null
        }
      />

      {home.archived ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-base font-medium">
            This home is archived. It is hidden from your list.
          </p>
          {canManage ? <RestoreHomeButton homeId={home.id} /> : null}
        </div>
      ) : null}

      <RecordTabs
        label="Sections of this home"
        tabs={[
          {
            label: "Overview",
            href: tabHref("overview"),
            active: tab === "overview",
          },
          {
            label: "Photos",
            href: tabHref("photos"),
            active: tab === "photos",
            count: photos.length,
          },
        ]}
      />

      {tab === "photos" ? (
        <div className="rounded-[20px] border border-border bg-surface p-4 sm:p-6">
          <HomePhotos
            homeId={home.id}
            homeName={home.name}
            photos={photos}
            readOnly={home.archived || !canManage}
          />
        </div>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label="Rent from tenants"
              value={formatPence(rentInPence)}
              note="a month"
            />
            <StatCard
              label="Rent to owner"
              value={home.owner ? formatPence(ownerPence) : "None"}
              note={
                home.owner
                  ? `due on the ${ordinal(home.owner.dueDay)}`
                  : "you own this home"
              }
            />
            <StatCard
              label="Left each month"
              value={formatPence(leftPence)}
              note="after the owner is paid"
              tone={leftPence > 0 ? "good" : leftPence < 0 ? "bad" : "default"}
            />
            <StatCard label="Tenants" value={occupancy} note={occupancyNote} />
          </StatGrid>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="rounded-[20px] border border-border bg-surface p-4 sm:p-6">
                <RoomList
                  homeId={home.id}
                  letType={home.letType}
                  rooms={home.rooms}
                  archivedRooms={home.archivedRooms}
                  readOnly={home.archived || !canManage}
                />
              </div>

              {/* Let as a whole home: the tenant is shown here, not against a room. */}
              {showWholeHomeTenant ? (
                <SectionCard id="tenant" title="Tenant">
                  {home.wholeHomeTenant ? (
                    <Link
                      href={`/tenants/${home.wholeHomeTenant.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border p-4 transition-colors hover:bg-canvas"
                    >
                      <Avatar name={home.wholeHomeTenant.name} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-base font-semibold break-words">
                          {home.wholeHomeTenant.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatPence(home.wholeHomeTenant.rentPence)} a month,
                          due on the {ordinal(home.wholeHomeTenant.dueDay)}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-base text-muted-foreground">
                        Empty. This home has no tenant.
                      </p>
                      {!home.archived && canManage ? (
                        <Link
                          href={`/homes/${home.id}/tenants/new`}
                          className={cn(primaryActionClass, "sm:self-start")}
                        >
                          <UserPlusIcon
                            aria-hidden="true"
                            className="size-4.5"
                          />
                          Add a tenant
                        </Link>
                      ) : null}
                    </div>
                  )}
                </SectionCard>
              ) : null}

              {home.pastTenantCount > 0 ? (
                <details className="group rounded-[20px] border border-border bg-surface p-4 sm:p-6">
                  <summary className="min-h-11 cursor-pointer content-center text-base font-semibold">
                    Past tenants ({home.pastTenantCount})
                  </summary>
                  <ul className="mt-3 flex flex-col divide-y divide-divider">
                    {home.pastTenants.map((tenant) => (
                      <li
                        key={tenant.id}
                        className="flex flex-col py-3 text-base"
                      >
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="inline-flex min-h-11 items-center self-start font-medium break-words underline underline-offset-4"
                        >
                          {tenant.name}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          {tenant.roomName ? `${tenant.roomName}. ` : ""}Moved
                          out on {formatDate(tenant.endDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {home.pastTenantCount > home.pastTenants.length ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Showing the {home.pastTenants.length} most recent.
                    </p>
                  ) : null}
                </details>
              ) : null}
            </div>

            <aside className="flex flex-col gap-6">
              <SectionCard id="owner" title="Owner">
                {home.owner ? (
                  <div className="flex flex-col gap-4 text-base">
                    <div className="flex items-center gap-3">
                      <Avatar name={home.owner.name} />
                      <span className="font-semibold break-words">
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
                    <div className="rounded-xl bg-subtle p-3">
                      <p className="text-[13px] text-muted-foreground">
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
              </SectionCard>

              {!home.archived && canManage ? (
                <section className="flex flex-col gap-2 rounded-[20px] border border-dashed border-border p-4 sm:p-6">
                  <p className="text-base text-muted-foreground">
                    Not letting this home any more? Archive it to hide it from
                    your list. You can bring it back later.
                  </p>
                  <ArchiveHomeButton homeId={home.id} homeName={home.name} />
                </section>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </article>
  );
}
