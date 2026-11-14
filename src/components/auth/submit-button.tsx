"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Big, full-width submit button that shows a waiting label while it works. */
export function SubmitButton({
  children,
  pendingText,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      variant={variant}
      disabled={pending}
      aria-disabled={pending}
      className={cn("h-12 w-full text-base", className)}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
