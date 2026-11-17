# RentDesk

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

| Variable                               | Where it is used                                | Required                              |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser + server                                | Yes                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server (replaces the legacy anon key) | Yes                                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server only. Bypasses RLS                       | Yes, when server code uses it         |
| `RESEND_API_KEY`                       | Server only                                     | When sending email                    |
| `UPSTASH_REDIS_REST_URL`               | Server only                                     | Production (skipped locally if unset) |
| `UPSTASH_REDIS_REST_TOKEN`             | Server only                                     | Production (skipped locally if unset) |
| `CRON_SECRET`                          | Server only. Secret header for the daily cron   | Production (cron is refused if unset) |
| `NEXT_PUBLIC_APP_URL`                  | Links and auth redirects                        | Defaults to `http://localhost:3000`   |

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

- Phones and tablets (under 1024px): a header, a bottom bar with labelled
  icons, and lists shown as cards.
- Laptops and desktops (1024px and wider): a sidebar that is always on show,
  and lists shown as tables. Table headings are links that sort the list in
  the database (`?sort=` and `?dir=`), because lists are paginated.
- Forms and detail pages keep a fixed, narrow width on every screen.
- Every focusable element gets the same strong focus ring (`globals.css`), and
  the first Tab stop is a "Skip to main content" link.

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

## Data model and security

- Every business table has `organisation_id`. A user sees a row only if they
  are a member of that organisation (Postgres RLS, see
  `supabase/migrations/*_initial_schema.sql`).
- Members can read, add and change rows. Only owners can delete rows and
  manage memberships. The audit log can be read and added to, never changed.
- Signing up creates an organisation ("My organisation") with the new user as
  its owner. An organisation always keeps at least one owner.
- Money is stored as whole pence (`integer`), never as decimals.
- The service role key bypasses RLS. It is only used by the daily cron route
  (through `src/server/service-client.ts`) and in test setup.

## Sign in

Passwordless. The person enters their email, gets a 6-digit code (and a link)
by email, and types the code in. New emails get an account automatically.

Supabase dashboard settings this needs (hosted project):

1. **Authentication → Emails → Templates**: paste
   `supabase/templates/magic-link.html` into both **Magic Link** and
   **Confirm signup**. The default templates only contain a link, not the code.
2. **Authentication → URL Configuration**: Site URL = your app URL
   (`http://localhost:3000` for the dev project).
3. **Authentication → Emails → SMTP**: set up custom SMTP (for example Resend).
   Supabase's built-in email sender is only for testing and allows very few
   emails per hour.
