import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TenantNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We could not find that tenant</h1>
      <p className="text-base text-muted-foreground">
        They may have been removed, or the link is wrong.
      </p>
      <Link
        href="/homes"
        className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}
      >
        Go to your homes
      </Link>
    </div>
  );
}
