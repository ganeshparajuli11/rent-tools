"use client";

import { useActionState } from "react";

import { type AuthFormState, requestSignInCode } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function SignInForm() {
  const [state, formAction] = useActionState(requestSignInCode, initialState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <Field data-invalid={hasError || undefined}>
        <FieldLabel htmlFor="email" className="text-base">
          Your email address
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "email-error" : undefined}
          className="h-12 text-base"
        />
        <FieldError id="email-error">{state.error}</FieldError>
      </Field>
      <SubmitButton pendingText="Sending…">Send me a code</SubmitButton>
    </form>
  );
}
