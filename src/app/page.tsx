import Link from "next/link";

import { AppName } from "@/components/app-name";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <AppName />
      <p className="text-lg text-muted-foreground">
        Keep track of your rooms, tenants and rent in one place.
      </p>
      {/* A real link styled as a shadcn Button, so screen readers announce it
          as a link (it navigates) rather than a button. */}
      <Link
        href="/login"
        className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}
      >
        Log in
      </Link>
    </main>
  );
}
