"use client";

import { ErrorState } from "@/components/error-state";

export default function OwnersError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load your owners" onRetry={retry} />;
}
