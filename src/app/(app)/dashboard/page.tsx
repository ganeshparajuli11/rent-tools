import {
  CircleCheckIcon,
  DoorOpenIcon,
  HousePlusIcon,
  PoundSterlingIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  primaryActionClass,
  secondaryActionClass,
} from "@/components/app/action-classes";
import {
  type ActivityItem,
  ActivityTimeline,
} from "@/components/app/activity-timeline";
import { Avatar } from "@/components/app/avatar";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
} from "@/components/app/data-table";
import { EmptyState } from "@/components/app/empty-state";
import { FilterTabs } from "@/components/app/filter-tabs";
import { PhotoCard } from "@/components/app/photo-card";
import { SectionCard } from "@/components/app/section-card";
import { ProgressBar, StatCard, StatGrid } from "@/components/app/stat-card";
import { MarkPaidButton } from "@/components/rent/mark-paid-button";
import { RentStatusBadge } from "@/components/rent/rent-status-badge";
import { formatPence } from "@/lib/money";
import { firstNameOf } from "@/lib/people";
import { formatMonth } from "@/lib/rent";
import { createClient } from "@/lib/supabase/server";
import {
  activityWhen,
  daysBetween,
  describeActivity,
  filterRentRows,
  formatShortDate,
  formatTodayLine,
  greetingLine,
  londonHour,
  longEmptyPlaces,
  monthRentRows,
  type NeedsYouItem,
  needsYouItems,
  needsYouSentence,
  occupancy,
  parseRentFilter,
  rentFilterCounts,
  TODAY_RENT_FILTER_LABELS,
  TODAY_RENT_FILTERS,
  type TodayRentFilter,
  todayRentHref,
  type TodayRentRow,
} from "@/lib/today";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { type Dashboard, getDashboard } from "@/server/dashboard";
import { getFullName } from "@/server/organisation";

export const metadata: Metadata = { title: "Today" };

/** How many "Needs you" items show before "and N more". */
const NEEDS_YOU_LIMIT = 5;
/** Rows in "Rent this month" before "See all rent". */
const RENT_ROWS_LIMIT = 10;
/** Above this many places, "Rooms let" shows a bar instead of one dash each. */
const MAX_ROOM_DASHES = 24;

/** Money that can be below zero: "-£50" when more is owed than comes in. */
function formatSigned(pence: number): string {
  return pence < 0 ? `-${formatPence(-pence)}` : formatPence(pence);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Today (docs/DESIGN_SYSTEM.md §3.1, mockup docs/design/today-dashboard.dc.html):
 * what needs the user first, then this month's figures, their homes, this
 * month's rent with "Mark as paid", and recent activity. Repairs and
 * tenancies ending soon join "Needs you" once those features exist
 * (roadmap D2 and D5).
 *
 * Every figure comes from the database through `getDashboard` and the
 * tested helpers in src/lib/dashboard.ts and src/lib/today.ts, so it
 * matches the rent page. Archived homes and rooms are left out of
 * occupancy, homes and "Needs you"; rent charged to them this month still
 * counts, as on the rent page.
 */
export default async function TodayPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const user = await requireUser();
  const params = await searchParams;

  // Read through the user's own session (publishable key), so RLS decides
  // which rows come back.
  const supabase = await createClient();
  const ctx = { supabase, userId: user.id };
  const [dashboard, fullName] = await Promise.all([
    getDashboard(ctx),
    getFullName(ctx),
  ]);

  // A new account sets up its organisation first.
  if (!dashboard) redirect("/setup");

  const { today, summary, homes } = dashboard;
  const greeting = greetingLine(londonHour(), firstNameOf(fullName));
  const dateLine = formatTodayLine(today);

  if (homes.length === 0) {
    return (
      <div className="flex flex-col gap-7">
        <Greeting
          dateLine={dateLine}
          greeting={greeting}
          sentence="Welcome to PropDesk. Add your first home to get started."
        />
        <FirstSteps />
      </div>
    );
  }

  const longEmpty = longEmptyPlaces(homes, today);
  const needsYou = needsYouItems({
    overdue: summary.overdue,
    empty: longEmpty,
    today,
  });

  return (
    <div className="flex flex-col gap-7">
      <Greeting
        dateLine={dateLine}
        greeting={greeting}
        sentence={needsYouSentence(needsYou.length)}
      />

      <Figures dashboard={dashboard} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <NeedsYou items={needsYou} />
        <YourHomes dashboard={dashboard} />
      </div>

      <RentThisMonth
        dashboard={dashboard}
        filter={parseRentFilter(params.rent)}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <RecentActivity dashboard={dashboard} />
      </div>
    </div>
  );
}

