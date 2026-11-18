# Daily log

Newest day last. Written by the unattended daily build run.

## 2026-11-15

### Start of run

- No GitHub Actions workflow, no `auto/*` branch and no "Daily build blocked"
  issue existed, so there was nothing from an earlier run to fix first.
- `docs/ROADMAP.md` did not exist; created it from the backlog.
- **Environment problem:** `pnpm install --frozen-lockfile` could not run. This
  cloud environment cannot reach `registry.npmjs.org` (DNS does not resolve it
  directly and the egress proxy answers 403, a policy denial). With no
  `node_modules`, none of the local checks can run and the Next.js guides in
  `node_modules/next/dist/docs/` cannot be read.

### Plan

**Task 1 — Continuous integration (backlog item 1)**

- Scope: one workflow that runs install, typecheck, lint, format check, unit
  tests, production build with `SKIP_ENV_VALIDATION=1`, and
  `pnpm audit --audit-level=high`; Dependabot config for npm and GitHub
  Actions.
- Files: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`
  (short CI note).
- Tests: none to add; the workflow itself is the test. Its first run on GitHub
  is also the only way this run can execute the Step 5 checks.
- Risks: pushing workflow files may be rejected for permissions; action major
  versions and pnpm 12 support in CI could not be checked from here; the
  existing code has never been through these checks in a clean environment, so
  the first run may show real failures.

**Task 2 — Desktop pass (backlog item 2)**

- Scope: sidebar over 1024px, centred container, tables on desktop and cards on
  phones, fixed-width forms, focus rings, keyboard support.
- Decision: **not started today.** It needs Next.js and TanStack Table v9 code
  that AGENTS.md says must be written against the installed docs, and it cannot
  be typechecked, built or viewed here without `node_modules`. Writing it blind
  would be guesswork, so it stays unchecked for the next run.

### Result

**Task 1 — Continuous integration: done.** `.github/workflows/ci.yml` and
`.github/dependabot.yml` are in place and the workflow passed on GitHub.

**Task 2 — Desktop pass: not started** (see the decision above). It is the
first item for the next run.

Checks. None could run in the build environment (no access to the npm
registry), so they were run by the new workflow on GitHub Actions against the
`auto/2026-11-15` branch before anything went to `main`:

| Check                              | Result                                               |
| ---------------------------------- | ---------------------------------------------------- |
| `pnpm install --frozen-lockfile`   | Passed (GitHub Actions)                              |
| `pnpm typecheck`                   | Passed (GitHub Actions)                              |
| `pnpm lint`                        | Passed (GitHub Actions)                              |
| `pnpm format:check`                | Failed once on `docs/ROADMAP.md`, fixed, then passed |
| `pnpm test`                        | Passed (GitHub Actions)                              |
| `SKIP_ENV_VALIDATION=1 pnpm build` | Passed (GitHub Actions)                              |
| `pnpm audit --audit-level=high`    | Passed (GitHub Actions)                              |
| `pnpm test:rls`                    | Not run here, run locally                            |
| `pnpm test:e2e`                    | Not run here, run locally                            |

The audit reported 1 low and 1 moderate advisory, both below the high
threshold, so it passed. They are left for Dependabot or a later maintenance
run.

Security review of today's diff: only YAML and Markdown changed
(`.github/`, `docs/`, `README.md`). No secrets, keys, tokens or `.env` files;
no `NEXT_PUBLIC_` variables; no new server actions, route handlers, SQL or
migrations. The workflow uses no secrets, has `contents: read` only, and
checks out without persisting credentials. Nothing existing was weakened.

Pending migrations: none new.

Decisions made without asking:

- Ran the Step 5 checks in GitHub Actions instead of locally, because that was
  the only place they could run. Work went to `auto/2026-11-15` first; `main`
  was only moved forward to a commit that had already passed every check.
- The workflow runs on pushes to `main` and `auto/**` and on all pull requests,
  rather than on pushes to every branch, so pull requests are not checked
  twice.
- Actions pinned to majors: `actions/checkout@v5`, `actions/setup-node@v5`,
  `pnpm/action-setup@v5` (v4 gave a Node 20 deprecation warning). Node 22 in
  CI. Dependabot will suggest newer majors if they exist.
- Dependabot: weekly, Mondays 06:00 Europe/London, minor and patch npm updates
  grouped into one pull request.
- Roadmap items are written one per line; the wrapped layout failed the
  Prettier check.
- No new dependencies.

Needs a human:

- **Allow the daily run's cloud environment to reach `registry.npmjs.org`**
  (network access settings of the environment). Until then no run can install
  packages, run checks locally, or read the Next.js docs, and feature work
  (item 2 onwards) cannot be done safely.
- Optional: in GitHub, protect `main` and require the "Checks" job to pass.
- Dependabot pull requests will start to arrive; review and merge them by
  hand.
- Still to do by hand from earlier work: run `pnpm test:rls` and
  `pnpm test:e2e` locally.

### After the push

- `main` was fast-forwarded to the checked commit and its CI run started.
- **The `auto/2026-11-15` branch could not be deleted** (the environment
  refuses branch deletion with a 403). It is fully merged and points at the
  same commit as `main`. It is **not** a blocked build: the next run should
  treat it as resolved and not count it as a task. The owner can delete it in
  GitHub (Branches page).
- Dependabot opened three pull requests straight away, for newer major
  versions of the actions: `actions/checkout` 7, `actions/setup-node` 7 and
  `pnpm/action-setup` 6. They were left for the owner to review and merge.

## 2026-11-16

### Start of run

- Latest CI run on `main` (commit `6416efa`): passed. Nothing to fix.
- No open "Daily build blocked" issue. The `auto/2026-11-15` branch still
  exists but yesterday's log says it is fully merged and not a blocked build
  (it points at the same commit as `main`), so it was not counted as a task.
- **Environment problem, same as yesterday:** `pnpm install --frozen-lockfile`
  cannot run. `registry.npmjs.org` does not resolve directly and the egress
  proxy refuses it with a 403 (a policy denial, so it was not retried or
  worked around). There is no `node_modules`, so no check can run in the build
  environment and the Next.js guides in `node_modules/next/dist/docs/` cannot
  be read.
- Decision: do not lose a second day. Work goes to the branch
  `auto/2026-11-16`, where the CI workflow runs every Step 5 check
  (typecheck, lint, format, unit tests, build, audit). `main` only moves
  forward to a commit that has passed all of them. New code follows the
  patterns already in `src/` (which were written against the installed
  Next.js 16 docs) and uses no Next.js API that the existing code does not
  already use.

### Plan

**Task 1 — Desktop pass on existing screens (backlog item 2)**

- Scope: sidebar from 1024px (it was 768px) with the phone header and bottom
  bar below that; "Skip to main content" link; wider centred container for
  list pages, fixed-width columns for forms and detail pages; homes list as a
  sortable table from 1024px and cards below; one strong, consistent focus
  ring on every focusable element.
- Sorting is done in the database through `?sort=` and `?dir=` links, not in
  the browser, because the list is paginated: sorting one page of twenty in
  the browser would give wrong answers. The headings are plain links, so they
  work with a keyboard and without JavaScript.
- Files: `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`,
  `src/app/globals.css`, `src/app/(app)/homes/page.tsx`,
  `src/components/homes/homes-table.tsx` (new), `src/lib/homes-sort.ts` (new),
  `src/server/homes.ts`, detail, dashboard and form pages for widths.
- Tests: unit tests for the sort and link helpers; a Playwright desktop spec
  (sidebar, table, sorting, skip link) and a tablet check in the phone spec.
- Risks: nothing can be looked at in a browser here, so layout is checked by
  build and by reading only; it needs a look by hand at 375, 768 and 1440px.

**Task 2 — Tenants (backlog item 3)**

- Scope: add a tenant from a home or room in three short steps; one current
  tenant per room or whole home; tenant page and edit; "Tenant moved out" with
  Undo; home page shows each room's tenant or "Empty".
- Files: `src/lib/validation/tenants.ts`, `src/server/tenants.ts`,
  `src/app/(app)/tenants/**`, `src/components/tenants/**`, home detail page
  and room list, a new migration for the one-current-tenant rule,
  `database.types.ts`, `docs/PENDING_MIGRATIONS.md`, `tests/rls`, `e2e`.
- Tests: unit tests for the schemas and date helpers; isolation cases; a
  Playwright journey at phone and desktop widths.
- Risks: the database code cannot be run here (no Supabase credentials), so
  it is checked by types and by reading only. The migration cannot be applied
  by this run, so the code must behave correctly before it is applied too.

### Result

**Task 1 — Desktop pass (item 2): done.**

- Sidebar from 1024px; phones and tablets keep the header and bottom bar.
- "Skip to main content" is the first Tab stop on every signed-in page.
- Main column is centred and up to 1024px wide; forms stay at 576px and
  detail pages at 768px.
- Homes list: sortable table (Home, Address, Postcode; Rooms is not sortable)
  from 1024px, cards below. Sort and direction live in the address and are
  kept when paging or showing archived homes.
- One strong focus ring on every focusable element, in light and dark themes
  and in Windows high-contrast mode.

**Task 2 — Tenants (item 3): done.**

- Add a tenant from a room, or from a home let as a whole, in three steps
  (name and contact; rent, due day, move-in date; optional deposit).
- One current tenant per room or whole home, checked in the app and, once the
  pending migration is applied, by the database.
- Tenant page and edit page. A rent change only changes the tenancy, so it
  applies to future months.
- "Tenant moved out" sets the end date and frees the room, with Undo in the
  toast and a "They have not moved out" button on the past tenant's page.
- The home page shows each room's tenant or "Empty", and a list of past
  tenants. Tenants load in the same query as the home (no query per room).

Checks. As yesterday, none could run in the build environment, so they ran in
GitHub Actions on `auto/2026-11-16` before `main` was moved:

| Check                              | Result                    |
| ---------------------------------- | ------------------------- |
| `pnpm install --frozen-lockfile`   | Passed (GitHub Actions)   |
| `pnpm typecheck`                   | Passed (GitHub Actions)   |
| `pnpm lint`                        | Passed (GitHub Actions)   |
| `pnpm format:check`                | Passed (GitHub Actions)   |
| `pnpm test`                        | Passed (GitHub Actions)   |
| `SKIP_ENV_VALIDATION=1 pnpm build` | Passed (GitHub Actions)   |
| `pnpm audit --audit-level=high`    | Passed (GitHub Actions)   |
| `pnpm test:rls`                    | Not run here, run locally |
| `pnpm test:e2e`                    | Not run here, run locally |

The audit still reports the same 1 low and 1 moderate advisory as yesterday.

**What has not been checked.** The new tenant code has passed type checking,
lint, unit tests and a production build, but it has never run against a real
database or in a real browser, and nobody has looked at the new layout. The
isolation tests and Playwright journeys written today are the way to check
it: please run `pnpm test:rls` and `pnpm test:e2e` locally before relying on
it.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `service_role`, API keys, private keys and JWT-shaped strings). The only
  matches are two test messages that name the `SUPABASE_SERVICE_ROLE_KEY`
  variable.
- No new `NEXT_PUBLIC_` variable. No service-role client outside the existing
  test helpers. No client component imports from `src/server/`.
- Four new server actions (`src/app/(app)/tenants/actions.ts`), no new route
  handlers. Each validates with a shared Zod schema and goes through
  `runAction`, which checks the session and applies the rate limiter; the
  data functions derive the organisation from memberships, filter by it, and
  write `audit_log`.
- No raw SQL, no `dangerouslySetInnerHTML`. The sort column comes from a
  fixed list, never from the address. Errors shown to people are plain
  messages; error codes only go to the server log.
- The migration adds indexes only: no new table, no policy change.
- Nothing existing was weakened. `next.config.ts`, `src/proxy.ts`, the rate
  limiter and the first migration are untouched. The homes actions keep the
  same session check and the same rate limit; that code moved into
  `src/server/run-action.ts` so tenants use it too.

Pending migrations (see `docs/PENDING_MIGRATIONS.md`):

- `20261116030000_one_current_tenant_per_place.sql`: unique indexes for one
  current tenant per room and per whole home. No type changes.

Decisions made without asking:

- Worked on a branch and checked through GitHub Actions rather than skipping
  feature work for a second day (see "Start of run").
- Sorting is done by the server through links, not with TanStack Table in the
  browser, because the list is paginated. TanStack Table is still unused.
- The rooms list stays a list on desktop: it has one column and its buttons,
  so a table would add nothing.
- "Current tenant" means the tenancy has no end date. Moving out sets the end
  date to today in London (or to the move-in date, if that is later).
- A move-in date can be up to one year ahead and 50 years back.
- A room or home with a current tenant cannot be archived, and rooms cannot
  be added to a home that has a whole-home tenant. The message says to mark
  the tenant as moved out first.
- The audit log never stores a tenant's name, phone or email (it records the
  rent, dates and which contact fields changed). This keeps personal data in
  one table, ready for the data-rights item.
- No tenants list page or menu entry yet: tenants are reached from their
  home. The rent page (item 4) will be the place to see everyone.
- The Playwright desktop project now uses a 1440px viewport, and specs named
  `*-desktop.spec.ts` run on desktop only.
- No new dependencies.

Needs a human:

- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Second day running. Without it the run cannot install packages, run any
  check itself, or open the app in a browser.
- **Run `pnpm test:rls` and `pnpm test:e2e` locally**, and look at the homes
  list, a home and a tenant at 375, 768 and 1440px.
- Review and apply the pending migration.
- Delete the merged branches `auto/2026-11-15` and `auto/2026-11-16` in
  GitHub (this environment cannot delete branches).
- Six Dependabot pull requests are open (#1 to #6); review and merge by hand.

### After the push

- `main` was fast-forwarded twice, each time to a commit that had already
  passed on the branch: first after the desktop pass (`3406789`), then after
  tenants and the log (`893c2f8`). The CI run on `main` for `893c2f8` passed.
- The `auto/2026-11-16` branch is fully merged and is **not** a blocked build.
  It could not be deleted from here; the next run should treat it, and
  `auto/2026-11-15`, as resolved and not count them as a task.

## 2026-11-17

### Start of run

- Latest CI run on `main` (commit `2f664ca`): passed. Nothing to fix.
- No open "Daily build blocked" issue. The branches `auto/2026-11-15` and
  `auto/2026-11-16` still exist, but the earlier logs say both are fully
  merged and are not blocked builds (both are ancestors of `main`), so they
  were not counted as a task.
- **Environment problem, third day:** `pnpm install --frozen-lockfile` cannot
  run. `registry.npmjs.org` does not resolve from this environment (it is on
  the environment's direct-access list, but there is no route to it). It was
  not retried or worked around. There is no `node_modules`, so the checks
  cannot run here and the Next.js guides in `node_modules/next/dist/docs/`
  cannot be read.
- Decision: same approach as yesterday. Work goes to `auto/2026-11-17`, where
  the CI workflow runs every Step 5 check. `main` only moves forward to a
  commit that has passed all of them. New code uses only Next.js APIs the
  existing code already uses.
- New today: the environment does have its own copies of Prettier and
  Tailwind CSS 4.3.3, so formatting and Tailwind class order were checked
  here before pushing, and the new date, status and dashboard helpers were
  run here with a small stand-in for the test runner. Type checking, lint,
  the real unit test run and the build still only happen in GitHub Actions.

### Plan

**Task 1 — Rent ledger (backlog item 4)**

- Scope: one `rent_charges` row per tenant per calendar month, made when a
  tenant is added (move-in month to this month) and by a daily cron route
  that can be run any number of times. Status (Paid, Part paid, Due, Late) is
  worked out from the charge, its payments and today's date in London; it is
  never stored. A `/rent` page by month with late tenants first, one-tap
  "Mark as paid" with Undo, an "Other amount" form, several payments per
  month, and payment removal with Undo.
- Files: `src/lib/rent.ts` (date and status helpers),
  `src/lib/validation/rent.ts`, `src/server/rent.ts`,
  `src/server/rent-charges.ts`, `src/server/service-client.ts`,
  `src/app/api/cron/rent-charges/route.ts`, `src/app/(app)/rent/**`,
  `src/components/rent/**`, the menu, `src/server/tenants.ts`,
  `src/server/run-action.ts`, `src/lib/env.ts`, `src/server/env.ts`,
  `src/lib/supabase/proxy.ts`, `vercel.json`, a migration for
  `payments.removed_at`, `database.types.ts`, `.env.example`.
- Tests: unit tests for months, due dates, charge months, status and sorting,
  the cron secret check and the amount schema; isolation cases for the rent
  data functions; a Playwright journey at phone and desktop widths.
- Risks: none of the database code can run here. Removing a payment needs a
  new column (payments are never deleted), so the code must still load
  before that migration is applied. The cron route needs a secret and a
  schedule set up by the owner. The service-role client appears in app code
  for the first time, so it must stay in server-only code and be used by the
  cron route only.

**Task 2 — Dashboard (backlog item 5)**

- Scope: this month's rent expected and received, rent owed to owners,
  margin per home, overdue tenants, and empty rooms.
- Files: `src/lib/dashboard.ts` (pure sums), `src/server/dashboard.ts`,
  `src/app/(app)/dashboard/page.tsx`, loading and error screens.
- Tests: unit tests for the sums; the Playwright rent journey checks the
  dashboard figures; an isolation case for the dashboard data.
- Risks: "overdue" needs every unpaid month, however old, so the charges
  query can grow with history. It is read in pages with a hard stop; a
  database view with balances is the long-term answer (item 11).

### Result

**Task 1 — Rent ledger (item 4): done.**

- One rent charge per tenant per calendar month. Charges are made when a
  tenant is added (move-in month to this month), again when a move-in date is
  changed or a "moved out" is undone, and by the daily cron route. Months
  that already have a charge are skipped, so repeating any of these changes
  nothing and old months keep the rent they were made with.
- `GET /api/cron/rent-charges` is protected by a rate limit and by the
  `Authorization: Bearer <CRON_SECRET>` header. With no secret set it refuses
  everything. It is the only code that uses the service-role client, and a
  unit test fails if any other file imports that client or reads the key.
- Status is worked out, never stored: Paid, Part paid, Due, Late. All month
  and date logic is in `src/lib/rent.ts`, in Europe/London, with unit tests.
- `/rent` shows one month (this month by default, earlier months by link),
  late tenants first, with totals. "Mark as paid" is one tap and records what
  is left. "Other amount" opens a one-field form for a part payment. A month
  can have several payments. Each payment can be removed. Recording and
  removing both show a toast with Undo; nothing asks "Are you sure?".
- "Rent" is in the menu (sidebar and bottom bar).

**Task 2 — Dashboard (item 5): done.**

- This month: rent expected, rent received (and what is left), rent owed to
  owners, and what is left after owners.
- Late rent: each late tenant with everything they owe across all months,
  longest overdue first, linking to the month it started.
- Empty rooms, and whole homes with no tenant.
- Each home this month: rent, owner rent and what is left.
- Three queries however many homes there are: the organisation, the homes
  with their rooms, owner leases and tenants, and the charges with their
  payments. The sums are in `src/lib/dashboard.ts` with unit tests.

Checks. As on the last two days, none could run in the build environment, so
they ran in GitHub Actions on `auto/2026-11-17` before `main` was moved. All
passed on the first run:

| Check                              | Result                    |
| ---------------------------------- | ------------------------- |
| `pnpm install --frozen-lockfile`   | Passed (GitHub Actions)   |
| `pnpm typecheck`                   | Passed (GitHub Actions)   |
| `pnpm lint`                        | Passed (GitHub Actions)   |
| `pnpm format:check`                | Passed (GitHub Actions)   |
| `pnpm test`                        | Passed (GitHub Actions)   |
| `SKIP_ENV_VALIDATION=1 pnpm build` | Passed (GitHub Actions)   |
| `pnpm audit --audit-level=high`    | Passed (GitHub Actions)   |
| `pnpm test:rls`                    | Not run here, run locally |
| `pnpm test:e2e`                    | Not run here, run locally |

**What has not been checked.** Like yesterday's tenant code, today's rent and
dashboard code has passed type checking, lint, unit tests and a production
build, but it has never run against a real database or in a real browser,
and nobody has looked at the new screens. Three days of screens are now in
that state. The isolation tests and the Playwright journey written today
(`e2e/rent.spec.ts`) are the way to check it: please run `pnpm test:rls` and
`pnpm test:e2e` locally before relying on any of it.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `sb_publishable_`, `service_role`, API keys, private keys, passwords and
  JWT-shaped strings). The only matches are code that names the
  `SUPABASE_SERVICE_ROLE_KEY` variable. `.env.example` gained an empty
  `CRON_SECRET=` line.
- No new `NEXT_PUBLIC_` variable. The service-role client
  (`src/server/service-client.ts`) imports `server-only`, is imported only by
  the cron route, and no client component imports from `src/server/` except
  for types. `src/server/service-client.guard.test.ts` keeps it that way.
- Four new server actions (`src/app/(app)/rent/actions.ts`). Each validates
  with a shared Zod schema and goes through `runAction` (session check and
  rate limit); the data functions derive the organisation from memberships,
  filter by it, and write `audit_log`.
- One new route handler (the cron route). It has a rate limit and the secret
  header check, takes no input from the request, and gives each new charge
  the organisation of its own tenancy. It cannot use a session or a
  per-organisation scope, because it is the scheduled job for everyone.
- No raw SQL and no `dangerouslySetInnerHTML`. The one filter built from a
  string uses two dates made on the server, never text from the browser.
  The month in the address is checked against a strict pattern before use.
  Errors shown to people are plain messages; error codes go to the log only.
- The migration adds one column and one index: no new table, so no new RLS
  policy is needed, and no existing policy changes.
- One thing was loosened on purpose: `/api/cron` was added to the paths that
  `src/lib/supabase/proxy.ts` lets through without a session, because a cron
  request has none. The route does its own secret check. No RLS policy, auth
  check on a page or action, rate limit or security header was removed or
  weakened. `next.config.ts` and the first migration are untouched.

Pending migrations (see `docs/PENDING_MIGRATIONS.md`):

- `20261117030000_payments_removed_at.sql`: adds `payments.removed_at` and an
  index for the rent page. `database.types.ts` was updated by hand to match.
- Still waiting from yesterday:
  `20261116030000_one_current_tenant_per_place.sql`.

Decisions made without asking:

- Rent is charged by calendar month, and `period_start` is the first day of
  the month. The first month is a full month's rent, not worked out by the
  day.
- Rent is due on the due day, but in the move-in month never before the
  move-in day. It is Late from the day after the due date.
- Rent that is part paid and past its due date shows as Late, not Part paid,
  with what has been paid and what is left.
- "Rent received" means payments against this month's rent, not payments
  made during this month.
- Payments together can never be more than the month's rent: a larger "Other
  amount" is refused with a message. A removed payment cannot be put back if
  the month has since been paid in full another way.
- A payment is dated the day it is recorded. There is no date field yet.
- Payments are removed by setting `removed_at`, never by deleting. That
  needs today's migration. Until it is applied, reads fall back to a query
  without the column, the Remove buttons are hidden, and "Mark as paid" has
  no Undo. This keeps the dashboard and rent page working in the meantime.
- A charge for a month before the tenant's move-in month is left out unless
  something was paid towards it. This matters when a move-in date is typed
  wrong and then corrected: the wrong months would otherwise show as late
  for ever, because charges are never deleted.
- The cron job checks every tenant who lives in a home now or moved out in
  the last two calendar months, and fills in every missing month, not only
  the newest. It writes one `audit_log` row per organisation that got new
  charges (with no user, because nobody is signed in).
- `CRON_SECRET` must be at least 16 characters, or the route treats it as
  not set. The schedule is 00:05 UTC daily in `vercel.json`, which is just
  after midnight in London in winter and 01:05 in summer.
- If making charges fails while a tenant is being saved, the tenant is still
  saved and the problem is logged; the cron job fills in the months.
- The rent list and the dashboard lists are one list each that lines up in
  columns on wide screens, not a separate sortable table. The rent list's
  order is fixed (late first) and it is paginated (25 per page), so there is
  nothing for a heading to sort. TanStack Table and Recharts are still
  unused.
- The rent page reads the whole month (up to 1,000 charges) in one query and
  sorts it in the server, because the order depends on a status that is not
  stored.
- The dashboard reads every charge that is past its due date, however old,
  to find unpaid rent. It reads in pages of 1,000 and stops after 5,000 with
  a warning in the log. A database view with balances would remove this
  limit; that fits item 11 (performance).
- The dashboard no longer shows "Signed in as"; it shows the organisation
  name and the month.
- `TextField` can now take its own `id`, because the "Other amount" field can
  be open for more than one tenant at once.
- No new dependencies.

Needs a human:

- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Third day running. Without it the run cannot install packages, run any
  check itself, read the Next.js guides, or open the app in a browser.
- **Run `pnpm test:rls` and `pnpm test:e2e` locally**, and look at the rent
  page and dashboard at 375, 768 and 1440px. Three days of work have not
  been run against a database.
- **Apply the two pending migrations** (review them first).
- **Set `CRON_SECRET` in Vercel** (Production, and Preview if wanted), then
  redeploy so the daily job in `vercel.json` can run. Check that
  `SUPABASE_SERVICE_ROLE_KEY` is set there too. Until then a new month's
  rent does not appear on its own.
- **Think about tenants who moved in long ago.** As specified, adding a
  tenant makes a charge for every month since they moved in, all unpaid. A
  tenant added with a move-in date two years back shows 24 months as late.
  If that is not wanted, a later task could ask "rent is paid up to which
  month?" when adding a tenant. Nothing was built for this.
- Tenants added before today have no charges yet. The first cron run makes
  them (back to each move-in month). Or run it once by hand with the `curl`
  line in the README.
- Delete the merged branches `auto/2026-11-15`, `auto/2026-11-16` and
  `auto/2026-11-17` in GitHub (this environment cannot delete branches).
- Six Dependabot pull requests are open (#1, #2, #3, #5, #6 and #7); review
  and merge by hand. The grouped minor-and-patch one (#7) passed CI.

### After the push

- `main` is only fast-forwarded to a commit that has already passed every
  check on `auto/2026-11-17`. The CI run for that same commit on `main` can
  be seen in GitHub Actions.
- The `auto/2026-11-17` branch is fully merged once `main` has moved and is
  **not** a blocked build. The next run should treat it, and the two older
  `auto/*` branches, as resolved and not count them as a task.

## 2026-11-18

### Start of run

- Latest CI run on `main` (commit `4753458`): passed. Nothing to fix.
- No open "Daily build blocked" issue. The branches `auto/2026-11-15`,
  `auto/2026-11-16` and `auto/2026-11-17` still exist, but all three are
  ancestors of `main` (fully merged, as the earlier logs say), so they are
  not blocked builds and were not counted as a task.
- **Environment problem, fourth day:** `registry.npmjs.org` still does not
  resolve here (it is on the direct-access list but has no route, and the
  proxy refuses it with 403). `pnpm install --frozen-lockfile` cannot run,
  there is no `node_modules`, and the Next.js guides cannot be read. Not
  worked around.
- Decision: same approach as the last three days. Work goes to
  `auto/2026-11-18`, where CI runs every Step 5 check; `main` is only
  fast-forwarded to a commit that has passed them all. New code uses only
  Next.js APIs the existing code already uses. Prettier 3.8 (a local copy,
  without the Tailwind plugin) is run here before pushing.

### Plan

**Task 1 — Overdue reminders (backlog item 6)**

- Scope: a daily email to each organisation's owners listing late rent
  (tenant, home or room, amount owed, since when), with a total and a link
  to the dashboard. Sent through Resend from a new cron route
  (`/api/cron/overdue-reminders`) protected like the rent-charges one. A
  switch on a new Settings page turns it off for the organisation. The route
  does nothing when `RESEND_API_KEY` or the new `EMAIL_FROM` is missing, and
  sends at most one email per organisation per London day.
- Files: migration adding `organisations.overdue_email_enabled`,
  `database.types.ts`, `src/lib/overdue-digest.ts` (pure email text),
  `src/lib/validation/settings.ts`, `src/server/email.ts`,
  `src/server/settings.ts`, `src/server/overdue-reminders.ts`, the cron
  route, `src/app/(app)/settings/**`, the menu, `src/server/run-action.ts`
  (new scope), `src/lib/env.ts`, `src/server/env.ts`, `vercel.json`,
  `.env.example`, the service-client guard test, README.
- Tests: unit tests for the digest (subject, totals, HTML escaping, links),
  the settings schema and the "send" decision; isolation cases for the
  settings column; a Playwright check of the Settings page at phone and
  desktop widths.
- Risks: emails go to real people, so a bug could send repeats or ignore
  the off switch. Guarded by a once-a-day check in `audit_log` plus a
  Resend idempotency key, and by sending nothing until the migration is
  applied. The Resend SDK types cannot be read here; CI's typecheck is the
  check.

**Task 2 — Security hardening (backlog item 7)**

- Scope: a Content-Security-Policy on every response; a test that reads
  every server action and checks it validates with Zod and goes through
  `runAction` (session and rate limit), and that every data function that
  writes derives the organisation and writes `audit_log`; tests for the
  security headers.
- Files: `src/lib/security-headers.ts`, `next.config.ts`, tests next to
  them, `src/server/server-actions.guard.test.ts`.
- Risks: a CSP that is too strict breaks the app in the browser, and it
  cannot be opened in a browser here. So the policy allows inline scripts
  (no nonces, which would also force every page to render per request) and
  locks down everything else. A nonce-based script policy is a follow-up
  once it can be tested in a real browser.
