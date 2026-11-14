import "server-only";

import { cookies } from "next/headers";

/**
 * Remembers which email we sent a code to, between "enter email" and
 * "enter code". Kept in an httpOnly cookie rather than the URL, so the email
 * address does not end up in browser history or server logs.
 */
const COOKIE_NAME = "rd_pending_sign_in";
const ONE_HOUR = 60 * 60; // matches Supabase's default code expiry

export async function setPendingSignInEmail(email: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_HOUR,
  });
}

export async function getPendingSignInEmail(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value || null;
}

export async function clearPendingSignInEmail() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
