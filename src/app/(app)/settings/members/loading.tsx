import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading members"
      className="flex max-w-3xl flex-col gap-6"
    >
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-48 w-full rounded-[20px]" />
      <Skeleton className="h-64 w-full rounded-[20px]" />
    </section>
  );
}
