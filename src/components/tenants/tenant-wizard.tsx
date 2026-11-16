"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { createTenantAction } from "@/app/(app)/tenants/actions";
import { applyServerErrors } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  TENANT_STEP_FIELDS,
  tenantSchema,
  type TenantInput,
  type TenantValues,
} from "@/lib/validation/tenants";

import {
  TenantContactFields,
  TenantDepositFields,
  TenantRentFields,
} from "./tenant-fields";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Who is the tenant?",
  2: "What rent do they pay?",
  3: "Did they pay a deposit?",
};

function stepOf(field: string): Step {
  for (const step of [1, 2, 3] as const) {
    if ((TENANT_STEP_FIELDS[step] as readonly string[]).includes(field))
      return step;
  }
  return 1;
}

/**
 * "Add a tenant" in three short steps. One form holds every answer, so going
 * Back keeps what was typed. Each step is validated before moving on, and
 * the server checks everything again with the same schema.
 */
export function TenantWizard({
  homeId,
  roomId,
  today,
}: {
  homeId: string;
  roomId: string | null;
  /** Today's date in London ("YYYY-MM-DD"), worked out on the server. */
  today: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const form = useForm<TenantInput, unknown, TenantValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      rent: "",
      dueDay: "",
      startDate: today,
      deposit: "",
    },
    mode: "onTouched",
    shouldUnregister: false,
  });

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  async function goNext() {
    const fields = TENANT_STEP_FIELDS[
      step
    ] as readonly FieldPath<TenantInput>[];
    const valid = await form.trigger([...fields], { shouldFocus: true });
    if (valid && step < 3) setStep((step + 1) as Step);
  }

  async function save() {
    setFormError(null);
    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      const firstError = Object.keys(form.formState.errors)[0];
      if (firstError) setStep(stepOf(firstError));
      return;
    }

    const result = await createTenantAction(
      { homeId, roomId },
      form.getValues(),
    );
    if (result.ok) {
      toast.success("Tenant added");
      router.push(`/tenants/${result.data.id}`);
      return;
    }
    const firstField = applyServerErrors(form, result.fieldErrors);
    if (firstField) setStep(stepOf(firstField));
    setFormError(result.error);
  }

  async function skipDeposit() {
    form.setValue("deposit", "");
    form.clearErrors("deposit");
    await save();
  }

  const submitting = form.formState.isSubmitting;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      // Enter moves to the next step, and saves on the last one.
      onSubmit={form.handleSubmit(
        () => (step < 3 ? goNext() : save()),
        () => (step < 3 ? goNext() : save()),
      )}
    >
      <div className="flex flex-col gap-2">
        <p className="text-base text-muted-foreground" aria-live="polite">
          Step {step} of 3
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
        >
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold outline-none"
        >
          {STEP_TITLES[step]}
        </h2>
        {step === 3 ? (
          <p className="text-base text-muted-foreground">
            This step is optional.
          </p>
        ) : null}
      </div>

      {step === 1 ? <TenantContactFields form={form} /> : null}
      {step === 2 ? <TenantRentFields form={form} /> : null}
      {step === 3 ? <TenantDepositFields form={form} /> : null}

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-base"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base"
          disabled={submitting}
        >
          {step < 3 ? "Next" : submitting ? "Saving…" : "Save tenant"}
        </Button>
        {step === 3 ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            disabled={submitting}
            onClick={skipDeposit}
          >
            Skip this step and save
          </Button>
        ) : null}
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full gap-1 text-base"
            disabled={submitting}
            onClick={() => setStep((step - 1) as Step)}
          >
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
            Back
          </Button>
        ) : null}
      </div>
    </form>
  );
}
