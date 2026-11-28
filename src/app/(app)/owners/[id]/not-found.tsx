import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OwnerNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We could not find that owner</h1>
      <p className="text-base text-muted-foreground">
        They may have been removed, or the link is wrong.
      </p>
      <Link
        href="/owners"
        className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
      >
        Go to your owners
      </Link>
    </div>
  );
}
