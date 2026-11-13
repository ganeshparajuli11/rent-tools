import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv, hasSupabaseEnv } from "@/lib/env";

/** Paths anyone can open without logging in. Everything else needs a session. */
const PUBLIC_PATHS = ["/", "/login", "/sign-up", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
  );
}

/**
 * Refreshes the Supabase auth session on each request and keeps the auth
 * cookies in sync between the browser and Server Components.
 * Follows the Supabase SSR guide for the Next.js App Router (Next.js 16 "proxy").
 *
 * The redirect below is only an optimistic check. Real authorisation must
 * happen next to the data (Server Components / Actions + Postgres RLS).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip until Supabase keys are configured, so the app still boots locally.
  if (!hasSupabaseEnv()) {
    return supabaseResponse;
  }

  const env = getPublicEnv();

  // Create a new client on every request. Don't store it globally.
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Cache headers (e.g. no-store) so a CDN never caches a response
          // that sets someone's auth cookie.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims().
  // Removing getClaims() can cause users to be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed/cleared auth cookies on the redirect response.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // IMPORTANT: return supabaseResponse as-is. If you need a different
  // response, copy its cookies and headers over first, or users get logged out.
  return supabaseResponse;
}
