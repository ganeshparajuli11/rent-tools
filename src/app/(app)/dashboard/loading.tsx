import { Skeleton } from "@/components/ui/skeleton";

/** The Today page's shape while it loads: greeting, four figures, cards. */
export default function TodayLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading Today"
      className="flex flex-col gap-7"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-[20px]" />
        <Skeleton className="h-72 w-full rounded-[20px]" />
      </div>
      <Skeleton className="h-80 w-full rounded-[20px]" />
    </section>
  );
}
