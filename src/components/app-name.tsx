import { HouseIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The PropDesk name with its icon. Used on the home and auth pages. */
export function AppName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-2xl font-semibold",
        className,
      )}
    >
      <HouseIcon aria-hidden="true" className="size-7" />
      PropDesk
    </span>
  );
}
