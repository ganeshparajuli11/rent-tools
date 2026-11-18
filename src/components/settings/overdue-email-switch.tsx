"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { setOverdueEmailAction } from "@/app/(app)/settings/actions";
import { cn } from "@/lib/utils";

/**
 * The on/off switch for the daily late rent email. One tap changes it; the
 * toast has Undo instead of an "Are you sure?" dialog.
 *
 * `disabledReason` is shown instead of letting the switch change, for staff
 * (only owners can change it) and before the setting is ready.
 */
export function OverdueEmailSwitch({
  enabled: initial,
  disabledReason,
}: {
  enabled: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();
  const labelId = useId();
  const hintId = useId();
  const disabled = pending || Boolean(disabledReason);

  function save(next: boolean, isUndo = false) {
    startTransition(async () => {
      const result = await setOverdueEmailAction({ enabled: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEnabled(result.data.enabled);
      router.refresh();
      const message = result.data.enabled
        ? "Late rent emails turned on"
        : "Late rent emails turned off";
      if (isUndo) {
        toast.success(message);
        return;
      }
      toast(message, {
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => save(!result.data.enabled, true),
        },
      });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p id={labelId} className="text-lg font-semibold">
            Email me about late rent
          </p>
          <p id={hintId} className="text-base text-muted-foreground">
            Each morning, if any rent is late, we email the account owner a list
            of who owes what.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          disabled={disabled}
          onClick={() => save(!enabled)}
          className={cn(
            "relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
            enabled ? "bg-primary" : "bg-muted-foreground/40",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-9 rounded-full bg-background shadow transition-transform",
              enabled ? "translate-x-9" : "translate-x-0",
            )}
          />
        </button>
      </div>
      <p className="text-base font-medium" aria-live="polite">
        {pending ? "Saving…" : enabled ? "On" : "Off"}
      </p>
      {disabledReason ? (
        <p className="text-base text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
