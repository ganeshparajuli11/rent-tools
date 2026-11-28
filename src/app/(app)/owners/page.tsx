import { PlusIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { primaryActionClass } from "@/components/app/action-classes";
import { EmptyState } from "@/components/app/empty-state";
import { FilterTabs } from "@/components/app/filter-tabs";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { OwnerCard, OwnersTable } from "@/components/owners/owners-list";
import { parsePageNumber } from "@/lib/homes-sort";
import { ownersListHref, parseArchivedParam } from "@/lib/owners";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { listOwners } from "@/server/owners";

export const metadata: Metadata = { title: "Owners" };

/** The Owners list (list page template, docs/DESIGN_SYSTEM.md §3). */
export default async function OwnersPage({
  searchParams,
}: PageProps<"/owners">) {
  const user = await requireUser();
  const params = await searchParams;
  const page = parsePageNumber(params.page);
  const archived = parseArchivedParam(params.archived);

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [{ owners, total, pageCount }, canAdd] = await Promise.all([
    listOwners(ctx, { page, archived }),
    // Staff can look but not add (docs/DESIGN_SYSTEM.md §8).
    hasRoleAtLeast(ctx, "manager"),
  ]);

  const isEmpty = total === 0 && !archived;

  const addOwner = (
    <Link href="/owners/new" className={primaryActionClass}>
      <PlusIcon aria-hidden="true" className="size-4.5" />
      Add an owner
    </Link>
  );

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Owners"
        count={isEmpty ? undefined : total}
        countLabel={total === 1 ? "owner" : "owners"}
        description={
          isEmpty
            ? undefined
            : "The people and companies who own the homes you let or manage."
        }
        actions={
          isEmpty || !canAdd ? undefined : (
            <span className="hidden sm:inline-flex">{addOwner}</span>
          )
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={<UserPlusIcon />}
          title={canAdd ? "Add your first owner" : "No owners yet"}
          description={
            canAdd
              ? "Keep each owner's details in one place and link them to the homes they own. If you own your homes yourself, you can skip this."
              : "Owners your organisation adds will show here."
          }
          action={
            canAdd ? (
              <Link
                href="/owners/new"
                className={cn(primaryActionClass, "w-full sm:w-auto")}
              >
                <PlusIcon aria-hidden="true" className="size-4.5" />
                Add an owner
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <FilterTabs
            label="Filter owners"
            tabs={[
              {
                label: "Current",
                href: ownersListHref({ archived: false }),
                active: !archived,
              },
              {
                label: "Archived",
                href: ownersListHref({ archived: true }),
                active: archived,
              },
            ]}
          />

          {owners.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {archived && page === 1
                ? "No archived owners."
                : "No owners on this page."}
            </p>
          ) : (
            <>
              {/* Phones and tablets: cards. Each card is one link. */}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {owners.map((owner) => (
                  <li key={owner.id}>
                    <OwnerCard owner={owner} />
                  </li>
                ))}
              </ul>
              {/* Wide screens: a table. */}
              <div className="hidden lg:block">
                <OwnersTable owners={owners} />
              </div>
            </>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            previousHref={ownersListHref({ page: page - 1, archived })}
            nextHref={ownersListHref({ page: page + 1, archived })}
          />
        </>
      )}

      {/* Phone: the main action stays in reach above the bottom bar. */}
      {!isEmpty && canAdd ? (
        <div className="sticky bottom-20 z-30 sm:hidden">
          <Link
            href="/owners/new"
            className={cn(primaryActionClass, "w-full shadow-lg")}
          >
            <PlusIcon aria-hidden="true" className="size-4.5" />
            Add an owner
          </Link>
        </div>
      ) : null}
    </section>
  );
}
