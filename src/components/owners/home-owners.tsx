"use client";

import { LinkIcon, UnlinkIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { linkOwnerAction, unlinkOwnerAction } from "@/app/(app)/owners/actions";
import { secondaryActionClass } from "@/components/app/action-classes";
import { Avatar } from "@/components/app/avatar";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { ownerTypeLabel } from "@/lib/owners";
import { cn } from "@/lib/utils";

export type HomeOwnerItem = {
  id: string;
  name: string;
  ownerType: "individual" | "company";
  archived: boolean;
};

/**
 * The owners of a home (roadmap C1): each links to their record. Managers
 * and above can link an owner already in the list, add a new one (who
 * comes back linked) or unlink one, with Undo.
 */
export function HomeOwners({
  homeId,
  owners,
  options,
  canManage,
}: {
  homeId: string;
  owners: HomeOwnerItem[];
  /** Current owners in the organisation, for the picker. */
  options: { id: string; name: string }[];
  /** False for staff, or when the home is archived. */
  canManage: boolean;
}) {
  const linkedIds = new Set(owners.map((owner) => owner.id));
  const available = options.filter((option) => !linkedIds.has(option.id));

  return (
    <div className="flex flex-col gap-4">
      {owners.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No owner linked yet.
          {canManage ? " Link the person or company who owns this home." : null}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {owners.map((owner) => (
            <li
              key={owner.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
            >
              <Link
                href={`/owners/${owner.id}`}
                className="flex min-h-11 min-w-0 items-center gap-3 rounded-[10px] hover:underline"
              >
                <Avatar name={owner.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold break-words">
                    {owner.name}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {ownerTypeLabel(owner.ownerType)}
                  </span>
                </span>
              </Link>
              <span className="flex items-center gap-2">
                {owner.archived ? (
                  <StatusPill tone="outline">Archived</StatusPill>
                ) : null}
                {canManage ? (
                  <UnlinkOwnerButton
                    homeId={homeId}
                    ownerId={owner.id}
                    ownerName={owner.name}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-3 border-t border-divider pt-4">
          {available.length > 0 ? (
            <LinkOwnerForm homeId={homeId} options={available} />
          ) : null}
          <Link
            href={`/owners/new?home=${homeId}`}
            className={cn(secondaryActionClass, "w-full")}
          >
            <UserPlusIcon aria-hidden="true" className="size-4.5" />
            Add a new owner
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function LinkOwnerForm({
  homeId,
  options,
}: {
  homeId: string;
  options: { id: string; name: string }[];
}) {
  const router = useRouter();
  const selectId = useId();
  const [ownerId, setOwnerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function link(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId) {
      setError("Choose an owner to link");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await linkOwnerAction({ homeId, ownerId });
      if (result.ok) {
        toast.success(`${result.data.name} linked to this home`);
        setOwnerId("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form noValidate onSubmit={link} className="flex flex-col gap-2">
      <label htmlFor={selectId} className="text-base font-medium">
        Link an owner
      </label>
      <select
        id={selectId}
        value={ownerId}
        onChange={(event) => setOwnerId(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      >
        <option value="">Choose an owner</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error ? (
        <p
          id={`${selectId}-error`}
          role="alert"
          className="text-base text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full gap-2 text-[15px]"
        disabled={pending}
      >
        <LinkIcon aria-hidden="true" className="size-4.5" />
        {pending ? "Linking…" : "Link owner"}
      </Button>
    </form>
  );
}

function UnlinkOwnerButton({
  homeId,
  ownerId,
  ownerName,
}: {
  homeId: string;
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function unlink() {
    startTransition(async () => {
      const result = await unlinkOwnerAction({ homeId, ownerId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast(`${ownerName} unlinked from this home`, {
        description: "Their owner record is kept.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: async () => {
            const undo = await linkOwnerAction({ homeId, ownerId });
            if (undo.ok) {
              toast.success(`${ownerName} is linked again`);
              router.refresh();
            } else {
              toast.error(undo.error);
            }
          },
        },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-1.5 px-3 text-[15px]"
      disabled={pending}
      onClick={unlink}
      aria-label={`Unlink ${ownerName}`}
    >
      <UnlinkIcon aria-hidden="true" className="size-4" />
      {pending ? "Unlinking…" : "Unlink"}
    </Button>
  );
}
