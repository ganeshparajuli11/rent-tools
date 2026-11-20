import Link from "next/link";

import { BrandMark } from "@/components/landing/brand-mark";
import { cn } from "@/lib/utils";

/** The PropDesk mark and name, linking to Today. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label="PropDesk, go to Today"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-[10px] px-2 text-lg font-bold tracking-[-0.02em] text-ink",
        className,
      )}
    >
      <BrandMark className="size-7 text-ink" />
      <span aria-hidden="true">PropDesk</span>
    </Link>
  );
}
