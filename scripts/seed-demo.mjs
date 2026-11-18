// Demo account with sample data, for testing RentDesk by hand.
//
//   pnpm seed:demo
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
// .env.local, so it fills whichever Supabase project .env.local points at.
// It creates (or re-creates) ONE account and touches nothing else:
//
//   email:    TEST_LOGIN_EMAIL    (default test@rentdesk.test)
//   password: TEST_LOGIN_PASSWORD (default test@123)
//
// The account gets 4 homes, rooms, owners, tenants (one moved out), several
// months of rent with paid, late, part-paid and due months, and drawn
// pictures for each home. Running it again deletes the demo account and
// everything in it, then makes it fresh.
//
// To sign in with the password, set ENABLE_TEST_LOGIN=true for the app
// (see src/server/test-login.ts). Needs the property photos migration.

import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { bedroom, houseFront, kitchen, livingRoom } from "./demo-pictures.mjs";

const EMAIL = (process.env.TEST_LOGIN_EMAIL || "test@rentdesk.test")
  .trim()
  .toLowerCase();
const PASSWORD = process.env.TEST_LOGIN_PASSWORD || "test@123";
const BUCKET = "property-photos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Put them in .env.local.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Dates (London), months written "YYYY-MM"
// ---------------------------------------------------------------------------
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const THIS_MONTH = TODAY.slice(0, 7);

const pad = (n) => String(n).padStart(2, "0");

function addMonths(month, count) {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** A date `monthsAgo` months back, on `day` (1 to 28). */
function dateIn(monthsAgo, day) {
  return `${addMonths(THIS_MONTH, -monthsAgo)}-${pad(day)}`;
}

function lastDayOf(month) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
}

function dueDateFor(month, dueDay, startDate) {
  const due = `${month}-${pad(dueDay)}`;
  return startDate.slice(0, 7) === month && startDate > due ? startDate : due;
}

/** Months a tenant is charged for: move-in month to this month or move-out. */
function chargeMonths(startDate, endDate) {
  const months = [];
  const last = (endDate ?? TODAY).slice(0, 7);
  for (let m = startDate.slice(0, 7); m <= last; m = addMonths(m, 1)) {
    months.push(m);
  }
  return months;
}

// ---------------------------------------------------------------------------
// The demo data
// ---------------------------------------------------------------------------
// For each tenant, `pay(month, monthsAgo)` says how much of a month's rent
// was paid: "all", "none" or a number of pounds.

