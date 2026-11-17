import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RentRowItem } from "@/components/rent/rent-row";
import { buttonVariants } from "@/components/ui/button";
import { todayInLondon } from "@/lib/dates";
import { parsePageNumber } from "@/lib/homes-sort";
import { formatPence } from "@/lib/money";
import {
  addMonths,
  formatMonth,
  monthOf,
  parseMonthParam,
  RENT_STATUS_LABELS,
  RENT_STATUSES,
  rentHref,
} from "@/lib/rent";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getRentMonth } from "@/server/rent";

export const metadata: Metadata = { title: "Rent" };

const navButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "h-12 gap-1 px-4 text-base",
);

/**
 * Rent for one month: every tenant with rent that month, late tenants
 * first. The month is in the address (`/rent?month=2026-10`); with no month
 * it is this month in London.
 */
export default async function RentPage({ searchParams }: PageProps<"/rent">) {
  const user = await requireUser();
  const params = await searchParams;

  const today = todayInLondon();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(params.month, currentMonth);
  const isCurrentMonth = month === currentMonth;

  const supabase = await createClient();
  const rent = await getRentMonth(
    { supabase, userId: user.id },
    { month, page: parsePageNumber(params.page) },
    today,
  );

  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const leftPence = Math.max(0, rent.expectedPence - rent.receivedPence);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Rent</h1>
        <p className="text-xl font-medium" aria-live="polite">
          {formatMonth(month)}
        </p>
      </div>

      <nav aria-label="Months" className="flex flex-wrap items-center gap-3">
        <Link
          href={rentHref({ month: previousMonth, currentMonth })}
          className={navButtonClass}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
          {formatMonth(previousMonth)}
        </Link>
        {!isCurrentMonth ? (
          <>
            <Link
              href={rentHref({ month: nextMonth, currentMonth })}
              className={navButtonClass}
            >
              {formatMonth(nextMonth)}
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </Link>
            <Link
              href="/rent"
              className="inline-flex min-h-11 items-center text-base underline underline-offset-4"
            >
              Back to this month
            </Link>
          </>
        ) : null}
      </nav>

      {rent.total === 0 ? (
        <div className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <h2 className="text-xl font-semibold">
            No rent for {formatMonth(month)}
          </h2>
          <p className="text-base text-muted-foreground">
            {isCurrentMonth
              ? "Rent shows here for each tenant. Add a tenant from one of your homes to get started."
              : "No tenant had rent to pay in this month."}
          </p>
          {isCurrentMonth ? (
            <Link
              href="/homes"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full px-6 text-base sm:w-auto",
              )}
            >
              Go to homes
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <dt className="text-base text-muted-foreground">Rent expected</dt>
              <dd className="text-2xl font-semibold">
                {formatPence(rent.expectedPence)}
              </dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-base text-muted-foreground">Received</dt>
              <dd className="text-2xl font-semibold">
                {formatPence(rent.receivedPence)}
              </dd>
            </div>
            <div className="rounded-xl border p-4">
              <dt className="text-base text-muted-foreground">Left to pay</dt>
              <dd className="text-2xl font-semibold">
                {formatPence(leftPence)}
              </dd>
            </div>
          </dl>

          <p className="text-base text-muted-foreground">
            {RENT_STATUSES.filter((status) => rent.counts[status] > 0)
              .map(
                (status) =>
                  `${rent.counts[status]} ${RENT_STATUS_LABELS[status].toLowerCase()}`,
              )
              .join(", ")}
          </p>

          <ul
            aria-label={`Rent for ${formatMonth(month)}`}
            className="flex flex-col divide-y rounded-xl border"
          >
            {rent.rows.map((row) => (
              <RentRowItem
                key={row.chargeId}
                row={row}
                canRemovePayments={rent.canRemovePayments}
              />
            ))}
          </ul>

          {rent.pageCount > 1 ? (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-3"
            >
              {rent.page > 1 ? (
                <Link
                  href={rentHref({
                    month,
                    currentMonth,
                    page: rent.page - 1,
                  })}
                  className={navButtonClass}
                >
                  <ChevronLeftIcon aria-hidden="true" className="size-5" />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <p className="text-base text-muted-foreground">
                Page {rent.page} of {rent.pageCount}
              </p>
              {rent.page < rent.pageCount ? (
                <Link
                  href={rentHref({
                    month,
                    currentMonth,
                    page: rent.page + 1,
                  })}
                  className={navButtonClass}
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
    </section>
  );
}
