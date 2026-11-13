import { AppName } from "@/components/app-name";

/**
 * Layout for the logged-in area. src/proxy.ts redirects visitors without a
 * session to /login (an optimistic check). Pages here must still check the
 * user with supabase.auth.getClaims() before loading data.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b px-4 py-3">
        <AppName className="text-lg [&_svg]:size-5" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
