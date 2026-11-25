"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { inviteMemberAction } from "@/app/(app)/settings/members/actions";
import {
  applyServerErrors,
  ChoiceField,
  TextField,
} from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  type InviteMemberInput,
  inviteMemberSchema,
  type InviteMemberValues,
  MEMBER_ROLE_OPTIONS,
} from "@/lib/validation/members";

type Sent = { email: string; link: string; emailSent: boolean };

/**
 * Invite someone: their email address and a role. After sending, the
 * link is shown once with a Copy button, so the inviter can also send it
 * themselves (the email can be slow, or held back by the hourly limit).
 */
export function InviteMemberForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<InviteMemberInput, unknown, InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "staff" },
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setCopied(false);
    const result = await inviteMemberAction(values);
    if (!result.ok) {
      const firstField = applyServerErrors(form, result.fieldErrors);
      if (firstField) form.setFocus(firstField);
      setFormError(result.error);
      return;
    }
    setSent({ email: values.email, ...result.data });
    form.reset({ email: "", role: values.role });
    toast.success(
      result.data.emailSent
        ? `Invitation sent to ${values.email}`
        : "Invitation made. Send them the link below.",
    );
    router.refresh();
  });

  async function copyLink() {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.link);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it instead.");
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={onSubmit}
        aria-label="Invite someone"
        className="flex max-w-140 flex-col gap-6"
      >
        <TextField
          form={form}
          name="email"
          id="invite-email"
          label="Their email address"
          hint="They sign in with this address to join."
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <ChoiceField
          form={form}
          name="role"
          label="Their role"
          options={MEMBER_ROLE_OPTIONS}
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
          className="h-12 w-full gap-2 px-6 text-base sm:w-auto"
          disabled={submitting}
        >
          <SendIcon aria-hidden="true" className="size-5" />
          {submitting ? "Sending…" : "Send invitation"}
        </Button>
      </form>

      {sent ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-border bg-subtle p-4"
        >
          <p className="text-base font-medium break-words">
            {sent.emailSent
              ? `We have emailed ${sent.email} a sign-in code. Once they sign in, they will see your invitation.`
              : `We could not send the email just now. Send ${sent.email} this link yourself.`}
          </p>
          <label
            htmlFor="invite-link"
            className="text-[13px] text-muted-foreground"
          >
            Invitation link (works once, for 7 days, only for that email
            address)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="invite-link"
              readOnly
              value={sent.link}
              onFocus={(event) => event.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 gap-2 px-4 text-base"
              onClick={copyLink}
            >
              {copied ? (
                <CheckIcon aria-hidden="true" className="size-4.5" />
              ) : (
                <CopyIcon aria-hidden="true" className="size-4.5" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
