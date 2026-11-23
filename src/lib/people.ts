/**
 * Small helpers for showing people and organisations in the app shell.
 */

/**
 * Up to two capital letters for an avatar: "Demo Lettings" -> "DL",
 * "taylor.example@example.com" -> "TE", "alex" -> "AL". Never empty.
 */
export function initialsOf(text: string): string {
  const base = text.includes("@") ? text.slice(0, text.indexOf("@")) : text;
  const words = base
    .split(/[\s._\-+]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1
      ? Array.from(words[0]!).slice(0, 2).join("")
      : Array.from(words[0]!)[0]! + Array.from(words[words.length - 1]!)[0]!;
  return letters.toLocaleUpperCase("en-GB");
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

/** "owner" -> "Owner". Unknown roles are shown as "Member". */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? "Member";
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  landlord: "Landlord",
  property_manager: "Property manager",
};

/**
 * "property_manager" -> "Property manager". Anything missing or unknown is
 * shown as "Property manager", the provisional answer to D-5 (and the type
 * organisations made before set-up existed were given).
 */
export function accountTypeLabel(accountType?: string | null): string {
  const label = accountType ? ACCOUNT_TYPE_LABELS[accountType] : undefined;
  return label ?? "Property manager";
}

/**
 * The first name for a greeting: "Taylor Example" -> "Taylor". Null when
 * there is no name, so the greeting can leave it out.
 */
export function firstNameOf(fullName?: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
