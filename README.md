# PropDesk

Property management for UK landlords and letting managers (formerly RentDesk).
What to build: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md). How it looks:
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). Open questions:
[`docs/DECISIONS.md`](docs/DECISIONS.md). Task book:
[`docs/ROADMAP.md`](docs/ROADMAP.md).

Simple property and rent management for small UK landlords and rent-to-rent
operators. Add properties, rooms and tenancies, mark rent as paid or late, and
see what has come in, what is owed to owners, and who is overdue.

Mobile first, plain words, very simple screens. Multi-tenant: each landlord's
data is isolated by `organisation_id` with Postgres row-level security (RLS) in
Supabase.

> Status: sign-in, homes and rooms, tenants, rent tracking and the dashboard
> are built. Overdue reminders come next. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the
> plan, [`docs/DAILY_LOG.md`](docs/DAILY_LOG.md) for what each daily build did,
> and [`docs/PENDING_MIGRATIONS.md`](docs/PENDING_MIGRATIONS.md) for database
> changes waiting to be applied.

## Stack

- Next.js 16 (App Router, TypeScript strict, `src/`, Turbopack)
- Tailwind CSS v4 and shadcn/ui (Base UI, `base-nova` style, neutral colours)
- Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js` and `@supabase/ssr`
- React Hook Form, Zod, `@hookform/resolvers`
- TanStack Table, Recharts (through the shadcn `chart` component), date-fns, lucide-react
- Resend (email), Upstash Redis + Ratelimit (rate limiting)
- Vitest + React Testing Library (unit), Playwright (end-to-end)
- ESLint, Prettier (with `prettier-plugin-tailwindcss`)
- pnpm, deployed on Vercel

## Prerequisites

- Node.js 20.9 or newer (`node -v`)
- pnpm (`pnpm -v`). Install with `corepack enable` or `npm i -g pnpm`
- git
- A Supabase project, a Resend account and an Upstash Redis database when you
  are ready to connect real services

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm exec playwright install chromium   # once, for end-to-end tests
pnpm dev
```

Open http://localhost:3000.

## Environment variables

All variables are listed with comments in [`.env.example`](.env.example).
Put real values in `.env.local`, which git ignores. Never commit real keys.

| Variable                               | Where it is used                                   | Required                              |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser + server                                   | Yes                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server (replaces the legacy anon key)    | Yes                                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server only. Bypasses RLS                          | Yes, when server code uses it         |
| `RESEND_API_KEY`                       | Server only                                        | When sending email                    |
| `EMAIL_FROM`                           | Server only. Sender on a domain verified in Resend | When sending email                    |
| `UPSTASH_REDIS_REST_URL`               | Server only                                        | Production (skipped locally if unset) |
| `UPSTASH_REDIS_REST_TOKEN`             | Server only                                        | Production (skipped locally if unset) |
| `CRON_SECRET`                          | Server only. Secret header for the daily cron      | Production (cron is refused if unset) |
| `NEXT_PUBLIC_APP_URL`                  | Links and auth redirects                           | Defaults to `http://localhost:3000`   |

How they are checked:

- `src/lib/env.ts` validates the public variables with Zod. `next.config.ts`
  imports it, so `pnpm dev` and `pnpm build` stop with a clear message if one is
  missing.
- `src/server/env.ts` reads and validates the secret variables. It imports
  `server-only`, so the build fails if browser code ever imports it. This is the
  only file that reads `SUPABASE_SERVICE_ROLE_KEY`.
- `SKIP_ENV_VALIDATION=1` turns validation off, for example for a CI build with
  no real keys.

## Scripts

