"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateHomeAction } from "@/app/(app)/homes/actions";
import { applyServerErrors } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  type CreateHomeInput,
  updateHomeSchema,
  type UpdateHomeValues,
} from "@/lib/validation/homes";

import { HomeDetailsFields, LetTypeFields, OwnerFields } from "./home-fields";

/** "Edit home": the same fields as the add flow, on one page. */
export function HomeEditForm({
  homeId,
  defaultValues,
  activeRoomCount,
  linkedOwner = null,
}: {
  homeId: string;
  defaultValues: CreateHomeInput;
  activeRoomCount: number;
  /** The owner record the rent is paid to, if any. */
  linkedOwner?: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateHomeInput, unknown, UpdateHomeValues>({
    resolver: zodResolver(updateHomeSchema),
    defaultValues,
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(async () => {
    setFormError(null);
    const result = await updateHomeAction(homeId, form.getValues());
    if (result.ok) {
      toast.success("Changes saved");
      router.push(`/homes/${homeId}`);
      return;
    }
    applyServerErrors(form, result.fieldErrors);
    setFormError(result.error);
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-10">
      <section aria-labelledby="edit-where" className="flex flex-col gap-4">
        <h2 id="edit-where" className="text-xl font-semibold">
          Where is the home?
        </h2>
        <HomeDetailsFields form={form} />
      </section>

      <section aria-labelledby="edit-let" className="flex flex-col gap-4">
        <h2 id="edit-let" className="text-xl font-semibold">
          How do you let it?
        </h2>
        {/* Room count is only needed when a home with no rooms changes to "by the room". */}
        <LetTypeFields form={form} askRoomCount={activeRoomCount === 0} />
        {activeRoomCount > 0 ? (
          <p className="text-base text-muted-foreground">
            This home has {activeRoomCount}{" "}
            {activeRoomCount === 1 ? "room" : "rooms"}. Add, rename or archive
            rooms on the home page.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="edit-owner" className="flex flex-col gap-4">
        <h2 id="edit-owner" className="text-xl font-semibold">
          Owner
        </h2>
        <OwnerFields form={form} linkedOwner={linkedOwner} />
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
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full px-8 text-base sm:w-auto"
          disabled={submitting}
          onClick={() => router.push(`/homes/${homeId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
