import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TenantEditForm } from "@/components/tenants/tenant-edit-form";
import { penceToPoundsInput } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/homes";
import { requireUser } from "@/server/auth";
import { getTenant } from "@/server/tenants";

export const metadata: Metadata = { title: "Edit tenant" };

export default async function EditTenantPage({
  params,
}: PageProps<"/tenants/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const tenant = await getTenant({ supabase, userId: user.id }, id);
  if (!tenant) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href={`/tenants/${tenant.id}`}
        className="inline-flex min-h-11 items-center gap-1 self-start text-base underline-offset-4 hover:underline"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        Back to {tenant.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit tenant</h1>
      <TenantEditForm
        tenantId={tenant.id}
        defaultValues={{
          name: tenant.name,
          phone: tenant.phone ?? "",
          email: tenant.email ?? "",
          rent: penceToPoundsInput(tenant.rentPence),
          dueDay: String(tenant.dueDay),
          startDate: tenant.startDate,
          deposit:
            tenant.depositPence > 0
              ? penceToPoundsInput(tenant.depositPence)
              : "",
        }}
      />
    </div>
  );
}
