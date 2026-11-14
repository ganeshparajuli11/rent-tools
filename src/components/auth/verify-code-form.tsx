"use client";

import { useActionState } from "react";

import {
  type AuthFormState,
  resendSignInCode,
  verifySignInCode,
} from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function VerifyCodeForm() {
  const [state, formAction] = useActionState(verifySignInCode, initialState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <Field data-invalid={hasError || undefined}>
        <FieldLabel htmlFor="code" className="text-base">
          Code from the email
        </FieldLabel>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={14}
          required
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "code-error" : undefined}
          className="h-14 text-center text-2xl tracking-[0.3em]"
        />
        <FieldError id="code-error">{state.error}</FieldError>
      </Field>
      <SubmitButton pendingText="Checking…">Sign in</SubmitButton>
    </form>
  );
}

export function ResendCodeForm() {
  const [state, formAction] = useActionState(resendSignInCode, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <SubmitButton variant="outline" pendingText="Sending…">
        Send me a new code
      </SubmitButton>
      {state.notice ? (
        <p role="status" className="text-center text-base">
          {state.notice}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-center text-base text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
