"use client";

import { useActionState } from "react";

import {
  type AuthFormState,
  requestPasswordReset,
  setNewPassword,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

/**
 * The email-and-password forms: sign in, create an account, ask for a
 * reset link, and choose a new password. Each posts to a server action in
 * src/app/(auth)/actions.ts, which validates, rate limits and talks to
 * Supabase Auth. Errors come back in plain words under the box they are
 * about.
 */

const initialState: AuthFormState = {};

/** The error for one box, or undefined. Errors with no box go to email. */
function errorFor(
  state: AuthFormState,
  field: NonNullable<AuthFormState["field"]>,
): string | undefined {
  if (!state.error) return undefined;
  return (state.field ?? "email") === field ? state.error : undefined;
}

function EmailField({ id, state }: { id: string; state: AuthFormState }) {
  const error = errorFor(state, "email");
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-base">
        Email address
      </FieldLabel>
      <Input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.email}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 text-base"
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  hint,
  error,
}: {
  id: string;
  name: "password" | "confirm";
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
}) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-base">
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-12 text-base"
      />
      {hint ? (
        <FieldDescription id={`${id}-hint`} className="text-base">
          {hint}
        </FieldDescription>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

const NEW_PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. A few words you will remember works well.`;

export function PasswordSignInForm() {
  const [state, formAction] = useActionState(signInWithPassword, initialState);
  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <EmailField id="email" state={state} />
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        error={errorFor(state, "password")}
      />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpWithPassword, initialState);
  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <EmailField id="email" state={state} />
      <PasswordField
        id="password"
        name="password"
        label="Choose a password"
        autoComplete="new-password"
        hint={NEW_PASSWORD_HINT}
        error={errorFor(state, "password")}
      />
      <SubmitButton pendingText="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialState,
  );
  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <EmailField id="email" state={state} />
      <SubmitButton pendingText="Sending…">Send me a reset link</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, formAction] = useActionState(setNewPassword, initialState);
  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <PasswordField
        id="password"
        name="password"
        label="New password"
        autoComplete="new-password"
        hint={NEW_PASSWORD_HINT}
        error={errorFor(state, "password")}
      />
      <PasswordField
        id="confirm"
        name="confirm"
        label="Type it again"
        autoComplete="new-password"
        error={
          errorFor(state, "confirm") ??
          (state.error && !state.field ? state.error : undefined)
        }
      />
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
