import { HouseIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { StatusTone } from "./status-pill";

const CHIP_TONES: Partial<Record<StatusTone, string>> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
};

/**
 * A home as a photo with its name under it (docs/DESIGN_SYSTEM.md §4). The
 * whole card is one link. Without a photo it shows a house on grey.
 */
export function PhotoCard({
  href,
  photoUrl,
  title,
  meta,
  chip,
  className,
}: {
  href: string;
  photoUrl: string | null;
  title: string;
  meta?: React.ReactNode;
  /** A status word on the photo, e.g. "Fully let" or "Archived". */
  chip?: { label: string; tone: StatusTone };
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2.5 rounded-[14px] text-ink outline-none",
        className,
      )}
    >
      <span className="relative block aspect-3/2 overflow-hidden rounded-[14px] bg-subtle">
        {photoUrl ? (
          // Signed links change on every load, so next/image is not used.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <HouseIcon aria-hidden="true" className="size-9" />
          </span>
        )}
        {chip ? (
          <span
            className={cn(
              "absolute top-2.5 left-2.5 rounded-full bg-surface/95 px-2.5 py-0.75 text-xs font-semibold",
              CHIP_TONES[chip.tone] ?? "text-ink-2",
            )}
          >
            {chip.label}
          </span>
        ) : null}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold break-words group-hover:underline group-hover:underline-offset-4">
          {title}
        </span>
        {meta ? (
          <span className="text-[13px] text-muted-foreground">{meta}</span>
        ) : null}
      </span>
    </Link>
  );
}
