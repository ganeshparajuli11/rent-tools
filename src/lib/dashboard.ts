import {
  isBeforeMoveIn,
  monthEnd,
  monthOf,
  monthStart,
  owedPence,
} from "@/lib/rent";

/**
 * The sums behind the dashboard. Pure: it is given the homes, the rent
 * charges with what has been paid, and today's date in London, and returns
 * the figures to show. All money is whole pence.
 */

export type DashboardHome = {
  id: string;
  name: string;
  archived: boolean;
  rooms: { id: string; name: string; archived: boolean }[];
  /** Rent the landlord pays the owner of this home, if they rent it. */
  ownerLeases: {
    rentPence: number;
    startDate: string;
    endDate: string | null;
  }[];
  tenancies: {
    id: string;
    roomId: string | null;
    name: string;
    /** The day they moved in, "YYYY-MM-DD". */
    startDate: string;
    /** Empty while the tenant still lives there. */
    endDate: string | null;
  }[];
};

export type DashboardCharge = {
  tenancyId: string;
  periodStart: string;
  dueDate: string;
  amountPence: number;
  /** Payments recorded against this charge (removed payments left out). */
  paidPence: number;
};

export type HomeMargin = {
  id: string;
  name: string;
  /** Rent charged to this home's tenants this month. */
  expectedPence: number;
  receivedPence: number;
  /** Rent owed to the owner this month. 0 when there is no owner. */
  ownerRentPence: number;
  /** Rent expected minus rent owed to the owner. Can be below zero. */
  marginPence: number;
};

export type OverdueTenant = {
  tenancyId: string;
  name: string;
  homeId: string;
  homeName: string;
  roomName: string | null;
  /** Everything late, added up across months. */
  owedPence: number;
  /** How many months have late rent. */
  monthsLate: number;
  oldestDueDate: string;
  /** The month of the oldest late rent, "YYYY-MM", for a link to it. */
  oldestMonth: string;
};

export type EmptyPlace = {
  homeId: string;
  homeName: string;
  /** Null when the whole home is empty. */
  roomId: string | null;
  roomName: string | null;
};

export type DashboardSummary = {
  month: string;
  expectedPence: number;
  receivedPence: number;
  owedToOwnersPence: number;
  /** Rent expected this month minus rent owed to owners. */
  marginPence: number;
  homes: HomeMargin[];
  overdue: OverdueTenant[];
  overdueTotalPence: number;
  empty: EmptyPlace[];
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "en-GB");

/**
 * The owner rent for a home in a month: the lease that covers the month. If
 * an old lease ended and a new one started in the same month, the newest
 * one counts, so the rent is never added twice.
 */
export function ownerRentForMonth(
  leases: DashboardHome["ownerLeases"],
  month: string,
): number {
  const first = monthStart(month);
  const last = monthEnd(month);
  const active = leases
    .filter(
      (lease) =>
        lease.startDate <= last &&
        (lease.endDate === null || lease.endDate >= first),
    )
    .sort(
      (a, b) =>
        // Not ended first, then the latest start date.
        Number(a.endDate !== null) - Number(b.endDate !== null) ||
        b.startDate.localeCompare(a.startDate),
    );
  return active[0]?.rentPence ?? 0;
}

/** Rooms, or whole homes, with nobody living in them. Archived ones are left out. */
export function emptyPlaces(homes: readonly DashboardHome[]): EmptyPlace[] {
  const empty: EmptyPlace[] = [];
  for (const home of [...homes].sort(byName)) {
    if (home.archived) continue;
    const current = home.tenancies.filter((t) => t.endDate === null);
    const rooms = home.rooms.filter((room) => !room.archived);

    if (rooms.length === 0) {
      // Let as a whole home.
      if (current.length === 0) {
        empty.push({
          homeId: home.id,
          homeName: home.name,
          roomId: null,
          roomName: null,
        });
      }
      continue;
    }

    // A tenant for the whole home fills every room.
    if (current.some((t) => t.roomId === null)) continue;
    for (const room of rooms) {
      if (!current.some((t) => t.roomId === room.id)) {
        empty.push({
          homeId: home.id,
          homeName: home.name,
          roomId: room.id,
          roomName: room.name,
        });
      }
    }
  }
  return empty;
}

