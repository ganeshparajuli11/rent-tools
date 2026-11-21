import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PoundSterlingIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  primaryActionClass,
  secondaryActionClass,
} from "@/components/app/actions";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SectionCard } from "@/components/app/section-card";
import { ProgressBar, StatCard, StatGrid } from "@/components/app/stat-card";
import { RentRowItem } from "@/components/rent/rent-row";
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
  const receivedShare =
    rent.expectedPence > 0
      ? Math.min(
          100,
          Math.round((rent.receivedPence / rent.expectedPence) * 100),
        )
      : 0;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Rent"
        description={
          <p className="text-xl font-medium text-ink" aria-live="polite">
            {formatMonth(month)}
          </p>
        }
      />

      <nav aria-label="Months" className="flex flex-wrap items-center gap-2">
        <Link
          href={rentHref({ month: previousMonth, currentMonth })}
          className={secondaryActionClass}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4.5" />
          {formatMonth(previousMonth)}
        </Link>
        {!isCurrentMonth ? (
          <>
            <Link
              href={rentHref({ month: nextMonth, currentMonth })}
              className={secondaryActionClass}
            >
              {formatMonth(nextMonth)}
              <ChevronRightIcon aria-hidden="true" className="size-4.5" />
            </Link>
            <Link
              href="/rent"
              className="inline-flex min-h-11 items-center px-2 text-[15px] font-medium underline underline-offset-4"
            >
              Back to this month
            </Link>
          </>
        ) : null}
      </nav>

      {rent.total === 0 ? (
        <EmptyState
          icon={<PoundSterlingIcon />}
          title={`No rent for ${formatMonth(month)}`}
          description={
            isCurrentMonth
              ? "Rent shows here for each tenant. Add a tenant from one of your homes to get started."
              : "No tenant had rent to pay in this month."
          }
          action={
            isCurrentMonth ? (
              <Link
                href="/homes"
                className={cn(primaryActionClass, "w-full sm:w-auto")}
              >
                Go to homes
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <StatGrid>
            <StatCard
              label="Rent expected"
              value={formatPence(rent.expectedPence)}
            />
            <StatCard
              label="Received"
              value={formatPence(rent.receivedPence)}
              note={`${receivedShare}% of the rent expected`}
            >
              <ProgressBar
                value={rent.receivedPence}
                max={rent.expectedPence}
                label={`${receivedShare}% of this month's rent received`}
              />
            </StatCard>
            <StatCard label="Left to pay" value={formatPence(leftPence)} />
          </StatGrid>

          <SectionCard
            id="rent-rows"
            title="Rent by tenant"
            action={
              <p className="text-[13px] text-muted-foreground">
                {RENT_STATUSES.filter((status) => rent.counts[status] > 0)
                  .map(
                    (status) =>
                      `${rent.counts[status]} ${RENT_STATUS_LABELS[status].toLowerCase()}`,
                  )
                  .join(", ")}
              </p>
            }
          >
            <ul
              aria-label={`Rent for ${formatMonth(month)}`}
              className="flex flex-col divide-y divide-divider border-t border-divider"
            >
              {rent.rows.map((row) => (
                <RentRowItem
                  key={row.chargeId}
                  row={row}
                  canRemovePayments={rent.canRemovePayments}
                />
              ))}
            </ul>
          </SectionCard>

          <Pagination
            page={rent.page}
            pageCount={rent.pageCount}
            previousHref={rentHref({
              month,
              currentMonth,
              page: rent.page - 1,
            })}
            nextHref={rentHref({ month, currentMonth, page: rent.page + 1 })}
          />
        </>
      )}
    </section>
  );
}
