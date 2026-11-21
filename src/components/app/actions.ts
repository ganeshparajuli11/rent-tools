/**
 * Class names for links that look like buttons (docs/DESIGN_SYSTEM.md §1:
 * radius 10px, at least 44px tall). Buttons use <Button> from
 * `@/components/ui/button` with the same classes.
 */

/** The one main action on a page: black. */
export const primaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-ink px-4.5 text-[15px] font-medium whitespace-nowrap text-surface hover:bg-ink/85";

/** Other actions: white with a border. */
export const secondaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-4 text-[15px] font-medium whitespace-nowrap text-ink hover:bg-subtle";
