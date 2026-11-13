import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Don't put this client in a global variable. Create a new one inside each
 * function that needs it (important with Vercel Fluid compute).
 *
 * To protect pages and data, use `supabase.auth.getClaims()`. Never trust
 * `getSession()` in server code.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, which cannot set
            // cookies. This is safe to ignore because src/proxy.ts refreshes
            // the session on every request.
          }
        },
      },
    },
  );
}
