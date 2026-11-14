"use client";

import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Plain-words error with a retry button. Never shows technical details. */
export function ErrorState({
  title = "We could not load this page",
  message = "This is usually a short internet problem. Please try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border p-6"
    >
      <TriangleAlertIcon aria-hidden="true" className="size-8" />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-base text-muted-foreground">{message}</p>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-12 w-full px-6 text-base sm:w-auto"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