function Greeting({
  dateLine,
  greeting,
  sentence,
}: {
  dateLine: string;
  greeting: string;
  sentence: string;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-sm text-muted-foreground">{dateLine}</p>
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] lg:text-4xl">
        {greeting}
      </h1>
      <p className="text-base text-ink-2">{sentence}</p>
    </header>
  );
}

/** A brand new organisation: what to do first, instead of empty figures. */
function FirstSteps() {
  return (
    <EmptyState
      icon={<HousePlusIcon />}
      title="Add your first property"
      description={
        <div className="flex flex-col gap-3">
          <p>Three steps and this page fills in by itself:</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-ink-2">
            <li>Add a home, and its rooms if you let it by the room.</li>
            <li>Add the tenants who live there and the rent they pay.</li>
            <li>Mark rent as paid when it comes in.</li>
          </ol>
        </div>
      }
      action={
        <Link
          href="/homes/new"
          className={cn(primaryActionClass, "w-full sm:w-auto")}
        >
          Add a home
        </Link>
      }
    />
  );
}

function Figures({ dashboard }: { dashboard: Dashboard }) {
  const { summary, homes, today } = dashboard;
  const monthName = formatMonth(summary.month).split(" ")[0] ?? "";
  const leftToCome = Math.max(0, summary.expectedPence - summary.receivedPence);
  const share =
    summary.expectedPence > 0
      ? Math.min(
          100,
          Math.round((summary.receivedPence / summary.expectedPence) * 100),
        )
      : 0;

  const lateCount = summary.overdue.length;
  const oldestLate = summary.overdue[0];
  const oldestDays = oldestLate
    ? Math.max(1, daysBetween(oldestLate.oldestDueDate, today))
    : 0;
  const lateNote =
    lateCount === 0
      ? "Nobody is late"
      : lateCount === 1
        ? `1 tenant · ${plural(oldestDays, "day", "days")} overdue`
        : `${lateCount} tenants · up to ${plural(oldestDays, "day", "days")} overdue`;

  const ownedHomes = summary.homes.filter((h) => h.ownerRentPence > 0).length;
  const ownersNote =
    summary.owedToOwnersPence > 0
      ? `${formatPence(summary.owedToOwnersPence)} owed to owners for ${plural(ownedHomes, "home", "homes")}`
      : "No rent owed to owners this month";

  const places = occupancy(homes);

  return (
    <StatGrid>
      <StatCard
        label={`Rent received, ${monthName}`}
        value={formatPence(summary.receivedPence)}
        suffix={`of ${formatPence(summary.expectedPence)}`}
        note={
          summary.expectedPence > 0
            ? `${share}% in · ${formatPence(leftToCome)} still to come`
            : "No rent due this month yet"
        }
      >
        <ProgressBar
          value={summary.receivedPence}
          max={summary.expectedPence}
          label={`${share}% of this month's rent received`}
        />
      </StatCard>
      <StatCard
        label="Late rent"
        value={formatPence(summary.overdueTotalPence)}
        tone={summary.overdueTotalPence > 0 ? "bad" : "default"}
        note={lateNote}
      />
      <StatCard
        label="Left after owners"
        value={formatSigned(summary.marginPence)}
        tone={
          summary.marginPence < 0
            ? "bad"
            : summary.marginPence > 0
              ? "good"
              : "default"
        }
        note={ownersNote}
      />
      <StatCard
        label="Rooms let"
        value={String(places.let)}
        suffix={`of ${places.total}`}
      >
        {places.total > MAX_ROOM_DASHES ? (
          <ProgressBar
            value={places.let}
            max={places.total}
            label={`${places.let} of ${places.total} rooms let`}
          />
        ) : (
          <div
            role="img"
            aria-label={`${places.let} of ${places.total} rooms let`}
            className="flex gap-1"
          >
            {Array.from({ length: places.total }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  index < places.let ? "bg-ink" : "bg-border",
                )}
              />
            ))}
          </div>
        )}
      </StatCard>
    </StatGrid>
  );
}