const HOMES = [
  {
    name: "Rose House",
    address: ["14 Hollybush Lane", null, "Birmingham", "B17 9QT"],
    letType: "by_room",
    rooms: ["Front bedroom", "Back bedroom", "Attic room", "Box room"],
    owner: {
      name: "David Clarke",
      phone: "07700 900123",
      email: "david.clarke@example.com",
      rent: 1450,
      dueDay: 1,
      monthsAgo: 8,
    },
    pictures: [
      () => houseFront({ wall: "#c8553d", roof: "#4a4e69", door: "#2a6f97" }),
      () => bedroom({ wall: "#e9e3d5", bedding: "#5e81ac" }),
      () => kitchen({ wall: "#f1ede4", units: "#88a39a" }),
    ],
    tenants: [
      {
        room: "Front bedroom",
        name: "Aisha Khan",
        phone: "07700 900201",
        email: "aisha.khan@example.com",
        rent: 575,
        dueDay: 1,
        deposit: 575,
        start: [4, 1],
        pay: () => "all",
      },
      {
        room: "Back bedroom",
        name: "Tom Walsh",
        phone: "07700 900202",
        rent: 525,
        dueDay: 5,
        deposit: 525,
        start: [3, 5],
        // This month not paid yet: late once the 5th has passed.
        pay: (_month, ago) => (ago === 0 ? "none" : "all"),
      },
      {
        room: "Attic room",
        name: "Priya Patel",
        email: "priya.patel@example.com",
        rent: 495,
        dueDay: 25,
        deposit: 400,
        start: [2, 25],
        // Paid part of this month (due on the 25th).
        pay: (_month, ago) => (ago === 0 ? 200 : "all"),
      },
      {
        room: "Box room",
        name: "Jake Morris",
        phone: "07700 900204",
        rent: 450,
        dueDay: 1,
        deposit: 0,
        start: [7, 1],
        // Moved out at the end of the month two months ago.
        end: () => lastDayOf(addMonths(THIS_MONTH, -2)),
        pay: () => "all",
      },
    ],
  },
  {
    name: "Maple Court, Flat 3",
    address: ["3 Maple Court", "Bristol Road", "Birmingham", "B29 6BD"],
    letType: "whole_home",
    rooms: [],
    owner: {
      name: "Sandra Lewis",
      phone: "07700 900301",
      rent: 850,
      dueDay: 3,
      monthsAgo: 6,
    },
    pictures: [
      () =>
        houseFront({
          wall: "#e0c9a6",
          roof: "#5c4b51",
          door: "#8c2f39",
          floors: 3,
          wide: true,
        }),
      () => livingRoom({ wall: "#dfe7ec", sofa: "#b56576" }),
      () => kitchen({ wall: "#f6f1e9", units: "#3d5a80" }),
    ],
    tenants: [
      {
        room: null,
        name: "Ben and Chloe Taylor",
        phone: "07700 900302",
        email: "taylors@example.com",
        rent: 1150,
        dueDay: 1,
        deposit: 1300,
        start: [5, 1],
        pay: () => "all",
      },
    ],
  },
  {
    name: "Oak Villa",
    address: ["27 Oakfield Road", null, "Birmingham", "B29 7HH"],
    letType: "by_room",
    rooms: ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5"],
    owner: {
      name: "Harbour Estates Ltd",
      phone: "07700 900401",
      email: "lettings@example.com",
      rent: 1900,
      dueDay: 1,
      monthsAgo: 10,
    },
    pictures: [
      () =>
        houseFront({
          wall: "#f2e8cf",
          roof: "#386641",
          door: "#bc4749",
          wide: true,
        }),
      () => bedroom({ wall: "#e6eef2", bedding: "#e9c46a" }),
      () => bedroom({ wall: "#f3e6e8", bedding: "#2a9d8f" }),
      () => livingRoom({ wall: "#eee6d8", sofa: "#264653" }),
    ],
    tenants: [
      {
        room: "Room 1",
        name: "Daniel Okafor",
        phone: "07700 900402",
        rent: 600,
        dueDay: 1,
        deposit: 600,
        start: [3, 1],
        // Missed last month's rent (late), paid this month.
        pay: (_month, ago) => (ago === 1 ? "none" : "all"),
      },
      {
        room: "Room 2",
        name: "Sofia Rossi",
        email: "sofia.rossi@example.com",
        rent: 580,
        dueDay: 10,
        deposit: 580,
        start: [1, 10],
        pay: () => "all",
      },
      {
        room: "Room 3",
        name: "Liam Hughes",
        phone: "07700 900404",
        rent: 560,
        dueDay: 28,
        deposit: 500,
        start: [2, 28],
        // This month not paid yet (due on the 28th).
        pay: (_month, ago) => (ago === 0 ? "none" : "all"),
      },
      {
        room: "Room 4",
        name: "Emma Wilson",
        phone: "07700 900405",
        email: "emma.wilson@example.com",
        rent: 590,
        dueDay: 1,
        deposit: 590,
        start: [4, 1],
        pay: () => "all",
      },
    ],
  },
  {
    name: "Elm Cottage",
    address: ["2 Elm Grove", "Harborne", "Birmingham", "B17 0LR"],
    letType: "whole_home",
    rooms: [],
    owner: null,
    pictures: [
      () =>
        houseFront({
          wall: "#fefae0",
          roof: "#7f5539",
          door: "#606c38",
          floors: 1,
        }),
    ],
    tenants: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function check(result, what) {
  if (result.error) {
    throw new Error(`${what} failed: ${result.error.message}`);
  }
  return result.data;
}

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listing users failed: ${error.message}`);
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

async function removeOrganisationFiles(organisationId) {
  const homes = check(
    await db.storage.from(BUCKET).list(organisationId, { limit: 1000 }),
    "listing photo folders",
  );
  for (const folder of homes) {
    const prefix = `${organisationId}/${folder.name}`;
    const files = check(
      await db.storage.from(BUCKET).list(prefix, { limit: 1000 }),
      "listing photos",
    );
    if (files.length) {
      check(
        await db.storage
          .from(BUCKET)
          .remove(files.map((file) => `${prefix}/${file.name}`)),
        "removing photos",
      );
    }
  }
}

async function deleteDemoAccount(user) {
  const memberships = check(
    await db
      .from("memberships")
      .select("organisation_id")
      .eq("user_id", user.id),
    "reading memberships",
  );
  for (const { organisation_id: organisationId } of memberships) {
    // Only remove organisations where the demo user is the sole member.
    const members = check(
      await db
        .from("memberships")
        .select("user_id")
        .eq("organisation_id", organisationId),
      "reading members",
    );
    if (members.some((m) => m.user_id !== user.id)) {
      throw new Error(
        "The demo account shares an organisation with another user. Not deleting it.",
      );
    }
    await removeOrganisationFiles(organisationId);
    check(
      await db.from("organisations").delete().eq("id", organisationId),
      "deleting the old demo organisation",
    );
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error)
    throw new Error(`deleting the old demo user failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Supabase project: ${url}`);

  // The photos table must exist (supabase/migrations/*_property_photos.sql).
  const photosTable = await db
    .from("property_photos")
    .select("id", { count: "exact", head: true });
  if (photosTable.error) {
    throw new Error(
      "The property_photos table is missing. Apply the migrations first: pnpm db:push",
    );
  }

  const existing = await findUserByEmail(EMAIL);
  if (existing) {
    console.log("Removing the old demo account…");
    await deleteDemoAccount(existing);
  }

  console.log(`Creating ${EMAIL}…`);
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { organisation_name: "Demo Lettings" },
  });
  if (createError || !created.user) {
    throw new Error(`creating the demo user failed: ${createError?.message}`);
  }
  const userId = created.user.id;

  // The sign-up trigger made the organisation and the owner membership.
  const membership = check(
    await db
      .from("memberships")
      .select("organisation_id")
      .eq("user_id", userId)
      .single(),
    "reading the new organisation",
  );
  const org = membership.organisation_id;

  const counts = {
    homes: 0,
    rooms: 0,
    tenants: 0,
    charges: 0,
    payments: 0,
    photos: 0,
  };

  for (const home of HOMES) {
    const [line1, line2, city, postcode] = home.address;
    const property = check(
      await db
        .from("properties")
        .insert({
          organisation_id: org,
          name: home.name,
          address_line1: line1,
          address_line2: line2,
          city,
          postcode,
          property_type: home.letType,
        })
        .select("id")
        .single(),
      `adding ${home.name}`,
    );
    counts.homes += 1;

    // Rooms, one at a time so they keep their order on the home page.
    const roomIds = new Map();
    for (const roomName of home.rooms) {
      const room = check(
        await db
          .from("rooms")
          .insert({
            organisation_id: org,
            property_id: property.id,
            name: roomName,
          })
          .select("id")
          .single(),
        `adding ${roomName}`,
      );
      roomIds.set(roomName, room.id);
      counts.rooms += 1;
    }

    if (home.owner) {
      check(
        await db.from("owner_leases").insert({
          organisation_id: org,
          property_id: property.id,
          owner_name: home.owner.name,
          owner_phone: home.owner.phone ?? null,
          owner_email: home.owner.email ?? null,
          rent_pence: home.owner.rent * 100,
          due_day: home.owner.dueDay,
          start_date: dateIn(home.owner.monthsAgo, 1),
        }),
        `adding the owner of ${home.name}`,
      );
    }

    for (const tenant of home.tenants) {
      const startDate = dateIn(tenant.start[0], tenant.start[1]);
      const endDate = tenant.end ? tenant.end() : null;
      const tenancy = check(
        await db
          .from("tenancies")
          .insert({
            organisation_id: org,
            property_id: property.id,
            room_id: tenant.room ? roomIds.get(tenant.room) : null,
            tenant_name: tenant.name,
            tenant_phone: tenant.phone ?? null,
            tenant_email: tenant.email ?? null,
            rent_pence: tenant.rent * 100,
            due_day: tenant.dueDay,
            deposit_pence: tenant.deposit * 100,
            start_date: startDate,
            end_date: endDate,
          })
          .select("id")
          .single(),
        `adding ${tenant.name}`,
      );
      counts.tenants += 1;

      const months = chargeMonths(startDate, endDate);
      const charges = check(
        await db
          .from("rent_charges")
          .insert(
            months.map((month) => ({
              organisation_id: org,
              tenancy_id: tenancy.id,
              period_start: `${month}-01`,
              due_date: dueDateFor(month, tenant.dueDay, startDate),
              amount_pence: tenant.rent * 100,
            })),
          )
          .select("id, period_start, due_date, amount_pence"),
        `adding rent for ${tenant.name}`,
      );
      counts.charges += charges.length;

      const payments = charges.flatMap((charge) => {
        const month = charge.period_start.slice(0, 7);
        const ago =
          (Number(THIS_MONTH.slice(0, 4)) - Number(month.slice(0, 4))) * 12 +
          (Number(THIS_MONTH.slice(5, 7)) - Number(month.slice(5, 7)));
        const paid = tenant.pay(month, ago);
        if (paid === "none") return [];
        const amount = paid === "all" ? charge.amount_pence : paid * 100;
        return [
          {
            organisation_id: org,
            rent_charge_id: charge.id,
            amount_pence: amount,
            paid_on: charge.due_date < TODAY ? charge.due_date : TODAY,
            method: "Bank transfer",
            recorded_by: userId,
          },
        ];
      });
      if (payments.length) {
        check(
          await db.from("payments").insert(payments),
          `adding payments for ${tenant.name}`,
        );
        counts.payments += payments.length;
      }
    }

    // Pictures: upload, then record each one (in order).
    for (const draw of home.pictures) {
      const path = `${org}/${property.id}/${randomUUID()}.png`;
      check(
        await db.storage.from(BUCKET).upload(path, draw(), {
          contentType: "image/png",
          upsert: false,
        }),
        `uploading a picture of ${home.name}`,
      );
      check(
        await db.from("property_photos").insert({
          organisation_id: org,
          property_id: property.id,
          storage_path: path,
          created_by: userId,
        }),
        `recording a picture of ${home.name}`,
      );
      counts.photos += 1;
    }
  }

  console.log(
    `Done: ${counts.homes} homes, ${counts.rooms} rooms, ${counts.tenants} tenants, ` +
      `${counts.charges} months of rent, ${counts.payments} payments, ${counts.photos} pictures.`,
  );
  console.log(`\nSign in with:\n  email:    ${EMAIL}\n  password: ${PASSWORD}`);
  console.log(
    "\nPassword sign-in only shows when the app has ENABLE_TEST_LOGIN=true.",
  );
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exit(1);
});
