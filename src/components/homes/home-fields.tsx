"use client";

import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";

import { ChoiceField, DueDayField, TextField } from "@/components/form-fields";
import { MAX_ROOMS, type CreateHomeInput } from "@/lib/validation/homes";

/**
 * Field groups shared by "Add a home" (one group per step) and
 * "Edit home" (all groups on one page).
 */
export type HomeForm = UseFormReturn<CreateHomeInput, unknown, unknown>;
type FormProp = { form: Pick<HomeForm, "register" | "formState" | "watch"> };

export function HomeDetailsFields({ form }: FormProp) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        form={form}
        name="name"
        label="Name for this home"
        hint="Something you will recognise, like 12 Oak Road"
        autoComplete="off"
      />
      <TextField
        form={form}
        name="addressLine1"
        label="Address line 1"
        autoComplete="address-line1"
      />
      <TextField
        form={form}
        name="addressLine2"
        label="Address line 2 (optional)"
        autoComplete="address-line2"
      />
      <TextField
        form={form}
        name="city"
        label="Town or city (optional)"
        autoComplete="address-level2"
      />
      <TextField
        form={form}
        name="postcode"
        label="Postcode"
        autoComplete="postal-code"
        autoCapitalize="characters"
        className="sm:max-w-48"
      />
    </div>
  );
}

export function LetTypeFields({
  form,
  askRoomCount = true,
}: FormProp & { askRoomCount?: boolean }) {
  const letType = form.watch("letType");
  return (
    <div className="flex flex-col gap-5">
      <ChoiceField
        form={form}
        name="letType"
        label="How do you let this home?"
        options={[
          {
            value: "whole_home",
            label: "As a whole home",
            description: "One tenant or household rents all of it.",
          },
          {
            value: "by_room",
            label: "By the room",
            description: "Different tenants rent different rooms.",
          },
        ]}
      />
      {letType === "by_room" && askRoomCount ? (
        <TextField
          form={form}
          name="roomCount"
          label="How many rooms do you let?"
          hint={`We will call them Room 1, Room 2 and so on. You can rename them later. Up to ${MAX_ROOMS}.`}
          inputMode="numeric"
          autoComplete="off"
          className="sm:max-w-48"
        />
      ) : null}
    </div>
  );
}

export function OwnerFields({
  form,
  linkedOwner,
}: FormProp & {
  /**
   * "Edit home" when the rent is already paid to an owner record: their
   * name and phone are changed on their own page, not here.
   */
  linkedOwner?: { id: string; name: string } | null;
}) {
  const hasOwner = form.watch("hasOwner");
  return (
    <div className="flex flex-col gap-5">
      <ChoiceField
        form={form}
        name="hasOwner"
        label="Do you rent this home from an owner?"
        hint="For example, if you sublet it (rent-to-rent)."
        options={[
          { value: "no", label: "No, I own it or manage it" },
          { value: "yes", label: "Yes, I pay rent to an owner" },
        ]}
      />
      {hasOwner === "yes" ? (
        <>
          {linkedOwner ? (
            <div className="flex flex-col gap-1 rounded-xl bg-subtle p-4 text-base">
              <p className="text-[13px] text-muted-foreground">
                Rent is paid to
              </p>
              <p className="font-semibold break-words">{linkedOwner.name}</p>
              <p className="text-muted-foreground">
                To change their name or phone,{" "}
                <Link
                  href={`/owners/${linkedOwner.id}/edit`}
                  className="text-ink underline underline-offset-4"
                >
                  edit the owner
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <TextField
                form={form}
                name="ownerName"
                label="Owner's name"
                hint="We will add them to your owners and link them to this home."
                autoComplete="off"
              />
              <TextField
                form={form}
                name="ownerPhone"
                label="Owner's phone (optional)"
                type="tel"
                inputMode="tel"
                autoComplete="off"
              />
            </>
          )}
          <TextField
            form={form}
            name="ownerRent"
            label="Rent you pay the owner each month, in pounds"
            hint="For example 650 or 650.50"
            inputMode="decimal"
            autoComplete="off"
            className="sm:max-w-60"
          />
          <DueDayField
            form={form}
            name="ownerDueDay"
            label="Day of the month it is due"
          />
        </>
      ) : null}
    </div>
  );
}

export const EMPTY_HOME_FORM: CreateHomeInput = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  letType: undefined as unknown as CreateHomeInput["letType"],
  roomCount: "",
  hasOwner: "no",
  ownerName: "",
  ownerPhone: "",
  ownerRent: "",
  ownerDueDay: "",
};
