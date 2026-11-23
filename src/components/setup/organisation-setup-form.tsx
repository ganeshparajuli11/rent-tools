"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { setUpOrganisationAction } from "@/app/(setup)/setup/actions";
import {
  applyServerErrors,
  ChoiceField,
  TextField,
} from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  ACCOUNT_TYPE_OPTIONS,
  ALREADY_SET_UP,
  type OrganisationSetupInput,
  organisationSetupSchema,
  type OrganisationSetupValues,
} from "@/lib/validation/organisation";

/**
 * The set-up form: the person's name, then the organisation's name, kind
 * of account and contact email. Checked in the browser for quick feedback
 * and again on the server (Zod) and in the database function.
 */
export function OrganisationSetupForm({
  defaultFullName,
  defaultContactEmail,
}: {
  defaultFullName: string;
  defaultContactEmail: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<
    OrganisationSetupInput,
    unknown,
    OrganisationSetupValues
  >({
    resolver: zodResolver(organisationSetupSchema),
    defaultValues: {
      fullName: defaultFullName,
      organisationName: "",
      accountType:
        undefined as unknown as OrganisationSetupInput["accountType"],
      contactEmail: defaultContactEmail,
    },
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await setUpOrganisationAction(values);
    if (result.ok) {
      toast.success("Your organisation is ready");
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    const firstField = applyServerErrors(form, result.fieldErrors);
    if (firstField) form.setFocus(firstField);
    setFormError(result.error);
    // Someone set it up in another tab: carry on to Today.
    if (result.error === ALREADY_SET_UP) {
      router.replace("/dashboard");
      router.refresh();
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <TextField
        form={form}
        name="fullName"
        label="Your full name"
        hint="Shown to people you work with in PropDesk."
        autoComplete="name"
      />
      <TextField
        form={form}
        name="organisationName"
        label="Organisation name"
        hint="Your business or trading name. Use your own name if you have none."
        autoComplete="organization"
      />
      <ChoiceField
        form={form}
        name="accountType"
        label="What kind of account is this?"
        options={ACCOUNT_TYPE_OPTIONS}
      />
      <TextField
        form={form}
        name="contactEmail"
        label="Contact email"
        hint="The organisation's main email address. It can be the one you sign in with."
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-12 w-full px-8 text-base sm:w-auto"
        disabled={submitting}
      >
        {submitting ? "Setting up…" : "Set up my organisation"}
      </Button>
    </form>
  );
}
