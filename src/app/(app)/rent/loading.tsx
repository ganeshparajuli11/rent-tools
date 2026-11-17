import { Skeleton } from "@/components/ui/skeleton";

export default function RentLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading rent"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-12 w-48" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </section>
  );
}
