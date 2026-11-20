import { ChevronLeftIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RemoveTenantDetails } from "@/components/tenants/remove-tenant-details";
import {
  MoveOutButton,
  UndoMoveOutButton,
} from "@/components/tenants/tenant-move-out-buttons";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatDateUK, ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { hasRemovedDetails } from "@/lib/validation/data-rights";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { isOrganisationOwner } from "@/server/context";
import { getTenant } from "@/server/tenants";

export const metadata: Metadata = { title: "Tenant" };

export default async function TenantPage({
  params,
}: PageProps<"/tenants/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const tenant = await getTenant(ctx, id);
  if (!tenant) notFound();

  const movedOut = tenant.endDate !== null;
  const detailsRemoved = hasRemovedDetails(tenant);
  // Only owners can remove details; only asked once the tenant has moved out.
  const canRemoveDetails =
    movedOut &&
    !detailsRemoved &&
    (await isOrganisationOwner(ctx, tenant.organisationId));
  const place = tenant.room
    ? `${tenant.room.name}, ${tenant.home.name}`
    : tenant.home.name;

  return (
    <article className="flex max-w-3xl flex-col gap-8">
      <Link
        href={`/homes/${tenant.home.id}`}
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Back to {tenant.home.name}
      </Link>

      {tenant.endDate !== null ? (
        <div
          role="status"
          className="flex flex-col items-start gap-3 rounded-xl border bg-muted p-4"
        >
          <p className="text-base font-medium">
            This tenant moved out on {formatDate(tenant.endDate)}.
          </p>
          {detailsRemoved ? (
            <p className="text-base text-muted-foreground">
              Their personal details have been removed. Their rent and payments
              are kept.
            </p>
          ) : (
            <UndoMoveOutButton tenantId={tenant.id} />
          )}
        </div>
      ) : null}

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold break-words">{tenant.name}</h1>
          <p className="text-base text-muted-foreground">{place}</p>
        </div>
        {detailsRemoved ? null : (
          <Link
            href={`/tenants/${tenant.id}/edit`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 gap-2 px-6 text-base sm:self-start",
            )}
          >
            <PencilIcon aria-hidden="true" className="size-5" />
            Edit tenant
          </Link>
        )}
      </header>

      <section aria-labelledby="rent-heading" className="flex flex-col gap-2">
        <h2 id="rent-heading" className="text-xl font-semibold">
          Rent
        </h2>
        <dl className="grid gap-3 rounded-xl border p-4 text-base sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Rent</dt>
            <dd className="font-medium">
              {formatPence(tenant.rentPence)} a month, due on the{" "}
              {ordinal(tenant.dueDay)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Moved in</dt>
            <dd className="font-medium">{formatDateUK(tenant.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deposit</dt>
            <dd className="font-medium">
              {tenant.depositPence > 0
                ? formatPence(tenant.depositPence)
                : "No deposit"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="contact-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="contact-heading" className="text-xl font-semibold">
          Contact
        </h2>
        {tenant.phone || tenant.email ? (
          <dl className="grid gap-3 rounded-xl border p-4 text-base sm:grid-cols-2">
            {tenant.phone ? (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={`tel:${tenant.phone.replace(/\s+/g, "")}`}
                    className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                  >
                    {tenant.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {tenant.email ? (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${tenant.email}`}
                    className="inline-flex min-h-11 items-center font-medium break-all underline underline-offset-4"
                  >
                    {tenant.email}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-base text-muted-foreground">
            No phone number or email saved.
          </p>
        )}
      </section>

      {!movedOut ? (
        <section className="border-t pt-6">
          <MoveOutButton tenantId={tenant.id} tenantName={tenant.name} />
        </section>
      ) : null}

      {canRemoveDetails ? (
        <section
          aria-labelledby="privacy-heading"
          className="flex flex-col gap-3 border-t pt-6"
        >
          <h2 id="privacy-heading" className="text-xl font-semibold">
            Their personal details
          </h2>
          <p className="max-w-xl text-base text-muted-foreground">
            If {tenant.name} asks you to delete their details, you can remove
            them here. Their rent and payments stay for your accounts.
          </p>
          <RemoveTenantDetails tenantId={tenant.id} tenantName={tenant.name} />
        </section>
      ) : null}
    </article>
  );
}