| Command                             | What it does                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server (Turbopack)                                                                                                  |
| `pnpm build`                        | Production build                                                                                                                  |
| `pnpm start`                        | Run the production build                                                                                                          |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                                                                                                            |
| `pnpm format` / `pnpm format:check` | Prettier (also sorts Tailwind classes)                                                                                            |
| `pnpm typecheck`                    | Generate Next.js route types, then `tsc --noEmit`                                                                                 |
| `pnpm test` / `pnpm test:watch`     | Vitest unit tests                                                                                                                 |
| `pnpm test:e2e`                     | Playwright end-to-end tests (starts `pnpm dev` itself)                                                                            |
| `pnpm test:rls`                     | Row-level security isolation test against the **dev** Supabase project in `.env.local`                                            |
| `pnpm db:push`                      | Apply migrations in `supabase/migrations/` to the linked (remote) project. CLI 3 targets local Docker unless `--remote` is passed |
| `pnpm db:types`                     | Regenerate `src/lib/supabase/database.types.ts` from the linked project                                                           |

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` (and to `auto/*`
branches) and on every pull request: install, typecheck, lint, format check,
unit tests, a production build with `SKIP_ENV_VALIDATION=1`, and
`pnpm audit --audit-level=high`. It needs no secrets and has read-only
permissions. The RLS and end-to-end tests are not part of CI because they need
a real Supabase project; run them locally.

`.github/dependabot.yml` opens weekly pull requests for npm packages and
GitHub Actions.

## Folder structure

```text
.
├── e2e/                      Playwright tests
├── tests/rls/                RLS isolation test (pnpm test:rls)
├── public/                   Static files
├── supabase/
│   ├── config.toml           Supabase CLI config (local dev stack)
│   ├── migrations/           SQL migrations (tables + RLS policies)
│   └── templates/            Auth email templates (sign-in code + link)
├── src/
│   ├── app/
│   │   ├── (auth)/           Sign in (email → code), auth server actions
│   │   ├── (app)/            Logged-in area: /dashboard, /homes, /tenants, /rent (needs a session)
│   │   ├── api/cron/         Daily cron routes (secret header, no session)
│   │   ├── auth/confirm/     Handles the sign-in link from the email
│   │   ├── layout.tsx        Root layout (fonts, toaster)
│   │   ├── page.tsx          Home page
│   │   └── globals.css       Tailwind + shadcn theme variables
│   ├── components/
│   │   ├── ui/               shadcn/ui components (generated; edit with care)
│   │   └── *.tsx             Our own components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     Supabase client for Client Components
│   │   │   ├── server.ts     Supabase client for Server Components/Actions
│   │   │   ├── proxy.ts      Session refresh helper used by src/proxy.ts
│   │   │   └── database.types.ts  Generated DB types (pnpm db:types)
│   │   ├── validation/       Zod schemas
│   │   ├── env.ts            Public env validation
│   │   ├── rate-limit.ts     Upstash rate limiter (server only)
│   │   └── utils.ts          cn() helper for class names
│   ├── server/               Server-only code (every file imports "server-only")
│   │   ├── auth.ts           getCurrentUser() / requireUser()
│   │   ├── run-action.ts     Wrapper every server action uses (session, rate limit)
│   │   ├── homes.ts          Homes and rooms: reads and writes
│   │   ├── tenants.ts        Tenants: reads and writes
│   │   ├── rent.ts           Rent: a month's rent, payments
│   │   ├── rent-charges.ts   Makes rent charges (with a tenant, and daily)
│   │   ├── dashboard.ts      Dashboard data
│   │   ├── service-client.ts Service-role client. Cron route ONLY
│   │   └── env.ts            Secret env validation
│   └── proxy.ts              Refreshes the Supabase session on each request
├── next.config.ts            Security headers, env check
├── vercel.json               Vercel Cron schedule (daily rent charges)
├── playwright.config.ts
└── vitest.config.mts
```

## Notes

- **Proxy, not middleware.** Next.js 16 renamed `middleware.ts` to `proxy.ts`.
  `src/proxy.ts` refreshes the Supabase session, sends signed-out visitors to
  `/sign-in` and signed-in visitors on `/sign-in` to `/dashboard`. That redirect is only an optimistic check. Always check
  the user with `supabase.auth.getClaims()` on the server, and rely on RLS for
  data access. Never trust `getSession()` in server code.
- **Forms.** shadcn's old `form` component is no longer in the current styles.
  Use the `field` component (`Field`, `FieldLabel`, `FieldError`) with React
  Hook Form's `Controller` and a Zod resolver.
- **Security headers** are set in `next.config.ts`. A Content-Security-Policy is
  still a TODO.
- **Supabase migrations.** Create one with `pnpm exec supabase migration new <name>`.
  Run a local stack with `pnpm exec supabase start` (needs Docker).

## Screens and layout

- The look follows `docs/DESIGN_SYSTEM.md`: colours are the `--pd-*` tokens
  in `globals.css` (as Tailwind colours such as `bg-canvas`, `text-ink-2`,
  `text-bad`), never new hard-coded colours. The app shell lives in
  `src/components/app/`; the menu is defined once in `src/lib/nav.ts`, where
  pages that do not exist yet are marked `ready: false` and left out.
- Every signed-in page has a top bar with search (⌘K or Ctrl K, homes and
  tenants for now) and **+ New**. Dates in tables, forms and records use
  `formatDateUK` (DD/MM/YYYY).
- Phones and tablets (under 1024px): a top bar, a bottom bar with labelled
  icons and **More** for the rest of the menu, and lists shown as cards.
- Laptops and desktops (1024px and wider): a grouped sidebar that is always
  on show (organisation at the top, you and Sign out at the bottom), and
  lists shown as tables. Table headings are links that sort the list in
  the database (`?sort=` and `?dir=`), because lists are paginated.
- Forms and detail pages keep a fixed, narrow width on every screen.
- Every focusable element gets the same strong focus ring (`globals.css`), and
  the first Tab stop is a "Skip to main content" link.

## Owners

- **Owners** (`/owners`) are the people and companies who own the homes
  you let or manage: a record each (`property_owners`: person or company,
  name, company name, optional email, phone, address and notes), shared
  across the organisation. They are a separate thing from your
  organisation, even if you are a landlord who owns your homes.
- A home can have several owners and an owner several homes
  (`property_owner_links`). Link an owner from the home's **Owners** card,
  add a new one from there (they come back linked), or unlink one (with
  Undo; their record is kept).
- Rent you pay an owner (rent-to-rent) stays on the home: **Edit home** ›
  "Do you rent this home from an owner?". Adding it there also makes the
  owner record and links it (`owner_leases.owner_id`). Once it belongs to
  an owner record, their name and phone are changed on the owner's page.
  The owner's page lists their homes and the rent you pay them.
- Owners are archived (with Undo), never deleted by the app. Managers and
  above add, change, link and archive owners; staff can look.
- The audit log records what happened to an owner, never their name or
  contact details.

## Tenants

- A tenant is added from a room (or from a home let as a whole) in three
  short steps: who they are, their rent and move-in date, and an optional
  deposit.
- A room, or a home let as a whole, has one current tenant at a time. A
  tenant is current while `tenancies.end_date` is empty.
- "Tenant moved out" sets `end_date` and frees the room. It can be undone from
  the toast, or later from the past tenant's page.
- Changing the rent changes `tenancies.rent_pence` only, so it applies to
  future months. Months already recorded keep their amount.
- The audit log records what changed for a tenant, but never their name,
  phone number or email.

## Rent

- Rent is charged once per calendar month. Each tenant has one `rent_charges`
  row per month (`period_start` is the first day of the month), from the
  month they move in to the month they move out.
- Charges are made when a tenant is added (move-in month to this month) and
  by a daily cron job for each new month. Making charges is safe to repeat:
  a month that already has a charge is skipped, never changed. So a charge
  keeps the rent it was made with, and a rent change applies to future
  months only.
- Rent is due on the tenant's due day. In the month they move in, it is not
  due before the day they move in. The first month is a full month's rent
  (nothing is worked out by the day).
- Status is worked out every time, never stored: **Paid** (payments cover the
  rent), **Late** (not fully paid and the due date has passed), **Part paid**
  (something paid, not yet past the due date), **Due** (nothing paid, not yet
  past the due date). All dates use Europe/London. The rules live in
  `src/lib/rent.ts` and are unit tested.
- `/rent` shows one month, late tenants first. "Mark as paid" records
  whatever is left in one tap. "Other amount" records a part payment. A month
  can have several payments, but never more than the rent in total.
- Payments are never deleted. "Remove" sets `payments.removed_at` and "Undo"
  clears it.
- The dashboard shows this month's rent expected and received, rent owed to
  owners, what is left after owners (for all homes and for each home), late
  rent by tenant (across all months), and empty rooms. It loads in three
  queries. The sums live in `src/lib/dashboard.ts` and are unit tested.

### Daily cron job

`GET /api/cron/rent-charges` makes this month's charge for every tenant and
fills in any month that is missing. It is the only code that uses the
service-role client (a unit test fails if anything else imports it).

To switch it on:

1. Set `CRON_SECRET` in the Vercel project (Settings → Environment Variables)
   to a long random value, for example the output of `openssl rand -hex 32`.
   It must be at least 16 characters.
2. Deploy. `vercel.json` schedules the job for 00:05 UTC every day, just
   after midnight in London all year. Vercel sends the secret itself as
   `Authorization: Bearer <CRON_SECRET>`.

Without the secret the route answers 401 and does nothing. To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/rent-charges
```

Until the job is switched on, tenants still get their charges when they are
added, but a new month's rent will not appear on its own.

### Late rent email

`GET /api/cron/overdue-reminders` emails each organisation's owners a list of
late rent (who, where, how much, since when) once a day, at 08:05 UTC. It
uses the same sums as the dashboard. Owners can turn it off on the Settings
page (`organisations.overdue_email_enabled`, on by default).

- It sends nothing unless `RESEND_API_KEY` and `EMAIL_FROM` are both set
  (the route answers `{ ok: true, skipped: "email-not-configured" }`), and
  nothing until the `overdue_email_enabled` migration is applied.
- At most one email per organisation per London day: each email sent writes
  an `audit_log` row (`overdue_digest.sent`) that is checked first, and
  Resend gets an idempotency key made from the organisation and the day.
- It is protected by the same `CRON_SECRET` header as the rent-charges job.

To switch it on: verify a sending domain in Resend, set `RESEND_API_KEY` and
`EMAIL_FROM` (for example `RentDesk <reminders@your-domain>`) in Vercel, and
deploy. To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/overdue-reminders
```

## Photos

- Each home can have up to 20 photos (JPG, PNG or WebP, 5 MB each). They are
  shown on the home page, and the first one is the home's picture in the list.
- Files live in the private `property-photos` Storage bucket at
  `<organisation_id>/<home_id>/<uuid>.<ext>`. Pages show them with signed
  links that last an hour.
- Uploading takes three steps so the file never goes through our server:
  the server picks the path (`preparePhotoUploadAction`), the browser uploads
  the file with the user's own session (Storage policies only allow their
  organisation's folder), then the server checks the path and records the row
  (`addPhotoAction`). Big phone photos are shrunk in the browser first.
- Removing a photo deletes the row and the file. Any member can do it.

## Demo account for testing

`pnpm seed:demo` fills the Supabase project in `.env.local` with a demo
account: 4 homes, rooms, owners, tenants (one moved out), months of rent with
paid, late, part-paid and due months, and drawn pictures for each home. Run
it again to reset it. It only ever touches the demo account.

- Email `test@rentdesk.test`, password `test@123` (change them with
  `DEMO_EMAIL` and `DEMO_PASSWORD`; at least 8 characters). Sign in on the
  normal sign-in page. The account is "Taylor Example", owner of "Demo
  Lettings" (property manager), so it skips the set-up screen. Needs the
  organisation set-up migration.
- `ENABLE_TEST_LOGIN` is gone: real email and password sign-in replaced the
  test-only password box. Remove the variable from Vercel if it is set.

## Data rights

Owners can download their data and remove a past tenant's personal details.

- **Downloads** (Settings, "Download your data"): `GET /api/export?data=homes`,
  `tenants` or `payments` returns a CSV file. Owners only; staff do not see
  the links and are refused. Each download checks the session, is rate
  limited (10 per 10 minutes per user), reads with the user's own client
  (RLS applies) and writes an `audit_log` row (`data.exported`: which file
  and how many rows, never the data). Money is pounds with two decimals,
  dates are `YYYY-MM-DD`. Cells that a spreadsheet would run as a formula
  (starting with `=`, `+`, `-` or `@`) are written as text. A problem sends
  the person back to Settings with a plain message.
- **Removing a tenant's details** (tenant page, "Their personal details"):
  for a tenant who has moved out, an owner can remove their name (it becomes
  "Former tenant (details removed)"), phone number, email address and any
  notes on their payments. Rent charges and payment amounts stay, so totals
  do not change. It cannot be undone, so it is the one place in the app
  that asks first: on the page, not in a pop-up. Written to `audit_log`
  (`tenant.personal_details_removed`, which kinds of detail, never the
  details). The audit log never stores names, phone numbers or emails.

## Data model and security

- Every business table has `organisation_id`. A user sees a row only if they
  are a member of that organisation (Postgres RLS, see
  `supabase/migrations/*_initial_schema.sql`).
- **Roles** (`memberships.role`, highest first): **owner**, **admin**,
  **manager**, **staff**. Only **active** memberships (`memberships.status`:
  active, invited or removed) give any access. Everyone in an organisation
  reads its rows. Managers and above add and change homes, rooms, owners
  (and their links to homes), owners' rent, tenants and rent charges; every
  role records rent payments. Only
  owners change settings, download data, remove a tenant's details or
  delete rows. Owners change or remove any member; admins any member who is
  not an owner, and never make anyone an owner. The rules are in RLS (helper
  `private.has_org_role(org, min_role)`, see
  `supabase/migrations/*_membership_roles.sql`) and on the server: every
  data function behind an action starts with `requireRole(ctx, "<role>")`
  (`src/server/context.ts`), and the guard test lists the role for each.
  The interface hides what a role cannot do (staff see no **+ New**, no
  Edit or Archive), but that is never the only check. The audit log can be
  read and added to, never changed.
- Signing up creates a **profile** (`profiles`, the person's name) and no
  organisation. The app then sends the person to **`/setup`** ("Set up your
  organisation": their full name, the organisation's name, account type
  Landlord or Property manager, and a contact email). That calls the
  database function `public.create_organisation`, which works out who is
  calling from the session, refuses a second organisation (people join more
  by invitation), makes the organisation with the caller as owner,
  saves their name and writes `audit_log` in one transaction. Nobody can
  insert into `organisations` directly. An organisation always keeps at
  least one owner.
- **Members and invitations** (Settings › Members, `/settings/members`):
  owners and admins invite people by email with a role (admin, manager or
  staff), change roles (with Undo), remove members (with a confirm step;
  the membership is kept as `removed` for history) and cancel invitations
  (with Undo). Managers can see the list; staff cannot. Only the owner can
  transfer ownership: pick a member, then type the organisation's name
  (`public.transfer_ownership` checks it again); the old owner becomes an
  admin. An invitation (`invitations`) holds only the SHA-256 hash of the
  random token in its link, lasts 7 days and works once. The email is
  Supabase Auth's sign-in email (code and link), sent from server code
  with the publishable key (`src/server/invite-email.ts`); the inviter
  also gets the link to copy, since Supabase's built-in email is limited to
  a few per hour (set up custom SMTP in Supabase to lift that). Once the
  invited person signs in, `/setup` lists their invitations (matched on
  their confirmed email), and `/invite/<token>` shows one; joining calls
  `public.accept_invitation`, which checks the email, adds the membership
  and writes `audit_log`. Nobody can insert a membership directly.
- **Several organisations:** someone in more than one picks the active one
  from the organisation block at the top of the sidebar (in **More** on
  phones). The choice is kept in an httpOnly cookie (`pd_active_org`,
  just an organisation id) and is only a wish: on every request
  `getMembership` (`src/server/context.ts`) picks from the person's own
  **active** memberships, and falls back to the first organisation they
  joined when the cookie is missing or names one they are not (or no
  longer) in. Switching (`switchOrganisationAction`) checks the
  membership first and writes `audit_log` (left out of Today's Recent
  activity). Joining by invitation makes that organisation the active one;
  signing out forgets the choice.
- Profiles: you see your own and those of people in your organisations,
  change only your own name, and never delete one (it goes with the user).
- Money is stored as whole pence (`integer`), never as decimals.
- The service role key bypasses RLS. It is only used by the daily cron
  routes (through `src/server/service-client.ts`) and in test setup.
- Every response has a Content-Security-Policy and the other security
  headers from `src/lib/security-headers.ts` (tested). Scripts may only come
  from this site; inline scripts are still allowed, because Next.js and the
  theme switcher use them.
- `src/server/server-actions.guard.test.ts` reads every server action and
  route handler and fails if one skips Zod validation, `runAction` (session
  and rate limit), the organisation check, the `audit_log` write, or (for
  routes) the rate limiter and cron secret.

## Sign in

Three ways in, all through Supabase Auth (decision D-12):

- **Email and password** (the main one): `/sign-up` creates an account,
  `/sign-in` signs in. Passwords need at least 8 characters (at most 72).
  A new account goes on to `/setup` to set up its organisation; every
  page of the app sends people there until they have one.
- **Email me a sign-in code** (`/sign-in/code`): the person gets a 6-digit
  code (and a link) by email and types the code in. New emails get an
  account automatically.
- **Forgot your password?** (`/reset-password`): emails a link that signs
  the person in for one step, "Choose a new password"
  (`/reset-password/new`). The answer is the same whether or not the email
  has an account.

Every sign-in action is validated with Zod and rate limited (10 tries per IP
and 5 per account every 15 minutes). Errors are plain; sign-up and reset give the same answer whether or not an
email has an account. Links in emails land on `/auth/confirm`, which
only ever redirects to fixed pages.

Supabase dashboard settings this needs (hosted project):

1. **Authentication → Emails → Templates**: paste
   `supabase/templates/magic-link.html` into both **Magic Link** and
   **Confirm signup**, and `supabase/templates/reset-password.html` into
   **Reset Password**. The default templates only contain a link, not the
   code, and their links only work in the same browser.
2. **Authentication → URL Configuration**: Site URL = your app URL
   (`http://localhost:3000` for the dev project), and add
   `<your app URL>/auth/confirm` to the Redirect URLs.
3. **Authentication → Providers → Email**: minimum password length 8.
4. **Authentication → Emails → SMTP**: set up custom SMTP (for example Resend).
   Supabase's built-in email sender is only for testing and allows very few
   emails per hour.