export function buildDashboard({
  homes,
  charges,
  today,
}: {
  homes: readonly DashboardHome[];
  charges: readonly DashboardCharge[];
  /** Today in London, "YYYY-MM-DD". */
  today: string;
}): DashboardSummary {
  const month = monthOf(today);
  const thisPeriod = monthStart(month);

  // Where each tenant lives, so a charge can be matched to its home.
  const places = new Map<
    string,
    {
      name: string;
      startDate: string;
      home: DashboardHome;
      roomName: string | null;
    }
  >();
  for (const home of homes) {
    const roomNames = new Map(home.rooms.map((room) => [room.id, room.name]));
    for (const tenancy of home.tenancies) {
      places.set(tenancy.id, {
        name: tenancy.name,
        startDate: tenancy.startDate,
        home,
        roomName: tenancy.roomId
          ? (roomNames.get(tenancy.roomId) ?? null)
          : null,
      });
    }
  }

  let expectedPence = 0;
  let receivedPence = 0;
  const perHome = new Map<string, { expected: number; received: number }>();
  const late = new Map<string, OverdueTenant>();

  for (const charge of charges) {
    const place = places.get(charge.tenancyId);

    // Left over from a move-in date that was later corrected: not real rent.
    if (
      place &&
      charge.paidPence === 0 &&
      isBeforeMoveIn(charge.periodStart, place.startDate)
    ) {
      continue;
    }

    if (charge.periodStart === thisPeriod) {
      expectedPence += charge.amountPence;
      receivedPence += charge.paidPence;
      if (place) {
        const sums = perHome.get(place.home.id) ?? { expected: 0, received: 0 };
        sums.expected += charge.amountPence;
        sums.received += charge.paidPence;
        perHome.set(place.home.id, sums);
      }
    }

    // Late: the due date has passed and it is not fully paid.
    const owed = owedPence(charge.amountPence, charge.paidPence);
    if (place && owed > 0 && today > charge.dueDate) {
      const entry = late.get(charge.tenancyId);
      if (entry) {
        entry.owedPence += owed;
        entry.monthsLate += 1;
        if (charge.dueDate < entry.oldestDueDate) {
          entry.oldestDueDate = charge.dueDate;
          entry.oldestMonth = monthOf(charge.periodStart);
        }
      } else {
        late.set(charge.tenancyId, {
          tenancyId: charge.tenancyId,
          name: place.name,
          homeId: place.home.id,
          homeName: place.home.name,
          roomName: place.roomName,
          owedPence: owed,
          monthsLate: 1,
          oldestDueDate: charge.dueDate,
          oldestMonth: monthOf(charge.periodStart),
        });
      }
    }
  }

  // One line per home that is in use, or that still had rent this month.
  const homeMargins: HomeMargin[] = [];
  let owedToOwnersPence = 0;
  for (const home of [...homes].sort(byName)) {
    const sums = perHome.get(home.id);
    if (home.archived && !sums) continue;
    const ownerRentPence = home.archived
      ? 0
      : ownerRentForMonth(home.ownerLeases, month);
    owedToOwnersPence += ownerRentPence;
    const expected = sums?.expected ?? 0;
    homeMargins.push({
      id: home.id,
      name: home.name,
      expectedPence: expected,
      receivedPence: sums?.received ?? 0,
      ownerRentPence,
      marginPence: expected - ownerRentPence,
    });
  }

  // The longest-overdue tenant first, then the most owed.
  const overdue = [...late.values()].sort(
    (a, b) =>
      a.oldestDueDate.localeCompare(b.oldestDueDate) ||
      b.owedPence - a.owedPence ||
      byName(a, b),
  );

  return {
    month,
    expectedPence,
    receivedPence,
    owedToOwnersPence,
    marginPence: expectedPence - owedToOwnersPence,
    homes: homeMargins,
    overdue,
    overdueTotalPence: overdue.reduce((total, t) => total + t.owedPence, 0),
    empty: emptyPlaces(homes),
  };
}
