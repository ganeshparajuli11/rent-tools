import { Skeleton } from "@/components/ui/skeleton";

export default function HomesLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading homes"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-8 w-32" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-28 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </section>
  );
}
