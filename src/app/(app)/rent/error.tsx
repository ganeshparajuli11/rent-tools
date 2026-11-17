"use client";

import { ErrorState } from "@/components/error-state";

export default function RentError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load the rent" onRetry={retry} />;
}
