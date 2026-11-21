"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * A panel for quick edits (docs/DESIGN_SYSTEM.md §3, form sheet): slides in
 * from the right on wide screens and fills the screen on phones. Focus
 * moves into it and returns when it closes; Escape closes it.
 */
export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Inline size: full screen on phones, at most 560px wide elsewhere.
        style={{ width: "100%", maxWidth: "560px" }}
        className="overflow-y-auto bg-surface"
      >
        <SheetHeader className="border-b border-border px-6 py-5 pr-14">
          <SheetTitle className="text-xl font-semibold tracking-[-0.02em]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="text-base text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="flex flex-col gap-5 px-6 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
