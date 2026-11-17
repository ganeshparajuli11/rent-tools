import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatPence } from "@/lib/money";
import { formatMonth, rentHref } from "@/lib/rent";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getDashboard } from "@/server/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

/** How many rows each list shows before "and N more". */
const LIST_LIMIT = 10;
const HOMES_LIMIT = 20;

const rowLinkClass =
  "flex min-h-16 items-center gap-3 p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

/** Money that can be below zero: "-£50" when more is owed than comes in. */
function formatSigned(pence: number): string {
  return pence < 0 ? `-${formatPence(-pence)}` : formatPence(pence);
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-4">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
      {note ? (
        <dd className="text-base text-muted-foreground">{note}</dd>
      ) : null}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  // Read through the user's own session (publishable key), so RLS decides
  // which rows come back.
  const supabase = await createClient();
  const dashboard = await getDashboard({ supabase, userId: user.id });

  if (!dashboard) {
    return (
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Your account is not set up yet. Please sign out and sign in again.
        </p>
      </section>
    );
  }

  const { summary, organisationName } = dashboard;
  const monthName = formatMonth(summary.month);
  const hasHomes = summary.homes.length > 0;
  const leftPence = Math.max(0, summary.expectedPence - summary.receivedPence);
  const overdueShown = summary.overdue.slice(0, LIST_LIMIT);
  const emptyShown = summary.empty.slice(0, LIST_LIMIT);
  const homesShown = summary.homes.slice(0, HOMES_LIMIT);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-base break-words text-muted-foreground">
          {organisationName}, {monthName}
        </p>
      </div>

      {!hasHomes ? (
        <div className="flex max-w-xl flex-col items-start gap-4 rounded-xl border border-dashed p-6">
          <h2 className="text-xl font-semibold">Add your first home</h2>
          <p className="text-base text-muted-foreground">
            Add a home and its tenants, and your rent for the month will show
            here.
          </p>
          <Link
            href="/homes/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 w-full px-6 text-base sm:w-auto",
            )}
          >
            Add a home
          </Link>
        </div>
      ) : (
        <>
          <section
            aria-labelledby="this-month-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="this-month-heading" className="text-xl font-semibold">
              This month
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Figure
                label="Rent expected"
                value={formatPence(summary.expectedPence)}
              />
              <Figure
                label="Rent received"
                value={formatPence(summary.receivedPence)}
                note={`${formatPence(leftPence)} left to pay`}
              />
              <Figure
                label="Rent owed to owners"
                value={formatPence(summary.owedToOwnersPence)}
              />
              <Figure
                label="Left after owners"
                value={formatSigned(summary.marginPence)}
                note="Rent expected, less rent owed to owners"
              />
            </dl>
            <Link
              href="/rent"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 gap-2 px-6 text-base sm:self-start",
              )}
            >
              See this month&apos;s rent
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </Link>
          </section>

          <section
            aria-labelledby="overdue-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="overdue-heading" className="text-xl font-semibold">
              Late rent
            </h2>
            {summary.overdue.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Nobody is late with their rent.
              </p>
            ) : (
              <>
                <p className="text-base">
                  {summary.overdue.length === 1
                    ? "1 tenant is late."
                    : `${summary.overdue.length} tenants are late.`}{" "}
                  <span className="font-semibold">
                    {formatPence(summary.overdueTotalPence)}
                  </span>{" "}
                  is late in total.
                </p>
                <ul
                  aria-labelledby="overdue-heading"
                  className="flex flex-col divide-y rounded-xl border"
                >
                  {overdueShown.map((tenant) => (
                    <li key={tenant.tenancyId}>
                      <Link
                        href={rentHref({
                          month: tenant.oldestMonth,
                          currentMonth: summary.month,
                        })}
                        className={rowLinkClass}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-base font-semibold break-words">
                            {tenant.name}
                          </span>
                          <span className="text-base text-muted-foreground">
                            {tenant.roomName
                              ? `${tenant.roomName}, ${tenant.homeName}`
                              : tenant.homeName}
                          </span>
                        </span>
                        <span className="flex flex-col items-end text-base">
                          <span className="font-semibold">
                            {formatPence(tenant.owedPence)} late
                          </span>
                          <span className="text-muted-foreground">
                            {tenant.monthsLate === 1
                              ? `since ${formatMonth(tenant.oldestMonth)}`
                              : `${tenant.monthsLate} months, since ${formatMonth(tenant.oldestMonth)}`}
                          </span>
                        </span>
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                {summary.overdue.length > overdueShown.length ? (
                  <p className="text-base text-muted-foreground">
                    And {summary.overdue.length - overdueShown.length} more. The
                    rent page lists everyone, month by month.
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section
            aria-labelledby="empty-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="empty-heading" className="text-xl font-semibold">
              Empty rooms
            </h2>
            {summary.empty.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Every room and home has a tenant.
              </p>
            ) : (
              <>
                <ul
                  aria-labelledby="empty-heading"
                  className="flex flex-col divide-y rounded-xl border"
                >
                  {emptyShown.map((place) => (
                    <li key={place.roomId ?? place.homeId}>
                      <Link
                        href={`/homes/${place.homeId}`}
                        className={rowLinkClass}
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-base font-semibold break-words">
                            {place.roomName ?? "Whole home"}
                          </span>
                          <span className="text-base text-muted-foreground">
                            {place.homeName}
                          </span>
                        </span>
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                {summary.empty.length > emptyShown.length ? (
                  <p className="text-base text-muted-foreground">
                    And {summary.empty.length - emptyShown.length} more.
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section
            aria-labelledby="homes-heading"
            className="flex flex-col gap-3"
          >
            <h2 id="homes-heading" className="text-xl font-semibold">
              Each home this month
            </h2>
            <ul
              aria-labelledby="homes-heading"
              className="flex flex-col divide-y rounded-xl border"
            >
              {homesShown.map((home) => (
                <li
                  key={home.id}
                  className="flex flex-col gap-2 p-4 lg:grid lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] lg:items-center lg:gap-x-6"
                >
                  <Link
                    href={`/homes/${home.id}`}
                    className="inline-flex min-h-11 items-center self-start text-base font-semibold break-words underline underline-offset-4"
                  >
                    {home.name}
                  </Link>
                  <span className="text-base">
                    <span className="text-muted-foreground">Rent </span>
                    {formatPence(home.expectedPence)}
                  </span>
                  <span className="text-base">
                    <span className="text-muted-foreground">Owner </span>
                    {home.ownerRentPence > 0
                      ? formatPence(home.ownerRentPence)
                      : "None"}
                  </span>
                  <span className="text-base font-semibold">
                    <span className="font-normal text-muted-foreground">
                      Left{" "}
                    </span>
                    {formatSigned(home.marginPence)}
                  </span>
                </li>
              ))}
            </ul>
            {summary.homes.length > homesShown.length ? (
              <p className="text-base text-muted-foreground">
                And {summary.homes.length - homesShown.length} more homes.
              </p>
            ) : null}
          </section>
        </>
      )}
    </section>
  );
}
