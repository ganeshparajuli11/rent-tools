import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading home"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-12 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
