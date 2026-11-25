"use client";

import { ErrorState } from "@/components/error-state";

export default function MembersError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load your members" onRetry={retry} />;
}
