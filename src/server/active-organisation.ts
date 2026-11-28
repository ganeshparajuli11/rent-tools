import "server-only";

import { cookies } from "next/headers";

import {
  ACTIVE_ORGANISATION_COOKIE,
  ACTIVE_ORGANISATION_MAX_AGE,
  parseActiveOrganisationCookie,
} from "@/lib/active-organisation";

/**
 * The cookie that remembers the organisation the person picked (roadmap
 * B5). It holds only an organisation id and grants nothing: `getMembership`
 * in ./context.ts always checks it against the person's active memberships.
 * Only `switchOrganisation` and accepting an invitation set it, after their
 * own membership checks.
 */

/**
 * The organisation id the browser asked for, or null. Null too outside a
 * request (there are no cookies to read then).
 */
export async function getPreferredOrganisationId(): Promise<string | null> {
  try {
    const store = await cookies();
    return parseActiveOrganisationCookie(
      store.get(ACTIVE_ORGANISATION_COOKIE)?.value,
    );
  } catch {
    return null;
  }
}

/** Remember the organisation. Only from a server action. */
export async function setPreferredOrganisationId(organisationId: string) {
  const store = await cookies();
  store.set(ACTIVE_ORGANISATION_COOKIE, organisationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_ORGANISATION_MAX_AGE,
  });
}

/** Forget the choice, when signing out. */
export async function clearPreferredOrganisationId() {
  const store = await cookies();
  store.delete(ACTIVE_ORGANISATION_COOKIE);
}
