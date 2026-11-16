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
      {/* First stop for keyboard users: jump past the menu. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-base focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Laptops and desktops (1024px and wider): the menu is always on show. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-sidebar p-4 lg:flex">
        <AppName className="px-3 text-xl [&_svg]:size-6" />
        <SideNav />
        <div className="mt-auto">{signOutButton}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone and tablet header */}
        <header className="flex items-center justify-between gap-4 border-b px-4 py-2 lg:hidden">
          <AppName className="text-lg [&_svg]:size-5" />
          <div className="w-32">{signOutButton}</div>
        </header>
        {/*
          One centred column. It is wide enough for tables; forms and detail
          pages set their own narrower width inside it.
          pb-28 keeps content clear of the bottom bar on phones and tablets.
          tabIndex lets the "Skip to main content" link move focus here.
        */}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pt-10 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
