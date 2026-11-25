/**
 * Invitation helpers shared by the server and the pages (roadmap B4).
 *
 * The link in an invitation carries a random token. Only its SHA-256 hash
 * is stored (invitations.token_hash), the same hash the database function
 * public.invitation_for_token works out, so a copy of the table never
 * gives anyone a working link.
 */

/** How long an invitation stays open. The database default matches. */
export const INVITATION_DAYS = 7;

/** A new random token for a link: 32 random bytes, base64url (43 chars). */
export function newInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** The SHA-256 of a token as 64 lowercase hex characters. */
export async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** The link to send: `<site>/invite/<token>`. */
export function invitationLink(appUrl: string, token: string): string {
  return new URL(`/invite/${token}`, appUrl).toString();
}

export type InvitationStatus = "pending" | "expired";

/** An open invitation is "pending" until its expiry passes. */
export function invitationStatus(
  expiresAt: string,
  now: Date = new Date(),
): InvitationStatus {
  return new Date(expiresAt).getTime() > now.getTime() ? "pending" : "expired";
}
