import { PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { secondaryActionClass } from "@/components/app/action-classes";
import { FactChip, RecordHeader } from "@/components/app/record-header";
import { SectionCard } from "@/components/app/section-card";
import { StatusPill } from "@/components/app/status-pill";
import { RemoveTenantDetails } from "@/components/tenants/remove-tenant-details";
import {
  MoveOutButton,
  UndoMoveOutButton,
} from "@/components/tenants/tenant-move-out-buttons";
import { formatDate, formatDateUK, ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { hasRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { hasRemovedDetails } from "@/lib/validation/data-rights";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getMembership } from "@/server/context";
import { getTenant } from "@/server/tenants";

export const metadata: Metadata = { title: "Tenant" };

/** One label and value inside a details card. */
function Detail({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", wide && "sm:col-span-2")}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium">{children}</dd>
    </div>
  );
}

/** A tenant (record page template, docs/DESIGN_SYSTEM.md §3). */
export default async function TenantPage({
  params,
}: PageProps<"/tenants/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [tenant, membership] = await Promise.all([
    getTenant(ctx, id),
    getMembership(ctx),
  ]);
  if (!tenant) notFound();

  const movedOut = tenant.endDate !== null;
  const detailsRemoved = hasRemovedDetails(tenant);
  // Staff can look but not change (docs/DESIGN_SYSTEM.md §8).
  const canManage = hasRole(membership.role, "manager");
  // Only owners can remove details; only asked once the tenant has moved out.
  const canRemoveDetails =
    movedOut &&
    !detailsRemoved &&
    membership.organisationId === tenant.organisationId &&
    hasRole(membership.role, "owner");
  const place = tenant.room
    ? `${tenant.room.name}, ${tenant.home.name}`
    : tenant.home.name;

  return (
    <article className="flex w-full max-w-5xl flex-col gap-6">
      <RecordHeader
        back={{
          href: `/homes/${tenant.home.id}`,
          label: `Back to ${tenant.home.name}`,
        }}
        title={tenant.name}
        avatarName={detailsRemoved ? undefined : tenant.name}
        chips={
          <>
            <FactChip>Tenant</FactChip>
            {movedOut ? (
              <StatusPill tone="outline">Moved out</StatusPill>
            ) : (
              <StatusPill tone="good">Current</StatusPill>
            )}
          </>
        }
        subtitle={place}
        actions={
          detailsRemoved || !canManage ? null : (
            <Link
              href={`/tenants/${tenant.id}/edit`}
              className={cn(secondaryActionClass, "w-full sm:w-auto")}
            >
              <PencilIcon aria-hidden="true" className="size-4.5" />
              Edit tenant
            </Link>
          )
        }
      />

      {tenant.endDate !== null ? (
        <div
          role="status"
          className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-subtle p-4"
        >
          <p className="text-base font-medium">
            This tenant moved out on {formatDate(tenant.endDate)}.
          </p>
          {detailsRemoved ? (
            <p className="text-base text-muted-foreground">
              Their personal details have been removed. Their rent and payments
              are kept.
            </p>
          ) : canManage ? (
            <UndoMoveOutButton tenantId={tenant.id} />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard id="rent" title="Rent">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Rent" wide>
                {formatPence(tenant.rentPence)} a month, due on the{" "}
                {ordinal(tenant.dueDay)}
              </Detail>
              <Detail label="Moved in">{formatDateUK(tenant.startDate)}</Detail>
              <Detail label="Deposit">
                {tenant.depositPence > 0
                  ? formatPence(tenant.depositPence)
                  : "No deposit"}
              </Detail>
            </dl>
          </SectionCard>

          {!movedOut && canManage ? (
            <section className="flex flex-col gap-2 rounded-[20px] border border-dashed border-border p-4 sm:p-6">
              <MoveOutButton tenantId={tenant.id} tenantName={tenant.name} />
            </section>
          ) : null}

          {canRemoveDetails ? (
            <section
              aria-labelledby="privacy-heading"
              className="flex flex-col gap-3 rounded-[20px] border border-dashed border-border p-4 sm:p-6"
            >
              <h2
                id="privacy-heading"
                className="text-xl font-semibold tracking-[-0.02em]"
              >
                Their personal details
              </h2>
              <p className="max-w-xl text-base text-muted-foreground">
                If {tenant.name} asks you to delete their details, you can
                remove them here. Their rent and payments stay for your
                accounts.
              </p>
              <RemoveTenantDetails
                tenantId={tenant.id}
                tenantName={tenant.name}
              />
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <SectionCard id="contact" title="Contact">
            {tenant.phone || tenant.email ? (
              <dl className="flex flex-col gap-4">
                {tenant.phone ? (
                  <Detail label="Phone">
                    <a
                      href={`tel:${tenant.phone.replace(/\s+/g, "")}`}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                    >
                      {tenant.phone}
                    </a>
                  </Detail>
                ) : null}
                {tenant.email ? (
                  <Detail label="Email">
                    <a
                      href={`mailto:${tenant.email}`}
                      className="inline-flex min-h-11 items-center break-all underline underline-offset-4"
                    >
                      {tenant.email}
                    </a>
                  </Detail>
                ) : null}
              </dl>
            ) : (
              <p className="text-base text-muted-foreground">
                No phone number or email saved.
              </p>
            )}
          </SectionCard>
        </aside>
      </div>
    </article>
  );
}
