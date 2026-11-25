"use client";

import { CrownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { transferOwnershipAction } from "@/app/(app)/settings/members/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Transfer ownership (owners only): a deliberate two-step confirm.
 * Step 1 picks the new owner. Step 2 says what changes and asks for the
 * organisation's name to be typed; the database checks it too. Once done,
 * only the new owner can move it back, so there is no Undo.
 */
export function TransferOwnership({
  organisationName,
  candidates,
}: {
  organisationName: string;
  /** Active members other than the owner. */
  candidates: { membershipId: string; name: string }[];
}) {
  const router = useRouter();
  const pickId = useId();
  const nameId = useId();
  const [step, setStep] = useState<"closed" | "pick" | "confirm">("closed");
  const [chosen, setChosen] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "confirm") headingRef.current?.focus();
  }, [step]);

  const person = candidates.find((c) => c.membershipId === chosen);

  if (candidates.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        Invite someone first. You can make another member the owner once they
        have joined.
      </p>
    );
  }

  if (step === "closed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-base text-muted-foreground">
          Hand the organisation to another member. You will become an admin.
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 gap-2 px-4 text-base"
          onClick={() => setStep("pick")}
        >
          <CrownIcon aria-hidden="true" className="size-4.5" />
          Transfer ownership
        </Button>
      </div>
    );
  }

  if (step === "pick" || !person) {
    return (
      <form
        className="flex max-w-140 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (chosen) setStep("confirm");
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={pickId} className="text-base font-medium">
            Who should be the new owner?
          </label>
          <select
            id={pickId}
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Choose a member</option>
            {candidates.map((candidate) => (
              <option
                key={candidate.membershipId}
                value={candidate.membershipId}
              >
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            size="lg"
            className="h-11 px-4 text-base"
            disabled={!chosen}
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 px-4 text-base"
            onClick={() => {
              setStep("closed");
              setChosen("");
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  function transfer() {
    if (!person) return;
    setError(null);
    startTransition(async () => {
      const result = await transferOwnershipAction({
        membershipId: person.membershipId,
        confirmName: typed,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.confirmName ?? result.error);
        return;
      }
      toast.success(`${person.name} is now the owner`);
      setStep("closed");
      router.refresh();
    });
  }

  return (
    <form
      className="flex max-w-140 flex-col gap-4 rounded-xl border border-destructive/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        transfer();
      }}
    >
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold outline-none"
      >
        Make {person.name} the owner?
      </h3>
      <ul className="list-disc pl-5 text-base">
        <li>{person.name} will be able to do everything, including this.</li>
        <li>You will become an admin.</li>
        <li>Only {person.name} can move ownership back to you.</li>
      </ul>
      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-base font-medium">
          Type <span className="font-semibold">{organisationName}</span> to
          confirm
        </label>
        <Input
          id={nameId}
          value={typed}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${nameId}-error` : undefined}
          onChange={(event) => setTyped(event.target.value)}
          className="h-12 text-base"
        />
        {error ? (
          <p
            id={`${nameId}-error`}
            role="alert"
            className="text-base text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          variant="destructive"
          size="lg"
          className="h-11 gap-2 px-4 text-base"
          disabled={pending || typed.trim().length === 0}
        >
          <CrownIcon aria-hidden="true" className="size-4.5" />
          {pending ? "Transferring…" : `Make ${person.name} the owner`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 px-4 text-base"
          disabled={pending}
          onClick={() => {
            setStep("pick");
            setTyped("");
            setError(null);
          }}
        >
          Back
        </Button>
      </div>
    </form>
  );
}
