"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateTenantAction } from "@/app/(app)/tenants/actions";
import { applyServerErrors } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  tenantSchema,
  type TenantInput,
  type TenantValues,
} from "@/lib/validation/tenants";

import {
  TenantContactFields,
  TenantDepositFields,
  TenantRentFields,
} from "./tenant-fields";

/** "Edit tenant": the same fields as the add flow, on one page. */
export function TenantEditForm({
  tenantId,
  defaultValues,
}: {
  tenantId: string;
  defaultValues: TenantInput;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TenantInput, unknown, TenantValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues,
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(async () => {
    setFormError(null);
    const result = await updateTenantAction(tenantId, form.getValues());
    if (result.ok) {
      toast.success("Changes saved");
      router.push(`/tenants/${tenantId}`);
      return;
    }
    applyServerErrors(form, result.fieldErrors);
    setFormError(result.error);
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-10">
      <section aria-labelledby="edit-who" className="flex flex-col gap-4">
        <h2 id="edit-who" className="text-xl font-semibold">
          Who is the tenant?
        </h2>
        <TenantContactFields form={form} />
      </section>

      <section aria-labelledby="edit-rent" className="flex flex-col gap-4">
        <h2 id="edit-rent" className="text-xl font-semibold">
          Rent
        </h2>
        <TenantRentFields
          form={form}
          rentHint="A new amount is used from now on. Months already recorded keep the old amount."
        />
      </section>

      <section aria-labelledby="edit-deposit" className="flex flex-col gap-4">
        <h2 id="edit-deposit" className="text-xl font-semibold">
          Deposit
        </h2>
        <TenantDepositFields form={form} />
      </section>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full px-8 text-base sm:w-auto"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full px-8 text-base sm:w-auto"
          disabled={submitting}
          onClick={() => router.push(`/tenants/${tenantId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
