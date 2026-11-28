/**
 * Small helpers for owner records, shared by the server and the pages.
 * Pure functions, so they are easy to test.
 */

type OwnerNameParts = {
  ownerType: string;
  fullName: string | null;
  companyName: string | null;
};

/** The name to show: the company's name, or the person's. */
export function ownerDisplayName(owner: OwnerNameParts): string {
  const name =
    owner.ownerType === "company"
      ? (owner.companyName ?? owner.fullName)
      : (owner.fullName ?? owner.companyName);
  return name?.trim() || "Unnamed owner";
}

/** "Person" or "Company", for chips and tables. */
export function ownerTypeLabel(ownerType: string): string {
  return ownerType === "company" ? "Company" : "Person";
}

/** The rent an organisation pays an owner each month (current leases only). */
export function monthlyRentToOwner(
  leases: { rent_pence: number; end_date: string | null }[],
): number {
  return leases.reduce(
    (sum, lease) => (lease.end_date === null ? sum + lease.rent_pence : sum),
    0,
  );
}

/** "1 home", "3 homes". */
export function homesCountLabel(count: number): string {
  return `${count} ${count === 1 ? "home" : "homes"}`;
}

/** Address on one line, leaving out the parts that are empty. */
export function oneLineAddress(parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

type Param = string | string[] | undefined;

/** The owners list address: `/owners`, `/owners?archived=1&page=2`. */
export function ownersListHref({
  page = 1,
  archived = false,
}: {
  page?: number;
  archived?: boolean;
}): string {
  const params = new URLSearchParams();
  if (archived) params.set("archived", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/owners?${query}` : "/owners";
}

/** True when the address asks for archived owners (`?archived=1`). */
export function parseArchivedParam(value: Param): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
