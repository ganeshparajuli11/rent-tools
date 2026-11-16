import { Skeleton } from "@/components/ui/skeleton";

export default function TenantLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading tenant"
      className="flex max-w-3xl flex-col gap-6"
    >
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-12 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
