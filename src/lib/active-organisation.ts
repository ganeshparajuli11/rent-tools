/**
 * Which of a person's organisations is the active one (roadmap B5).
 *
 * The browser remembers a choice in a cookie that holds only an
 * organisation id. That id is a wish, never a permission: the server always
 * picks from the person's own active memberships (read with their own
 * client, so RLS applies), and falls back to the first organisation they
 * joined when the cookie is missing, malformed or names an organisation
 * they are not (or no longer) in.
 */

/** httpOnly cookie with the id of the organisation the person picked. */
export const ACTIVE_ORGANISATION_COOKIE = "pd_active_org";

/**
 * The audit_log action written when someone switches organisation. Today's
 * Recent activity leaves these out: a switch changes nothing in the
 * organisation.
 */
export const ORGANISATION_SWITCHED_ACTION = "organisation.switched";

/** A year: the choice should survive a restart, not just a session. */
export const ACTIVE_ORGANISATION_MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The cookie's value as an organisation id, or null when it is not one. */
export function parseActiveOrganisationCookie(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID.test(trimmed) ? trimmed.toLowerCase() : null;
}

/**
 * The membership to use: the one for the preferred organisation if the
 * person has it, otherwise the first in the list (callers order it by the
 * date joined). Undefined only for an empty list.
 */
export function pickActiveMembership<T extends { organisation_id: string }>(
  memberships: readonly T[],
  preferredOrganisationId: string | null,
): T | undefined {
  if (preferredOrganisationId) {
    const preferred = memberships.find(
      (membership) =>
        membership.organisation_id.toLowerCase() === preferredOrganisationId,
    );
    if (preferred) return preferred;
  }
  return memberships[0];
}
