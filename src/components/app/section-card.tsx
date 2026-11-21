import { cn } from "@/lib/utils";

/**
 * A white card with a heading that groups one part of a page
 * (docs/DESIGN_SYSTEM.md §4). `action` sits on the right of the heading,
 * e.g. a "View all" link or a filter.
 */
export function SectionCard({
  id,
  title,
  action,
  children,
  className,
}: {
  /** Used for the heading's id, so the section is named by it. */
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-[20px] border border-border bg-surface p-4 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
