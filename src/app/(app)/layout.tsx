import { redirect } from "next/navigation";

import { BottomBar } from "@/components/app/bottom-bar";
import { AppLogo } from "@/components/app/app-logo";
import { OrganisationBlock } from "@/components/app/organisation-block";
import { PersonBlock } from "@/components/app/person-block";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { TopBar } from "@/components/app/top-bar";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { getShell, type Shell } from "@/server/shell";

/**
 * The app shell for the logged-in area (docs/DESIGN_SYSTEM.md §2): sidebar
 * on wide screens, top bar with search and + New, and a bottom bar with
 * More on phones and tablets.
 *
 * src/proxy.ts already redirects signed-out visitors (optimistic check).
 * requireUser() here is the real check. Pages that load data must also call
 * requireUser() themselves, because layouts don't re-run on every navigation.
 */
/**
 * The shell's data; "no-organisation" for a new account that has not set
 * one up yet; or null when loading failed. A failure here must not take
 * every page down.
 */
async function loadShell(
  userId: string,
): Promise<Shell | "no-organisation" | null> {
  try {
    const shell = await getShell({ supabase: await createClient(), userId });
    return shell ?? "no-organisation";
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    console.error("[shell] load failed", { code });
    return null;
  }
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const loaded = await loadShell(user.id);
  // A new account sets up its organisation first (PRODUCT_SPEC.md §6.1).
  if (loaded === "no-organisation") redirect("/setup");
  const shell = loaded;

  const email = user.email ?? "Signed in";
  const name = shell?.fullName ?? null;
  const role = shell?.active.role ?? null;
  const organisation = shell ? (
    <OrganisationBlock
      organisations={shell.organisations}
      activeId={shell.active.id}
    />
  ) : null;

  return (
    <div className="pd-app flex flex-1 bg-canvas">
      {/* First stop for keyboard users: jump past the menu. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-base focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Laptops and desktops (1024px and wider): the menu is always on show. */}
      <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-5.5 overflow-y-auto border-r border-border bg-surface px-3.5 py-5 lg:flex">
        <AppLogo />
        {organisation}
        <SidebarNav
          counts={shell ? { "/homes": shell.propertiesCount } : undefined}
        />
        <PersonBlock
          name={name}
          email={email}
          role={role}
          className="mt-auto border-t border-border pt-3"
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar canAdd={shell?.active.canAdd ?? false} />
        {/*
          Left-aligned beside the sidebar, at most 1240px wide. Forms and
          detail pages set their own narrower width inside it.
          pb-28 keeps content clear of the bottom bar on phones and tablets.
          tabIndex lets the "Skip to main content" link move focus here.
        */}
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-310 flex-1 px-4 pt-6 pb-28 outline-none lg:px-8 lg:pt-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <BottomBar
        account={
          <>
            {organisation}
            <PersonBlock name={name} email={email} role={role} />
          </>
        }
      />
    </div>
  );
}
