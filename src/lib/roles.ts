/**
 * Roles in an organisation (PRODUCT_SPEC.md §5), highest first:
 *
 *  - owner:   everything, including settings, members and data downloads;
 *  - admin:   all records and members, but cannot change or remove an owner;
 *  - manager: homes, owners, tenants, tenancies, rent, repairs, contractors;
 *  - staff:   reads everything, records rent payments (and repairs, later);
 *             no settings, members or downloads.
 *
 * A higher role can do everything a lower one can. The same ranks are in
 * the database (private.role_rank), where row-level security enforces
 * them; the server checks them too (requireRole in src/server/context.ts)
 * so people get a plain message. The interface only hides what a role
 * cannot do; it is never the only check.
 */

export const ROLES = ["owner", "admin", "manager", "staff"] as const;

export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  staff: 1,
};

/** True for the four known role names. */
export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/**
 * True when `role` is `min` or higher. Anything that is not a known role
 * (a typo, an empty value, a role from a newer database) is never enough.
 */
export function hasRole(role: unknown, min: Role): boolean {
  return isRole(role) && RANK[role] >= RANK[min];
}

/** Who can do something that needs at least `min`, for messages. */
const WHO_CAN: Record<Role, string> = {
  owner: "the account owner",
  admin: "an owner or admin",
  manager: "an owner, admin or manager",
  staff: "anyone in your organisation",
};

/**
 * The plain message for someone whose role is too low, for example
 * "Only an owner, admin or manager can do this."
 */
export function roleTooLowMessage(min: Role): string {
  return `Only ${WHO_CAN[min]} can do this.`;
}
