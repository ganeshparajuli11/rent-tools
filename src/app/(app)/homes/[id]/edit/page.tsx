import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeEditForm } from "@/components/homes/home-edit-form";
import { penceToPoundsInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getHome } from "@/server/homes";

export const metadata: Metadata = { title: "Edit home" };

export default async function EditHomePage({
  params,
}: PageProps<"/homes/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const home = await getHome({ supabase, userId: user.id }, id);
  if (!home) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href={`/homes/${home.id}`}
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Back to {home.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit home</h1>
      <HomeEditForm
        homeId={home.id}
        activeRoomCount={home.rooms.length}
        defaultValues={{
          name: home.name,
          addressLine1: home.addressLine1,
          addressLine2: home.addressLine2 ?? "",
          city: home.city ?? "",
          postcode: home.postcode,
          letType: home.letType,
          roomCount: "",
          hasOwner: home.owner ? "yes" : "no",
          ownerName: home.owner?.name ?? "",
          ownerPhone: home.owner?.phone ?? "",
          ownerRent: home.owner ? penceToPoundsInput(home.owner.rentPence) : "",
          ownerDueDay: home.owner ? String(home.owner.dueDay) : "",
        }}
      />
    </div>
  );
}
