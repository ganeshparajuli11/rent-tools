import { ChevronLeftIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  MoveOutButton,
  UndoMoveOutButton,
} from "@/components/tenants/tenant-move-out-buttons";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getTenant } from "@/server/tenants";

export const metadata: Metadata = { title: "Tenant" };

export default async function TenantPage({
  params,
}: PageProps<"/tenants/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const tenant = await getTenant({ supabase, userId: user.id }, id);
  if (!tenant) notFound();

  const movedOut = tenant.endDate !== null;
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
          <UndoMoveOutButton tenantId={tenant.id} />
        </div>
      ) : null}

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold break-words">{tenant.name}</h1>
          <p className="text-base text-muted-foreground">{place}</p>
        </div>
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
            <dd className="font-medium">{formatDate(tenant.startDate)}</dd>
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
    </article>
  );
}