const NEEDS_YOU_ICONS = {
  late: { Icon: PoundSterlingIcon, className: "bg-bad-soft text-bad" },
  empty: { Icon: DoorOpenIcon, className: "bg-subtle text-ink-2" },
} as const;

function NeedsYou({ items }: { items: NeedsYouItem[] }) {
  const shown = items.slice(0, NEEDS_YOU_LIMIT);
  const hidden = items.length - shown.length;
  return (
    <SectionCard
      id="needs-you"
      title="Needs you"
      className="gap-1"
      action={
        <span className="text-[13px] text-muted-foreground">
          {plural(items.length, "item", "items")}
        </span>
      }
    >
      {items.length === 0 ? (
        <p className="flex items-center gap-3 border-t border-divider py-3.5 text-base text-muted-foreground">
          <CircleCheckIcon aria-hidden="true" className="size-5 text-good" />
          Nothing needs you right now.
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((item) => {
            const { Icon, className } = NEEDS_YOU_ICONS[item.kind];
            return (
              <li
                key={item.key}
                className="flex flex-wrap items-center gap-3.5 border-t border-divider py-3.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 flex-none items-center justify-center rounded-xl",
                    className,
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold break-words">
                    {item.title}
                  </span>
                  <span className="text-[13px] break-words text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <Link
                  href={item.href}
                  aria-label={`${item.action}: ${item.title}`}
                  className={cn(
                    secondaryActionClass,
                    "px-3.5 text-sm lg:min-h-10",
                  )}
                >
                  {item.action}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {hidden > 0 ? (
        <p className="border-t border-divider pt-3.5 text-[13px] text-muted-foreground">
          And {hidden} more.{" "}
          <Link
            href="/rent"
            className="font-medium text-ink underline underline-offset-4"
          >
            See rent
          </Link>{" "}
          or{" "}
          <Link
            href="/homes"
            className="font-medium text-ink underline underline-offset-4"
          >
            your homes
          </Link>
          .
        </p>
      ) : null}
    </SectionCard>
  );
}

function YourHomes({ dashboard }: { dashboard: Dashboard }) {
  const cards = dashboard.homeCards;
  return (
    <SectionCard
      id="your-homes"
      title="Your homes"
      action={
        <Link
          href="/homes"
          className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline lg:min-h-0"
        >
          View all
        </Link>
      }
    >
      {cards.length === 0 ? (
        <p className="text-base text-muted-foreground">
          Every home is archived.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5">
          {cards.map((home) => (
            <li key={home.id} className="min-w-0">
              <PhotoCard
                href={`/homes/${home.id}`}
                photoUrl={home.photoUrl}
                title={home.name}
                meta={home.meta}
                chip={{ label: home.status.label, tone: home.status.tone }}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

const EMPTY_FILTER_TEXT: Record<TodayRentFilter, string> = {
  all: "No rent is due this month yet. Rent shows here once a tenant has rent to pay.",
  late: "Nobody is late with this month's rent.",
  due: "No rent is still due this month.",
  paid: "No rent has been paid this month yet.",
};

function placeOf(row: TodayRentRow): string {
  return row.roomName ? `${row.homeName} · ${row.roomName}` : row.homeName;
}

function RentAmount({ row }: { row: TodayRentRow }) {
  if (row.paidPence > 0 && row.status !== "paid") {
    return (
      <>
        {formatPence(row.paidPence)}{" "}
        <span className="text-muted-foreground">
          of {formatPence(row.amountPence)}
        </span>
      </>
    );
  }
  return <>{formatPence(row.amountPence)}</>;
}

function RentThisMonth({
  dashboard,
  filter,
}: {
  dashboard: Dashboard;
  filter: TodayRentFilter;
}) {
  const allRows = monthRentRows(
    dashboard.homes,
    dashboard.charges,
    dashboard.today,
  );
  const counts = rentFilterCounts(allRows);
  const rows = filterRentRows(allRows, filter);
  const shown = rows.slice(0, RENT_ROWS_LIMIT);
  const label = `Rent for ${formatMonth(dashboard.summary.month)}`;

  return (
    <SectionCard
      id="rent"
      title="Rent this month"
      action={
        <FilterTabs
          label="Filter rent"
          tabs={TODAY_RENT_FILTERS.map((key) => ({
            label: TODAY_RENT_FILTER_LABELS[key],
            href: todayRentHref(key),
            active: key === filter,
            count: counts[key],
          }))}
        />
      }
    >
      {rows.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {EMPTY_FILTER_TEXT[filter]}
        </p>
      ) : (
        <>
          {/* Laptops and desktops: a table. */}
          <DataTable
            caption={label}
            className="hidden rounded-none border-0 bg-transparent lg:block"
          >
            <thead>
              <tr>
                <DataTableHead>Tenant</DataTableHead>
                <DataTableHead>Home</DataTableHead>
                <DataTableHead>Due</DataTableHead>
                <DataTableHead align="right">Rent</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>
                  <span className="sr-only">Action</span>
                </DataTableHead>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.chargeId}>
                  <DataTableHead scope="row">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={row.tenantName} size="sm" />
                      <Link
                        href={`/tenants/${row.tenancyId}`}
                        className="inline-flex min-h-10 items-center rounded-lg font-semibold break-words text-ink underline-offset-4 hover:underline"
                      >
                        {row.tenantName}
                      </Link>
                    </span>
                  </DataTableHead>
                  <DataTableCell>{placeOf(row)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {formatShortDate(row.dueDate)}
                  </DataTableCell>
                  <DataTableCell
                    align="right"
                    className="font-medium whitespace-nowrap text-ink"
                  >
                    <RentAmount row={row} />
                  </DataTableCell>
                  <DataTableCell>
                    <RentStatusBadge status={row.status} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    {row.status !== "paid" ? (
                      <MarkPaidButton
                        chargeId={row.chargeId}
                        tenantName={row.tenantName}
                        place={placeOf(row)}
                        canRemovePayments={dashboard.canRemovePayments}
                      />
                    ) : null}
                  </DataTableCell>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {/* Phones and tablets: one card per tenant. */}
          <ul
            aria-label={label}
            className="flex flex-col divide-y divide-divider border-t border-divider lg:hidden"
          >
            {shown.map((row) => (
              <li key={row.chargeId} className="flex flex-col gap-3 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={row.tenantName} size="sm" className="mt-1.5" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/tenants/${row.tenancyId}`}
                      className="inline-flex min-h-11 items-center self-start text-base font-semibold break-words underline-offset-4 hover:underline"
                    >
                      {row.tenantName}
                    </Link>
                    <span className="text-sm break-words text-muted-foreground">
                      {placeOf(row)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <RentStatusBadge status={row.status} />
                  <span className="font-medium text-ink tabular-nums">
                    <RentAmount row={row} />
                  </span>
                  <span className="text-muted-foreground">
                    due {formatShortDate(row.dueDate)}
                  </span>
                </div>
                {row.status !== "paid" ? (
                  <MarkPaidButton
                    chargeId={row.chargeId}
                    tenantName={row.tenantName}
                    place={placeOf(row)}
                    canRemovePayments={dashboard.canRemovePayments}
                    className="w-full sm:w-auto sm:self-start"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
        {rows.length > shown.length
          ? `Showing ${shown.length} of ${rows.length}.`
          : null}
        <Link
          href="/rent"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4 lg:min-h-0"
        >
          See all rent
        </Link>
      </p>
    </SectionCard>
  );
}

function RecentActivity({ dashboard }: { dashboard: Dashboard }) {
  const homeNames = new Map(dashboard.homes.map((h) => [h.id, h.name]));
  const tenancyHomes = new Map<string, string>();
  for (const home of dashboard.homes) {
    for (const tenancy of home.tenancies) {
      tenancyHomes.set(tenancy.id, home.name);
    }
  }
  const chargeHomes = new Map<string, string>();
  for (const charge of dashboard.charges) {
    const home = tenancyHomes.get(charge.tenancyId);
    if (charge.id && home) chargeHomes.set(charge.id, home);
  }

  const items: ActivityItem[] = [];
  for (const entry of dashboard.activity) {
    if (items.length >= dashboard.activityLimit) break;
    const text = describeActivity(entry, {
      homeNames,
      tenancyHomes,
      chargeHomes,
    });
    if (!text) continue;
    const { when, day } = activityWhen(entry.createdAt);
    items.push({ id: entry.id, text, when, dateTime: day || undefined });
  }

  return (
    <SectionCard id="activity" title="Recent activity">
      <ActivityTimeline
        items={items}
        emptyText="Nothing has happened yet. Changes you make show here."
      />
    </SectionCard>
  );
}
