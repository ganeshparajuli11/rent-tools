import { Building2Icon, MapPinIcon, PencilIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { secondaryActionClass } from "@/components/app/action-classes";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
} from "@/components/app/data-table";
import { FactChip, RecordHeader } from "@/components/app/record-header";
import { SectionCard } from "@/components/app/section-card";
import { StatCard, StatGrid } from "@/components/app/stat-card";
import { StatusPill } from "@/components/app/status-pill";
import {
  ArchiveOwnerButton,
  RestoreOwnerButton,
} from "@/components/owners/owner-archive-buttons";
import { formatDateUK, ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { homesCountLabel, ownerTypeLabel } from "@/lib/owners";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { getOwner } from "@/server/owners";

export const metadata: Metadata = { title: "Owner" };

/** One label and value inside a details card. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium break-words">{children}</dd>
    </div>
  );
}

/** An owner (record page template, docs/DESIGN_SYSTEM.md §3). */
export default async function OwnerPage({ params }: PageProps<"/owners/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [owner, canManage] = await Promise.all([
    getOwner(ctx, id),
    // Staff can look but not change (docs/DESIGN_SYSTEM.md §8).
    hasRoleAtLeast(ctx, "manager"),
  ]);
  if (!owner) notFound();

  const company = owner.ownerType === "company";
  const currentHomes = owner.homes.filter((home) => !home.archived).length;
  const currentLeases = owner.leases.filter((lease) => lease.endDate === null);
  const hasContact = Boolean(owner.phone || owner.email || owner.address);

  return (
    <article className="flex w-full max-w-5xl flex-col gap-6">
      <RecordHeader
        back={{ href: "/owners", label: "All owners" }}
        title={owner.name}
        avatarName={owner.name}
        chips={
          <>
            <FactChip icon={company ? <Building2Icon /> : <UserIcon />}>
              {ownerTypeLabel(owner.ownerType)}
            </FactChip>
            <FactChip>Owner · {homesCountLabel(currentHomes)}</FactChip>
            {owner.archived ? (
              <StatusPill tone="outline">Archived</StatusPill>
            ) : null}
          </>
        }
        subtitle={
          company && owner.fullName ? `Contact: ${owner.fullName}` : undefined
        }
        actions={
          canManage ? (
            <Link
              href={`/owners/${owner.id}/edit`}
              className={cn(secondaryActionClass, "w-full sm:w-auto")}
            >
              <PencilIcon aria-hidden="true" className="size-4.5" />
              Edit owner
            </Link>
          ) : null
        }
      />

      {owner.archived ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-base font-medium">
            This owner is archived. They are hidden from your list and cannot be
            linked to more homes.
          </p>
          {canManage ? <RestoreOwnerButton ownerId={owner.id} /> : null}
        </div>
      ) : null}

      <StatGrid>
        <StatCard
          label="Homes"
          value={String(currentHomes)}
          note={currentHomes === 1 ? "linked home" : "linked homes"}
        />
        <StatCard
          label="Rent you pay them"
          value={
            currentLeases.length > 0
              ? formatPence(owner.monthlyRentPence)
              : "None"
          }
          note={currentLeases.length > 0 ? "a month" : "no rent paid to them"}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard id="homes" title="Homes">
            {owner.homes.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Not linked to any home yet. Link them from a home&apos;s page,
                in its Owners card.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-divider">
                {owner.homes.map((home) => (
                  <li key={home.linkId} className="py-1 first:pt-0 last:pb-0">
                    <Link
                      href={`/homes/${home.id}`}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-[10px] py-2 hover:underline"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-base font-semibold break-words">
                          {home.name}
                        </span>
                        {home.address ? (
                          <span className="text-sm text-muted-foreground">
                            {home.address}
                          </span>
                        ) : null}
                      </span>
                      {home.archived ? (
                        <StatusPill tone="outline">Archived</StatusPill>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard id="rent-paid" title="Rent you pay them">
            {owner.leases.length === 0 ? (
              <p className="text-base text-muted-foreground">
                You do not pay this owner rent. If you rent a home from them,
                add it on the home&apos;s Edit page.
              </p>
            ) : (
              <DataTable
                caption="Rent you pay this owner, current first"
                minWidth="34rem"
                className="rounded-2xl"
              >
                <thead>
                  <tr>
                    <DataTableHead>Home</DataTableHead>
                    <DataTableHead align="right">A month</DataTableHead>
                    <DataTableHead>Due</DataTableHead>
                    <DataTableHead>From</DataTableHead>
                    <DataTableHead>To</DataTableHead>
                  </tr>
                </thead>
                <tbody>
                  {owner.leases.map((lease) => (
                    <tr key={lease.id}>
                      <DataTableHead scope="row">
                        <Link
                          href={`/homes/${lease.homeId}`}
                          className="inline-flex min-h-10 items-center hover:underline"
                        >
                          {lease.homeName}
                        </Link>
                      </DataTableHead>
                      <DataTableCell align="right">
                        {formatPence(lease.rentPence)}
                      </DataTableCell>
                      <DataTableCell>The {ordinal(lease.dueDay)}</DataTableCell>
                      <DataTableCell>
                        {formatDateUK(lease.startDate)}
                      </DataTableCell>
                      <DataTableCell>
                        {lease.endDate ? (
                          formatDateUK(lease.endDate)
                        ) : (
                          <StatusPill tone="good">Current</StatusPill>
                        )}
                      </DataTableCell>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </div>

        <aside className="flex flex-col gap-6">
          <SectionCard id="contact" title="Contact">
            {hasContact ? (
              <dl className="flex flex-col gap-4">
                {owner.phone ? (
                  <Detail label="Phone">
                    <a
                      href={`tel:${owner.phone.replace(/\s+/g, "")}`}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                    >
                      {owner.phone}
                    </a>
                  </Detail>
                ) : null}
                {owner.email ? (
                  <Detail label="Email">
                    <a
                      href={`mailto:${owner.email}`}
                      className="inline-flex min-h-11 items-center break-all underline underline-offset-4"
                    >
                      {owner.email}
                    </a>
                  </Detail>
                ) : null}
                {owner.address ? (
                  <Detail label="Address">
                    <span className="flex items-start gap-1.5">
                      <MapPinIcon
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-muted-foreground"
                      />
                      <span>{owner.address}</span>
                    </span>
                  </Detail>
                ) : null}
              </dl>
            ) : (
              <p className="text-base text-muted-foreground">
                No contact details saved.
              </p>
            )}
          </SectionCard>

          <SectionCard id="notes" title="Notes">
            {owner.notes ? (
              <p className="text-base whitespace-pre-line">{owner.notes}</p>
            ) : (
              <p className="text-base text-muted-foreground">No notes.</p>
            )}
          </SectionCard>

          {!owner.archived && canManage ? (
            <section className="flex flex-col gap-2 rounded-[20px] border border-dashed border-border p-4 sm:p-6">
              <p className="text-base text-muted-foreground">
                No longer working with this owner? Archive them to hide them
                from your list. Their homes and rent history are kept.
              </p>
              <ArchiveOwnerButton ownerId={owner.id} ownerName={owner.name} />
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
