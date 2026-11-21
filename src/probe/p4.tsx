import { cn } from "@/lib/utils";

/** A small grey number, e.g. beside a heading or a filter tab. */
export function CountPill({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  /** Read out instead of the bare number, e.g. "12 homes". */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-subtle px-2 text-xs font-medium text-muted-foreground tabular-nums",
        className,
      )}
    >
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}
