import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading owner"
      className="flex max-w-5xl flex-col gap-6"
    >
      <Skeleton className="h-6 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-4 min-[420px]:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-[20px]" />
    </div>
  );
}
