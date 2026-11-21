import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";

/**
 * The top of a record page (docs/DESIGN_SYSTEM.md §3): a back link, the
 * photo (homes) or initials (people), the name, key facts as chips, one
 * line under the name, and the actions on the right.
 */
export function RecordHeader({
  back,
  title,
  photoUrl,
  avatarName,
  chips,
  subtitle,
  actions,
  className,
}: {
  back: { href: string; label: string };
  title: string;
  /** A home's cover photo. */
  photoUrl?: string | null;
  /** A person or company: shows their initials instead of a photo. */
  avatarName?: string;
  chips?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Link
        href={back.href}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-[10px] pr-2 text-[15px] font-medium text-muted-foreground hover:text-ink"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4.5" />
        {back.label}
      </Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {photoUrl ? (
            // Signed links change on every load, so next/image is not used.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="size-16 flex-none rounded-2xl border border-border object-cover sm:size-20"
            />
          ) : avatarName ? (
            <Avatar name={avatarName} size="lg" />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            {chips ? (
              <div className="flex flex-wrap items-center gap-2">{chips}</div>
            ) : null}
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] break-words lg:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <div className="text-base text-ink-2">{subtitle}</div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>
    </div>
  );
}

/** A grey fact chip in a record header, e.g. "Let by the room · 5 rooms". */
export function FactChip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-0.75 text-xs font-semibold text-ink-2 [&_svg]:size-3.5">
      {icon}
      {children}
    </span>
  );
}
