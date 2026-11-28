import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RoleNotice } from "@/components/app/role-notice";
import { OwnerForm } from "@/components/owners/owner-form";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { getOwner } from "@/server/owners";

export const metadata: Metadata = { title: "Edit owner" };

export default async function EditOwnerPage({
  params,
}: PageProps<"/owners/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [owner, canEdit] = await Promise.all([
    getOwner(ctx, id),
    hasRoleAtLeast(ctx, "manager"),
  ]);
  if (!owner) notFound();

  const back = { href: `/owners/${owner.id}`, label: `Back to ${owner.name}` };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        {back.label}
      </Link>
      <h1 className="text-2xl font-semibold">Edit owner</h1>
      {!canEdit ? (
        <RoleNotice min="manager" back={back} />
      ) : (
        <OwnerForm
          mode="edit"
          ownerId={owner.id}
          cancelHref={back.href}
          defaultValues={{
            ownerType: owner.ownerType,
            fullName: owner.fullName ?? "",
            companyName: owner.companyName ?? "",
            email: owner.email ?? "",
            phone: owner.phone ?? "",
            addressLine1: owner.addressLine1 ?? "",
            addressLine2: owner.addressLine2 ?? "",
            city: owner.city ?? "",
            postcode: owner.postcode ?? "",
            notes: owner.notes ?? "",
          }}
        />
      )}
    </div>
  );
}
