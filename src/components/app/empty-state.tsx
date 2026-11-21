import { cn } from "@/lib/utils";

/**
 * What an empty list or section shows (docs/DESIGN_SYSTEM.md §4): an icon
 * in a soft circle, a heading, one line on what goes here, and one action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 2,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-[20px] border border-dashed border-border bg-surface p-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-subtle text-ink-2 [&_svg]:size-5.5"
      >
        {icon}
      </span>
      <div className="flex max-w-xl flex-col gap-1">
        <Heading className="text-xl font-semibold tracking-[-0.02em]">
          {title}
        </Heading>
        <div className="text-base text-muted-foreground">{description}</div>
      </div>
      {action}
    </div>
  );
}
