import { LogOutIcon } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { AppName } from "@/components/app-name";
import { BottomNav, SideNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";

/**
 * Layout for the logged-in area.
 * src/proxy.ts already redirects signed-out visitors (optimistic check).
 * requireUser() here is the real check. Pages that load data must also call
 * requireUser() themselves, because layouts don't re-run on every navigation.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  const signOutButton = (
    <form action={signOut}>
      <Button
        type="submit"
        variant="outline"
        className="h-11 w-full justify-start gap-2 px-3 text-base"
      >
        <LogOutIcon aria-hidden="true" className="size-5" />
        Sign out
      </Button>
    </form>
  );

  return (
    <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <AppName className="px-3 text-xl [&_svg]:size-6" />
        <SideNav />
        <div className="mt-auto">{signOutButton}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone header */}
        <header className="flex items-center justify-between gap-4 border-b px-4 py-2 md:hidden">
          <AppName className="text-lg [&_svg]:size-5" />
          <div className="w-32">{signOutButton}</div>
        </header>
        {/* pb-24 keeps content clear of the bottom bar on phones */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
