import { HousePlusIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { primaryActionClass } from "@/components/app/action-classes";
import { EmptyState } from "@/components/app/empty-state";
import { FilterTabs } from "@/components/app/filter-tabs";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { HomeCard } from "@/components/homes/home-card";
import { HomesTable } from "@/components/homes/homes-table";
import {
  homesListHref,
  parseHomesSort,
  parsePageNumber,
} from "@/lib/homes-sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { hasRoleAtLeast } from "@/server/context";
import { listHomes } from "@/server/homes";

export const metadata: Metadata = { title: "Properties" };

/** The Properties list (list page template, docs/DESIGN_SYSTEM.md §3). */
export default async function HomesPage({ searchParams }: PageProps<"/homes">) {
  const user = await requireUser();
  const params = await searchParams;
  const page = parsePageNumber(params.page);
  const sort = parseHomesSort(params);
  const showArchived = params.archived === "1";

  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [{ homes, total, pageCount }, canAdd] = await Promise.all([
    listHomes(ctx, { page, includeArchived: showArchived, sort }),
    // Staff can look but not add (docs/DESIGN_SYSTEM.md §8).
    hasRoleAtLeast(ctx, "manager"),
  ]);

  const isEmpty = total === 0 && !showArchived;

  const addHome = (
    <Link href="/homes/new" className={primaryActionClass}>
      <PlusIcon aria-hidden="true" className="size-4.5" />
      Add a home
    </Link>
  );

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Properties"
        count={isEmpty ? undefined : total}
        countLabel={total === 1 ? "home" : "homes"}
        description={
          isEmpty ? undefined : "Every home you let, with its rooms and owner."
        }
        actions={
          isEmpty || !canAdd ? undefined : (
            <span className="hidden sm:inline-flex">{addHome}</span>
          )
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={<HousePlusIcon />}
          title={canAdd ? "Add your first home" : "No homes yet"}
          description={
            canAdd
              ? "Start with one home you let. You can add its rooms, and the owner if you rent it from someone, in a few short steps."
              : "Homes your organisation adds will show here."
          }
          action={
            canAdd ? (
              <Link
                href="/homes/new"
                className={cn(primaryActionClass, "w-full sm:w-auto")}
              >
                <PlusIcon aria-hidden="true" className="size-4.5" />
                Add a home
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <FilterTabs
            label="Filter homes"
            tabs={[
              {
                label: "Current",
                href: homesListHref({ archived: false, sort }),
                active: !showArchived,
              },
              {
                label: "Including archived",
                href: homesListHref({ archived: true, sort }),
                active: showArchived,
              },
            ]}
          />

          {homes.length === 0 ? (
            <p className="text-base text-muted-foreground">
              No homes on this page.
            </p>
          ) : (
            <>
              {/* Phones and tablets: photo cards. Each card is one link. */}
              <ul className="grid grid-cols-1 gap-x-4 gap-y-6 min-[480px]:grid-cols-2 md:grid-cols-3 lg:hidden">
                {homes.map((home) => (
                  <li key={home.id}>
                    <HomeCard home={home} />
                  </li>
                ))}
              </ul>
              {/* Wide screens: a table that can be sorted by its headings. */}
              <div className="hidden lg:block">
                <HomesTable homes={homes} sort={sort} archived={showArchived} />
              </div>
            </>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            previousHref={homesListHref({
              page: page - 1,
              archived: showArchived,
              sort,
            })}
            nextHref={homesListHref({
              page: page + 1,
              archived: showArchived,
              sort,
            })}
          />
        </>
      )}

      {/* Phone: the main action stays in reach above the bottom bar. */}
      {!isEmpty && canAdd ? (
        <div className="sticky bottom-20 z-30 sm:hidden">
          <Link
            href="/homes/new"
            className={cn(primaryActionClass, "w-full shadow-lg")}
          >
            <PlusIcon aria-hidden="true" className="size-4.5" />
            Add a home
          </Link>
        </div>
      ) : null}
    </section>
  );
}
