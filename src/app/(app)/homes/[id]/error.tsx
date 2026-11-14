"use client";

import { ErrorState } from "@/components/error-state";

export default function HomeError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load this home" onRetry={retry} />;
}
