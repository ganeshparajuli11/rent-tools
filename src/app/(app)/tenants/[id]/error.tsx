"use client";

import { ErrorState } from "@/components/error-state";

export default function TenantError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load this tenant" onRetry={retry} />;
}
