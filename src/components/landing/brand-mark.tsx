import { cn } from "@/lib/utils";

/** The PropDesk mark: a roof over a desk line. Decorative. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M8 15.5 16 9l8 6.5"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 22.5h13"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
