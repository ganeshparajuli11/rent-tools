"use client";

import { ErrorState } from "@/components/error-state";

export default function HomesError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load your homes" onRetry={retry} />;
}
