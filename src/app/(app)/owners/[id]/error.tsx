"use client";

import { ErrorState } from "@/components/error-state";

export default function OwnerError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load this owner" onRetry={retry} />;
}
