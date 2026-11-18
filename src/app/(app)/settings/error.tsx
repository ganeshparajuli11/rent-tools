"use client";

import { ErrorState } from "@/components/error-state";

export default function SettingsError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorState title="We could not load your settings" onRetry={retry} />;
}
