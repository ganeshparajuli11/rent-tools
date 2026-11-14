"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  DoorOpenIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  addRoomAction,
  archiveRoomAction,
  renameRoomAction,
  restoreRoomAction,
} from "@/app/(app)/homes/actions";
import { applyServerErrors, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roomNameSchema, type LetType } from "@/lib/validation/homes";

type Room = { id: string; name: string };

const renameFormSchema = z.object({ name: roomNameSchema });
type RenameInput = z.input<typeof renameFormSchema>;
type RenameOutput = z.output<typeof renameFormSchema>;

export function RoomList({
  homeId,
  letType,
  rooms,
  archivedRooms,
  readOnly,
}: {
  homeId: string;
  letType: LetType;
  rooms: Room[];
  archivedRooms: Room[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState<Room | null>(null);

  function addRoom() {
    startTransition(async () => {
      const result = await addRoomAction(homeId);
      if (result.ok)
        toast.success(
          `${result.data.name} added. Tap Rename to change its name.`,
        );
      else toast.error(result.error);
    });
  }

  function restoreRoom(room: Room) {
    startTransition(async () => {
      const result = await restoreRoomAction(room.id);
      if (result.ok) {
        toast.success(`${room.name} is back`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function archiveRoom(room: Room) {
    startTransition(async () => {
      const result = await archiveRoomAction(room.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast(`${room.name} archived`, {
        duration: 10_000,
        action: { label: "Undo", onClick: () => restoreRoom(room) },
      });
    });
  }

  return (
    <section aria-labelledby="rooms-heading" className="flex flex-col gap-3">
      <h2 id="rooms-heading" className="text-xl font-semibold">
        Rooms
      </h2>

      {rooms.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {letType === "whole_home"
            ? "You let this as a whole home, so it has no separate rooms."
            : "This home has no rooms yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <span className="flex flex-1 items-center gap-2 text-base font-medium">
                <DoorOpenIcon aria-hidden="true" className="size-5 shrink-0" />
                {room.name}
              </span>
              {!readOnly ? (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2 px-4 text-base"
                    onClick={() => setRenaming(room)}
                    aria-label={`Rename ${room.name}`}
                  >
                    <PencilIcon aria-hidden="true" className="size-4" />
                    Rename
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2 px-4 text-base"
                    disabled={pending}
                    onClick={() => archiveRoom(room)}
                    aria-label={`Archive ${room.name}`}
                  >
                    <ArchiveIcon aria-hidden="true" className="size-4" />
                    Archive
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 gap-2 px-6 text-base sm:self-start"
          disabled={pending}
          onClick={addRoom}
        >
          <PlusIcon aria-hidden="true" className="size-5" />
          Add a room
        </Button>
      ) : null}

      {archivedRooms.length > 0 ? (
        <details className="rounded-xl border p-4">
          <summary className="min-h-11 cursor-pointer content-center text-base">
            Archived rooms ({archivedRooms.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {archivedRooms.map((room) => (
              <li
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-base text-muted-foreground">
                  {room.name}
                </span>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2 px-4 text-base"
                    disabled={pending}
                    onClick={() => restoreRoom(room)}
                    aria-label={`Bring back ${room.name}`}
                  >
                    <ArchiveRestoreIcon aria-hidden="true" className="size-4" />
                    Bring back
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <RenameRoomDialog room={renaming} onClose={() => setRenaming(null)} />
    </section>
  );
}

function RenameRoomDialog({
  room,
  onClose,
}: {
  room: Room | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={room !== null}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
    >
      <DialogContent className="sm:max-w-md">
        {room ? (
          <RenameRoomForm key={room.id} room={room} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameRoomForm({ room, onDone }: { room: Room; onDone: () => void }) {
  const form = useForm<RenameInput, unknown, RenameOutput>({
    resolver: zodResolver(renameFormSchema),
    defaultValues: { name: room.name },
  });

  const onSubmit = form.handleSubmit(async () => {
    const result = await renameRoomAction({
      roomId: room.id,
      name: form.getValues("name"),
    });
    if (result.ok) {
      toast.success("Room renamed");
      onDone();
      return;
    }
    if (!applyServerErrors(form, result.fieldErrors)) {
      form.setError("name", { type: "server", message: result.error });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl">Rename {room.name}</DialogTitle>
        <DialogDescription className="text-base">
          For example &ldquo;Front bedroom&rdquo; or &ldquo;Attic room&rdquo;.
        </DialogDescription>
      </DialogHeader>
      <TextField
        form={form}
        name="name"
        label="Room name"
        autoComplete="off"
        autoFocus
      />
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 px-6 text-base"
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-12 px-6 text-base"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving…" : "Save name"}
        </Button>
      </DialogFooter>
    </form>
  );
}
