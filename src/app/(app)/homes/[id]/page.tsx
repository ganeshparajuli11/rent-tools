import { ChevronLeftIcon, PencilIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArchiveHomeButton,
  RestoreHomeButton,
} from "@/components/homes/home-archive-buttons";
import { RoomList } from "@/components/homes/room-list";
import { buttonVariants } from "@/components/ui/button";
import { ordinal } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getHome } from "@/server/homes";

export const metadata: Metadata = { title: "Home" };

export default async function HomeDetailPage({
  params,
}: PageProps<"/homes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const home = await getHome({ supabase, userId: user.id }, id);
  if (!home) notFound();

  const addressLines = [
    home.addressLine1,
    home.addressLine2,
    home.city,
    home.postcode,
  ].filter(Boolean);

  return (
    <article className="flex flex-col gap-8">
      <Link
        href="/homes"
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        All homes
      </Link>

      {home.archived ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border bg-muted p-4"
        >
          <p className="text-base font-medium">
            This home is archived. It is hidden from your list.
          </p>
          <RestoreHomeButton homeId={home.id} />
        </div>
      ) : null}

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{home.name}</h1>
          <address className="text-base text-muted-foreground not-italic">
            {addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </div>
        <Link
          href={`/homes/${home.id}/edit`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 gap-2 px-6 text-base sm:self-start",
          )}
        >
          <PencilIcon aria-hidden="true" className="size-5" />
          Edit home
        </Link>
      </header>

      <section aria-labelledby="owner-heading" className="flex flex-col gap-2">
        <h2 id="owner-heading" className="text-xl font-semibold">
          Owner
        </h2>
        {home.owner ? (
          <dl className="grid gap-3 rounded-xl border p-4 text-base sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{home.owner.name}</dd>
            </div>
            {home.owner.phone ? (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={`tel:${home.owner.phone.replace(/\s+/g, "")}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {home.owner.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Rent you pay the owner</dt>
              <dd className="font-medium">
                {formatPence(home.owner.rentPence)} a month, due on the{" "}
                {ordinal(home.owner.dueDay)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-base text-muted-foreground">
            You do not rent this home from an owner.
          </p>
        )}
      </section>

      <RoomList
        homeId={home.id}
        letType={home.letType}
        rooms={home.rooms}
        archivedRooms={home.archivedRooms}
        readOnly={home.archived}
      />

      <section
        aria-labelledby="tenants-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="tenants-heading" className="text-xl font-semibold">
          Tenants
        </h2>
        <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
          <UsersIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-base text-muted-foreground">
            Tenants are coming next. Soon you will be able to add a tenant to
            each room and track their rent here.
          </p>
        </div>
      </section>

      {!home.archived ? (
        <section className="border-t pt-6">
          <ArchiveHomeButton homeId={home.id} homeName={home.name} />
        </section>
      ) : null}
    </article>
  );
}
