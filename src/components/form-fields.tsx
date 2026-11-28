"use client";

import type {
  FieldPath,
  FieldValues,
  UseFormRegister,
  UseFormSetError,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ordinal } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Accessible form fields for React Hook Form.
 * Every field has a visible label. Errors are announced (role="alert" in
 * FieldError) and linked to the input with aria-describedby.
 */

/** The parts of a useForm() result these fields need (any output type). */
type FormLike<T extends FieldValues> = {
  register: UseFormRegister<T>;
  // Only `errors` is read. Typed loosely so T is inferred from `register`.
  formState: { errors: object };
};

type BaseProps<T extends FieldValues> = {
  form: FormLike<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
};

function errorOf<T extends FieldValues>(
  form: FormLike<T>,
  name: FieldPath<T>,
): string | undefined {
  const error = name
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      form.formState.errors,
    ) as { message?: string } | undefined;
  return error?.message;
}

function describedBy(id: string, hint?: string, error?: string) {
  return (
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  className,
  id: idProp,
  ...inputProps
}: BaseProps<T> & Omit<React.ComponentProps<"input">, "name" | "form">) {
  // Pass `id` when the same field can be on the page more than once.
  const id = idProp ?? `field-${name}`;
  const error = errorOf(form, name);
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id} className="text-base">
        {label}
      </FieldLabel>
      {hint ? (
        <FieldDescription id={`${id}-hint`} className="text-base">
          {hint}
        </FieldDescription>
      ) : null}
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="h-12 text-base"
        {...inputProps}
        {...form.register(name)}
      />
      <FieldError id={`${id}-error`} className="text-base">
        {error}
      </FieldError>
    </Field>
  );
}

/** Several lines of text, such as notes. */
export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  className,
  rows = 4,
  ...textareaProps
}: BaseProps<T> &
  Omit<React.ComponentProps<"textarea">, "name" | "form" | "id">) {
  const id = `field-${name}`;
  const error = errorOf(form, name);
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id} className="text-base">
        {label}
      </FieldLabel>
      {hint ? (
        <FieldDescription id={`${id}-hint`} className="text-base">
          {hint}
        </FieldDescription>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        {...textareaProps}
        {...form.register(name)}
      />
      <FieldError id={`${id}-error`} className="text-base">
        {error}
      </FieldError>
    </Field>
  );
}

/** Large radio "cards". Native radios, so arrow keys and Space work. */
export function ChoiceField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  options,
}: BaseProps<T> & {
  options: { value: string; label: string; description?: string }[];
}) {
  const id = `field-${name}`;
  const error = errorOf(form, name);
  return (
    <fieldset
      aria-describedby={describedBy(id, hint, error)}
      aria-invalid={error ? true : undefined}
      className="flex flex-col gap-3"
    >
      <legend className="mb-3 text-base font-medium">{label}</legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-base text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/50",
            "has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            error && "border-destructive",
          )}
        >
          <input
            type="radio"
            value={option.value}
            className="mt-1 size-5 shrink-0 accent-foreground"
            {...form.register(name)}
          />
          <span className="flex flex-col gap-1">
            <span className="text-base font-medium">{option.label}</span>
            {option.description ? (
              <span className="text-base text-muted-foreground">
                {option.description}
              </span>
            ) : null}
          </span>
        </label>
      ))}
      <FieldError id={`${id}-error`} className="text-base">
        {error}
      </FieldError>
    </fieldset>
  );
}

/** Day of the month, 1st to 28th. A native select works well on phones. */
export function DueDayField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
}: BaseProps<T>) {
  const id = `field-${name}`;
  const error = errorOf(form, name);
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-base">
        {label}
      </FieldLabel>
      {hint ? (
        <FieldDescription id={`${id}-hint`} className="text-base">
          {hint}
        </FieldDescription>
      ) : null}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        {...form.register(name)}
      >
        <option value="">Choose a day</option>
        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
          <option key={day} value={String(day)}>
            The {ordinal(day)}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} className="text-base">
        {error}
      </FieldError>
    </Field>
  );
}

/** Applies server-side field errors to the form and returns the first field. */
export function applyServerErrors<T extends FieldValues>(
  form: { setError: UseFormSetError<T> },
  fieldErrors: Record<string, string> | undefined,
): FieldPath<T> | undefined {
  if (!fieldErrors) return undefined;
  let first: FieldPath<T> | undefined;
  for (const [name, message] of Object.entries(fieldErrors)) {
    form.setError(name as FieldPath<T>, { type: "server", message });
    first ??= name as FieldPath<T>;
  }
  return first;
}
