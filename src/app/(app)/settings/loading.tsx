import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading settings"
      className="flex max-w-2xl flex-col gap-6"
    >
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </section>
  );
}
