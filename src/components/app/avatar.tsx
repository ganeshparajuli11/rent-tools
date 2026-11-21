import { initialsOf } from "@/lib/people";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-xl",
} as const;

/**
 * Initials in a grey circle for a person or company. The name is always
 * shown beside it, so the circle itself is hidden from screen readers.
 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full bg-subtle font-semibold text-ink-2",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
