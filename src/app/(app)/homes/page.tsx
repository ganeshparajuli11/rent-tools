import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { HomeCard } from "@/components/homes/home-card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { listHomes } from "@/server/homes";

export const metadata: Metadata = { title: "Homes" };

function pageNumber(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function listHref(page: number, archived: boolean) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (archived) params.set("archived", "1");
  const qs = params.toString();
  return qs ? `/homes?${qs}` : "/homes";
}

const addButtonClass = cn(
  buttonVariants({ size: "lg" }),
  "h-12 gap-2 px-6 text-base",
);

export default async function HomesPage({ searchParams }: PageProps<"/homes">) {
  const user = await requireUser();
  const params = await searchParams;
  const page = pageNumber(params.page);
  const showArchived = params.archived === "1";

  const supabase = await createClient();
  const { homes, total, pageCount } = await listHomes(
    { supabase, userId: user.id },
    { page, includeArchived: showArchived },
  );

  const isEmpty = total === 0 && !showArchived;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Homes</h1>
        {!isEmpty ? (
          <Link
            href="/homes/new"
            className={cn(addButtonClass, "hidden sm:inline-flex")}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
            Add a home
          </Link>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-6">
          <h2 className="text-xl font-semibold">Add your first home</h2>
          <p className="text-base text-muted-foreground">
            Start with one home you let. You can add its rooms, and the owner if
            you rent it from someone, in a few short steps.
          </p>
          <Link
            href="/homes/new"
            className={cn(addButtonClass, "w-full sm:w-auto")}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
            Add a home
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {homes.map((home) => (
              <li key={home.id}>
                <HomeCard home={home} />
              </li>
            ))}
          </ul>

          {homes.length === 0 ? (
            <p className="text-base text-muted-foreground">
              No homes on this page.
            </p>
          ) : null}

          {pageCount > 1 ? (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={listHref(page - 1, showArchived)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-12 gap-1 px-4 text-base",
                  )}
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <p className="text-base text-muted-foreground">
                Page {page} of {pageCount}
              </p>
              {page < pageCount ? (
                <Link
                  href={listHref(page + 1, showArchived)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-12 gap-1 px-4 text-base",
                  )}
                >
                  Next
                  <ChevronRightIcon aria-hidden="true" className="size-5" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}

      <Link
        href={listHref(1, !showArchived)}
        className="inline-flex min-h-11 items-center self-start text-base underline underline-offset-4"
      >
        {showArchived ? "Hide archived homes" : "Show archived homes"}
      </Link>

      {/* Phone: the main action stays in reach above the bottom bar. */}
      {!isEmpty ? (
        <div className="sticky bottom-20 z-30 sm:hidden">
          <Link
            href="/homes/new"
            className={cn(addButtonClass, "w-full shadow-lg")}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
            Add a home
          </Link>
        </div>
      ) : null}
    </section>
  );
}
