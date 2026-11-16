"use client";

import type { UseFormReturn } from "react-hook-form";

import { DueDayField, TextField } from "@/components/form-fields";
import type { TenantInput } from "@/lib/validation/tenants";

/**
 * Field groups shared by "Add a tenant" (one group per step) and
 * "Edit tenant" (all groups on one page).
 */
export type TenantForm = UseFormReturn<TenantInput, unknown, unknown>;
type FormProp = { form: Pick<TenantForm, "register" | "formState"> };

export function TenantContactFields({ form }: FormProp) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        form={form}
        name="name"
        label="Tenant's name"
        autoComplete="off"
      />
      <TextField
        form={form}
        name="phone"
        label="Phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="off"
      />
      <TextField
        form={form}
        name="email"
        label="Email (optional)"
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
      />
    </div>
  );
}

export function TenantRentFields({
  form,
  rentHint = "For example 550 or 550.50",
}: FormProp & { rentHint?: string }) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        form={form}
        name="rent"
        label="Rent each month, in pounds"
        hint={rentHint}
        inputMode="decimal"
        autoComplete="off"
        className="sm:max-w-60"
      />
      <DueDayField
        form={form}
        name="dueDay"
        label="Day of the month rent is due"
      />
      <TextField
        form={form}
        name="startDate"
        label="Date they moved in"
        hint="If they have not moved in yet, choose the day they will."
        type="date"
        autoComplete="off"
        className="sm:max-w-60"
      />
    </div>
  );
}

export function TenantDepositFields({ form }: FormProp) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        form={form}
        name="deposit"
        label="Deposit, in pounds (optional)"
        hint="Leave this empty if they did not pay a deposit."
        inputMode="decimal"
        autoComplete="off"
        className="sm:max-w-60"
      />
    </div>
  );
}
