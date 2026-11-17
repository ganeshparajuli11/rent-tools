import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading dashboard"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </section>
  );
}
