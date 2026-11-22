"use client";

import { ErrorState } from "@/components/error-state";

export default function DashboardError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load Today" onRetry={retry} />;
}
