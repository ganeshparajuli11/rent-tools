"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { createHomeAction } from "@/app/(app)/homes/actions";
import { applyServerErrors } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  createHomeSchema,
  HOME_STEP_FIELDS,
  type CreateHomeInput,
  type CreateHomeValues,
} from "@/lib/validation/homes";

import {
  EMPTY_HOME_FORM,
  HomeDetailsFields,
  LetTypeFields,
  OwnerFields,
} from "./home-fields";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Where is the home?",
  2: "How do you let it?",
  3: "Do you rent it from an owner?",
};

function stepOf(field: string): Step {
  for (const step of [1, 2, 3] as const) {
    if ((HOME_STEP_FIELDS[step] as readonly string[]).includes(field))
      return step;
  }
  return 1;
}

/**
 * "Add a home" in three short steps. One form holds every answer, so going
 * Back keeps what was typed. Each step is validated before moving on, and
 * the server checks everything again with the same schema.
 */
export function HomeWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const form = useForm<CreateHomeInput, unknown, CreateHomeValues>({
    resolver: zodResolver(createHomeSchema),
    defaultValues: EMPTY_HOME_FORM,
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
    const fields = HOME_STEP_FIELDS[
      step
    ] as readonly FieldPath<CreateHomeInput>[];
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

    const result = await createHomeAction(form.getValues());
    if (result.ok) {
      toast.success("Home added");
      router.push(`/homes/${result.data.id}`);
      return;
    }
    const firstField = applyServerErrors(form, result.fieldErrors);
    if (firstField) setStep(stepOf(firstField));
    setFormError(result.error);
  }

  async function skipOwner() {
    form.setValue("hasOwner", "no");
    form.clearErrors(["ownerName", "ownerPhone", "ownerRent", "ownerDueDay"]);
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

      {step === 1 ? <HomeDetailsFields form={form} /> : null}
      {step === 2 ? <LetTypeFields form={form} /> : null}
      {step === 3 ? <OwnerFields form={form} /> : null}

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
          {step < 3 ? "Next" : submitting ? "Saving…" : "Save home"}
        </Button>
        {step === 3 ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            disabled={submitting}
            onClick={skipOwner}
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
