import { accountTypeLabel } from "@/lib/people";

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium break-words">{children}</dd>
    </div>
  );
}

/**
 * The organisation's details from set-up: name, kind of account and
 * contact email. Read-only for now.
 */
export function OrganisationDetails({
  name,
  accountType,
  contactEmail,
}: {
  name: string;
  accountType: string | null;
  contactEmail: string | null;
}) {
  return (
    <section
      aria-labelledby="organisation-heading"
      className="flex flex-col gap-4 rounded-xl border p-4 sm:p-6"
    >
      <h2 id="organisation-heading" className="text-xl font-semibold">
        Organisation
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Name">{name}</Detail>
        <Detail label="Kind of account">{accountTypeLabel(accountType)}</Detail>
        <Detail label="Contact email">{contactEmail ?? "Not added yet"}</Detail>
      </dl>
    </section>
  );
}
