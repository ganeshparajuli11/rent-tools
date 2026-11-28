"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createOwnerAction,
  updateOwnerAction,
} from "@/app/(app)/owners/actions";
import {
  applyServerErrors,
  ChoiceField,
  TextAreaField,
  TextField,
} from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  MAX_OWNER_NOTES,
  ownerSchema,
  type OwnerInput,
  type OwnerValues,
} from "@/lib/validation/owners";

/**
 * "Add an owner" and "Edit owner" (form template, docs/DESIGN_SYSTEM.md
 * §3): one narrow column, labels above inputs, Save and Cancel at the
 * bottom. From a home page (`homeId`), the new owner is linked to it.
 */
export function OwnerForm({
  mode,
  ownerId,
  homeId,
  defaultValues,
  cancelHref,
}: {
  mode: "create" | "edit";
  /** Required when editing. */
  ownerId?: string;
  /** "Add a new owner" from a home: link them to it. */
  homeId?: string | null;
  defaultValues: OwnerInput;
  cancelHref: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<OwnerInput, unknown, OwnerValues>({
    resolver: zodResolver(ownerSchema),
    defaultValues,
    mode: "onTouched",
  });
  const company = form.watch("ownerType") === "company";

  const onSubmit = form.handleSubmit(async () => {
    setFormError(null);
    const values = form.getValues();
    if (mode === "edit" && ownerId) {
      const result = await updateOwnerAction(ownerId, values);
      if (result.ok) {
        toast.success("Changes saved");
        router.push(`/owners/${ownerId}`);
        return;
      }
      applyServerErrors(form, result.fieldErrors);
      setFormError(result.error);
      return;
    }

    const result = await createOwnerAction(values, homeId ?? "");
    if (result.ok) {
      toast.success(
        result.data.homeId ? "Owner added and linked" : "Owner added",
      );
      router.push(
        result.data.homeId
          ? `/homes/${result.data.homeId}`
          : `/owners/${result.data.id}`,
      );
      return;
    }
    applyServerErrors(form, result.fieldErrors);
    setFormError(result.error);
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-10">
      <section aria-labelledby="owner-who" className="flex flex-col gap-5">
        <h2 id="owner-who" className="text-xl font-semibold">
          Who owns the home?
        </h2>
        <ChoiceField
          form={form}
          name="ownerType"
          label="Is the owner a person or a company?"
          options={[
            { value: "individual", label: "A person" },
            {
              value: "company",
              label: "A company",
              description: "For example a limited company or a trust.",
            },
          ]}
        />
        {company ? (
          <TextField
            form={form}
            name="companyName"
            label="Company name"
            autoComplete="off"
          />
        ) : null}
        <TextField
          form={form}
          name="fullName"
          label={company ? "Contact name (optional)" : "Full name"}
          hint={company ? "The person you deal with there." : undefined}
          autoComplete="off"
        />
      </section>

      <section aria-labelledby="owner-contact" className="flex flex-col gap-5">
        <h2 id="owner-contact" className="text-xl font-semibold">
          Contact details
        </h2>
        <p className="-mt-2 text-base text-muted-foreground">
          All optional. Only add what you need to reach them.
        </p>
        <TextField
          form={form}
          name="email"
          label="Email (optional)"
          type="email"
          inputMode="email"
          autoComplete="off"
        />
        <TextField
          form={form}
          name="phone"
          label="Phone (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          className="sm:max-w-72"
        />
        <TextField
          form={form}
          name="addressLine1"
          label="Address line 1 (optional)"
          autoComplete="off"
        />
        <TextField
          form={form}
          name="addressLine2"
          label="Address line 2 (optional)"
          autoComplete="off"
        />
        <TextField
          form={form}
          name="city"
          label="Town or city (optional)"
          autoComplete="off"
        />
        <TextField
          form={form}
          name="postcode"
          label="Postcode (optional)"
          autoComplete="off"
          className="sm:max-w-48"
        />
      </section>

      <section aria-labelledby="owner-notes" className="flex flex-col gap-5">
        <h2 id="owner-notes" className="text-xl font-semibold">
          Notes
        </h2>
        <TextAreaField
          form={form}
          name="notes"
          label="Notes (optional)"
          hint={`For example how they like to be paid or contacted. Up to ${MAX_OWNER_NOTES.toLocaleString("en-GB")} characters. No bank details.`}
        />
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
          {submitting
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Save owner"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full px-8 text-base sm:w-auto"
          disabled={submitting}
          onClick={() => router.push(cancelHref)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
