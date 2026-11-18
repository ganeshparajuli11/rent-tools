"use client";

import { useActionState } from "react";

import {
  type AuthFormState,
  signInWithTestPassword,
} from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

/** Test-only: sign in to the demo account with a password. */
export function TestPasswordForm() {
  const [state, formAction] = useActionState(
    signInWithTestPassword,
    initialState,
  );
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="test-email" className="text-base">
          Test email
        </FieldLabel>
        <Input
          id="test-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          className="h-12 text-base"
        />
      </Field>
      <Field data-invalid={hasError || undefined}>
        <FieldLabel htmlFor="test-password" className="text-base">
          Test password
        </FieldLabel>
        <Input
          id="test-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "test-password-error" : undefined}
          className="h-12 text-base"
        />
        <FieldError id="test-password-error">{state.error}</FieldError>
      </Field>
      <SubmitButton pendingText="Signing in…" variant="outline">
        Sign in with password
      </SubmitButton>
    </form>
  );
}
