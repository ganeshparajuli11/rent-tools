import { Skeleton } from "@/components/ui/skeleton";

export default function OwnersLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading owners"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-11 w-56 rounded-xl" />
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-16 w-full rounded-2xl" />
          </li>
        ))}
      </ul>
    </section>
  );
}
