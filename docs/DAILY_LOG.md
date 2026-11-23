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

### Result

**Blocked: not pushed to `main`.** Both tasks are built and pass every check
except `pnpm audit`, which now fails on a new advisory in a package this
work did not touch (details below). The work is on `auto/2026-11-18` and
both roadmap items are left unticked, as the rules say. Issue: "Daily build
blocked: 2026-11-18".

**Task 1 — Overdue reminders (item 6): built, blocked only by the audit.**

- `GET /api/cron/overdue-reminders` (08:05 UTC daily in `vercel.json`, so
  08:05 in London in winter and 09:05 in summer) emails each organisation's
  owners a list of late rent: each late tenant, their home or room, what
  they owe and since when, a total, and links to the dashboard, the rent
  page and Settings. "Late" uses the same queries and sums as the dashboard.
- Same protection as the rent-charges job: rate limit, then the
  `CRON_SECRET` header. Nothing is read or sent when `RESEND_API_KEY` or the
  new `EMAIL_FROM` is missing (it answers `skipped: "email-not-configured"`),
  or before today's migration is applied (it cannot tell who turned the
  email off, so it sends nothing).
- At most one email per organisation per London day: a sent email writes an
  `overdue_digest.sent` row to `audit_log` (amounts and counts only), which
  is checked first, and Resend gets the idempotency key
  `overdue-digest/<organisation>/<day>`.
- A new Settings page (in the menu on phones and desktops) has one switch,
  "Email me about late rent", with Undo in the toast. Only owners can change
  it; staff see why not. The change is validated, rate limited, scoped to
  the organisation on the server and written to `audit_log`.
- The email text is built by `src/lib/overdue-digest.ts`, with unit tests:
  totals, singular and plural, at most 50 tenants listed, names never in the
  subject, and every name escaped in the HTML.

**Task 2 — Security hardening (item 7): built, blocked only by the audit.**

- Every response now has a Content-Security-Policy (`src/lib/security-headers.ts`):
  only this site by default; scripts only from this site; no plugins,
  framing, other base URLs or posting forms elsewhere; connections only to
  this site and the Supabase project; `upgrade-insecure-requests` in
  production. Inline scripts are still allowed (see decisions). Also added
  `Cross-Origin-Opener-Policy: same-origin`. Every earlier header is kept
  with the same value, and a test checks that.
- `src/server/server-actions.guard.test.ts` reads the source and fails if a
  server action skips Zod, skips `runAction` (session and rate limit), or
  calls a data function that does not derive the organisation and write
  `audit_log`; if a new sign-in action appears without review; or if a
  route handler has no rate limit, or a cron route touches the service-role
  client before the secret check. It was checked by breaking the rules on
  purpose: it fails as it should.
- The check found one gap: the sign-in link route (`/auth/confirm`) had no
  rate limit. It now has one (20 per 15 minutes per IP address).

Checks (none can run here; all ran in GitHub Actions on `auto/2026-11-18`):

| Check                              | Result                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `pnpm install --frozen-lockfile`   | Passed (GitHub Actions)                                   |
| `pnpm typecheck`                   | Passed (GitHub Actions)                                   |
| `pnpm lint`                        | Passed after one fix (a variable named `module`)          |
| `pnpm format:check`                | Passed after fixes (see below)                            |
| `pnpm test`                        | Passed (GitHub Actions)                                   |
| `SKIP_ENV_VALIDATION=1 pnpm build` | Passed (GitHub Actions)                                   |
| `pnpm audit --audit-level=high`    | **Failed**: GHSA-fc5q-39xc-vjpf in `picomatch`, see below |
| `pnpm test:rls`                    | Not run here, run locally                                 |
| `pnpm test:e2e`                    | Not run here, run locally                                 |

The audit failure: a new high-severity advisory, "picomatch vulnerable to
ReDoS through single-branch repeated extglobs" (GHSA-fc5q-39xc-vjpf),
affects every `picomatch` up to 4.0.7 and has **no patched version**. It
comes in through 55 paths, for example `shadcn > fast-glob > micromatch >
picomatch`. It is not caused by today's changes, and `main` will fail the
same check on its next run. It cannot be fixed by an update, and ignoring it
would weaken a security check, so that decision is left to a person (see
"Needs a human").

The format failures: the local Prettier is 3.8 and CI uses 3.10. One
construct was formatted differently (a multi-line union type in
`src/lib/overdue-digest.ts`). A probe branch with the file cut into pieces
found it; it is now written as a constant list. The probe branch
`auto/2026-11-18-format-probe` could not be deleted from here.

Local stand-ins: the new and changed unit tests (digest, settings schema,
security headers, both guard tests, dashboard) were run here with a small
stand-in for Vitest; Prettier 3.8 and Tailwind 4.3.3's own class sorter
were run on every changed file.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `sb_publishable_` values, `service_role`, Resend-style `re_` keys, private
  keys and JWT-shaped strings). `.env.example` gained an empty `EMAIL_FROM=`.
- No new `NEXT_PUBLIC_` variable. `RESEND_API_KEY` and `EMAIL_FROM` are read
  only in `src/server/env.ts`; the email code imports `server-only`. The
  service-role client is imported by the two cron routes only (the guard
  test lists both).
- One new server action (`setOverdueEmailAction`): Zod, `runAction`
  (session and rate limit), organisation from memberships, owner check,
  `audit_log`. One new route handler (the email cron): rate limit and secret
  header before anything else; it takes no input from the request.
- No raw SQL, no `dangerouslySetInnerHTML`. Email HTML escapes every value
  typed by users; names never go in the subject. Errors shown to people are
  plain; logs carry error codes only, never addresses or names.
- The migration adds one column, no table, and changes no policy or grant.
- Nothing was weakened: one rate limit was added (`/auth/confirm`), and
  every existing header is kept. `form-action 'self'` and `frame-ancestors
'none'` are new restrictions.

Pending migrations (see `docs/PENDING_MIGRATIONS.md`):

- New: `20261118030000_overdue_email_setting.sql` adds
  `organisations.overdue_email_enabled` (default on). `database.types.ts`
  was updated by hand.
- Still waiting: `20261116030000_one_current_tenant_per_place.sql` and
  `20261117030000_payments_removed_at.sql`.

Decisions made without asking:

- The email is one per organisation, sent to every owner together (not to
  staff). The switch is per organisation, on by default, and only owners
  can change it.
- It is sent at 08:05 UTC, and only when something is late. An organisation
  with no late rent gets nothing.
- Resend is called through the `resend` package, which was already a
  dependency. No new dependencies.
- A new optional `EMAIL_FROM` variable, because Resend needs a sender on a
  verified domain. Without it nothing is sent.
- The CSP allows inline scripts (`'unsafe-inline'`) instead of using nonces.
  Nonces would make every page render on each request and need testing in a
  real browser, which this environment cannot do. Everything else in the
  policy is strict. On Vercel preview deployments the Vercel toolbar may be
  blocked by the policy; production is not affected.
- The dashboard's home and charge reads were split out so the daily job can
  use them with its own client. Nothing about the dashboard changed.

Needs a human:

- **Decide about GHSA-fc5q-39xc-vjpf (picomatch), which blocks every build.**
  There is no fixed version. picomatch is only used by build and developer
  tools here (globbing file paths), never on text from users, so the risk to
  the running app looks low. If you agree, add this to
  `pnpm-workspace.yaml` with a comment and a date to look again:
  `auditConfig: { ignoreGhsas: [GHSA-fc5q-39xc-vjpf] }`. Then merge
  `auto/2026-11-18` into `main` (it passed every other check) and tick items
  6 and 7 in `docs/ROADMAP.md`. Or wait for a patched picomatch.
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Fourth day. It is why Prettier differences cost several CI rounds today.
- **Run `pnpm test:rls` and `pnpm test:e2e` locally**, and look at the new
  Settings page at 375, 768 and 1440px. Also open the app once in a browser
  with the new CSP and check the console for blocked items.
- **Apply the three pending migrations** (review them first).
- **To switch the email on:** verify a sending domain in Resend; set
  `RESEND_API_KEY` and `EMAIL_FROM` (for example
  `RentDesk <reminders@your-domain>`) in Vercel; make sure `CRON_SECRET` is
  set; redeploy. Then send yourself one by hand with the `curl` line in the
  README and check how it looks on a phone.
- Delete the merged branches `auto/2026-11-15`, `auto/2026-11-16` and
  `auto/2026-11-17`, and the probe branch `auto/2026-11-18-format-probe`.

## 2026-11-19

### Start of run

- Latest CI run on `main` (commit `db70e76`, "Add property photos, a
  test-only password sign-in and a demo seed script", pushed after the last
  daily run): passed. `pnpm audit` on it reported only "1 moderate", so the
  picomatch advisory GHSA-fc5q-39xc-vjpf that blocked yesterday is no longer
  rated high.
- Open issue #8 "Daily build blocked: 2026-11-18" and the branch
  `auto/2026-11-18` (backlog items 6 and 7). Resolving it is **task 1**.
- **Environment problem, fifth day:** `registry.npmjs.org` still does not
  resolve here, so `pnpm install` cannot run and the Next.js guides in
  `node_modules/next/dist/docs/` cannot be read. Same approach as before:
  work goes to `auto/2026-11-19`, CI runs every Step 5 check there, and
  `main` is only fast-forwarded to a commit that passed them all. New code
  only uses Next.js APIs the existing code already uses.

### Plan

**Task 1 — Unblock yesterday's build (items 6 and 7)**

- Scope: rebase `auto/2026-11-18` onto `main` as `auto/2026-11-19`, resolve
  conflicts with the photos commit, and make yesterday's server action guard
  cover what `main` added since (`photo-actions.ts`, the test-only password
  sign-in). Then let CI confirm every check, including the audit.
- Files: `docs/PENDING_MIGRATIONS.md` and `README.md` (conflicts),
  `src/server/server-actions.guard.test.ts`.
- Tests: the guard test itself; the full CI run.
- Risks: the guard could pass by being loosened. Only one named exemption is
  added (a data function that writes nothing), with its reason in the test.

**Task 2 — Data rights (backlog item 8)**

- Scope: owners can download three CSV files from Settings (homes, tenants,
  payments), and can remove a moved-out tenant's personal details (name,
  phone, email and payment notes), keeping the rent records.
- Files: `src/lib/csv.ts` (CSV building and escaping, pure),
  `src/lib/validation/data-rights.ts`, `src/server/data-export.ts`,
  `src/app/api/export/route.ts`, `src/server/tenants.ts` (remove details),
  `src/app/(app)/tenants/actions.ts`, a new component on the tenant page, the
  Settings page, the server action guard, README.
- Tests: unit tests for CSV escaping (commas, quotes, new lines, spreadsheet
  formulas), pounds formatting and the schemas; the guard test covers the
  new action and route; an e2e check of the Settings downloads and the
  remove-details flow at phone and desktop widths; an isolation case that
  another organisation's tenant cannot be changed.
- Risks: an export is a bulk copy of personal data, so it is owners only,
  rate limited, scoped to the organisation and written to `audit_log`.
  Cells that start with `=`, `+`, `-`, `@` are made safe for spreadsheets.
  Removing details cannot be undone, which clashes with the Undo rule (see
  decisions).

### Result

**Both tasks done. Pushed to `main`** (fast-forwarded to a commit that
passed every CI check on `auto/2026-11-19`). Items 6, 7 and 8 are ticked.
Issue #8 is closed.

**Task 1 — Unblock yesterday's build (items 6 and 7): done.**

- GHSA-fc5q-39xc-vjpf (picomatch) is now rated moderate in the advisory
  database, so `pnpm audit --audit-level=high` passes without any ignore
  rule. Nothing about the audit was changed or loosened.
- `auto/2026-11-18` was rebased onto `main` as `auto/2026-11-19`. Two
  conflicts, both text: `docs/PENDING_MIGRATIONS.md` (all four migrations
  kept, in date order) and `README.md` (the late rent email section and
  `EMAIL_FROM` kept beside the new photos, demo account and
  `ENABLE_TEST_LOGIN` sections).
- The server action guard written yesterday did not know about what `main`
  gained since. It now also checks named action files (`photo-actions.ts`,
  whose three actions pass Zod, `runAction`, organisation and audit checks),
  knows the test-only password sign-in (rate limited and validated), and
  has one named exemption with its reason: `photos.preparePhotoUpload` only
  picks a Storage path and writes nothing, so it has no `audit_log` row.
- The late rent email and the security hardening from yesterday are now on
  `main` unchanged.

**Task 2 — Data rights (item 8): done.**

- Settings has a "Download your data" section (owners only) with three
  downloads: homes (with rooms in use and the current owner), tenants (now
  and past, with rent, deposit and dates) and payments (with the month,
  tenant, home and room, and whether it was removed). The download route
  (`GET /api/export?data=…`) checks the session, rate limits (10 per 10 minutes
  per user), validates `data` with Zod, allows owners only, reads with the
  user's own client and writes a `data.exported` audit row (file and row
  count only). Problems go back to Settings with a plain message.
- CSV files: every cell quoted; cells starting with `=`, `+`, `-`, `@`, tab
  or carriage return are written as text so a spreadsheet never runs them;
  money is pounds with two decimals from integer pence; UTF-8 with a byte
  order mark so Excel shows accents; one file is read in pages of 1,000 and
  stops with a message above 100,000 rows.
- A moved-out tenant's page has "Their personal details" (owners only):
  "Remove their personal details" opens a short explanation on the page,
  and "Yes, remove their details" removes their name (shown as "Former
  tenant (details removed)" from then on), phone, email and every note on
  their payments. Rent charges and payment amounts stay. After that the
  page hides "Edit tenant" and "They have not moved out", and the server
  refuses to make them a current tenant again. Audited as
  `tenant.personal_details_removed` with which kinds of detail were
  removed, never the details.
- Tests: unit tests for CSV escaping, pounds, file names, the export
  columns and the two schemas; the guard test now covers the new action and
  checks the export route's session check, Zod, rate limit order, owner
  check and audit; isolation cases (A's downloads never include B's data,
  A cannot remove B's tenant's details, and a positive control that checks
  what is removed and kept); a Playwright journey at phone and desktop
  widths (`e2e/data-rights.spec.ts`: download, remove with keyboard,
  download again).

Checks (`pnpm install` still cannot run here; every check ran in GitHub
Actions on `auto/2026-11-19`, runs 35 and 36, both passed first time):

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

Local stand-ins before pushing: the guard tests, CSV, export column, rent
and validation tests ran here with a small stand-in for Vitest (the
validation ones against a Zod 4 copy); Prettier 3.8 (without the Tailwind
plugin) on every changed file; Tailwind 4.3.3's own class order on every
changed component.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `sb_publishable_` values, `service_role`, `re_` keys, private keys and
  JWT-shaped strings). The only `.env.example` change is yesterday's empty
  `EMAIL_FROM=`.
- No new `NEXT_PUBLIC_` variable. No new use of the service-role client;
  the export route and the new action use the user's own client, and the
  service-client guard test still lists only the two cron routes.
- One new server action (`removeTenantDetailsAction`): Zod (with an
  explicit `confirm: true`), `runAction` (session and rate limit),
  organisation from memberships, owner check, `audit_log`. One new route
  handler (`/api/export`): session, rate limit, Zod, organisation, owner
  check, `audit_log`. It is not a public path, so the proxy also sends
  signed-out visitors to sign-in.
- No raw SQL, no `dangerouslySetInnerHTML`. The download file name is
  built only from the checked file kind and today's date. The message on
  Settings is chosen from our own list; anything else in the address is
  ignored. Errors shown to people are plain; logs carry error codes only.
- No migration today, so no new table and no policy change. Nothing was
  weakened: the guard gained checks and one reasoned exemption for a
  function that writes nothing.

Pending migrations: none new today. Still waiting (see
`docs/PENDING_MIGRATIONS.md`): `20261116030000_one_current_tenant_per_place`,
`20261117030000_payments_removed_at`, `20261118030000_overdue_email_setting`
and `20261119000000_property_photos`.

Decisions made without asking:

- Yesterday's blocked work was merged once the audit passed on its own. No
  audit ignore rule was added.
- Downloads and removing details are for owners only. Staff can still see
  everything in the app, but a whole-account copy of personal data, or a
  change that cannot be undone, is the owner's call.
- Removing details is the one action in the app without Undo, because
  there is nothing left to put back. Instead of a pop-up dialog, the first
  tap opens a short explanation in the page and a second, clearly worded
  button does it. It only works for tenants who have moved out.
- Removed details are marked by the tenant's name becoming "Former tenant
  (details removed)" with no phone or email, rather than by a new column.
  This needs no migration (four are already waiting). A real column would
  be cleaner; it fits item 11 or 14.
- Payment notes are cleared too, because people write names in them. The
  audit log needed nothing: it has never stored names, phone numbers or
  emails.
- Rent charges and payment amounts are kept after removal, for the
  landlord's accounts. Whether that is enough for a given request is a
  legal question (see below).
- The homes file shows each home's current owner only (the same rule as the
  home page), and rooms in use only.
- Downloads are plain links, not buttons that run code, so they work on
  every phone and without JavaScript.
- `isOwner` moved from `settings.ts` to `context.ts` as
  `isOrganisationOwner`, so settings, downloads and the tenant page share it.
- No new dependencies.

Needs a human:

- **Run `pnpm test:rls` and `pnpm test:e2e` locally**, and look at Settings
  and a past tenant's page at 375, 768 and 1440px. Open a downloaded file in
  Excel or Google Sheets once.
- **Apply the four pending migrations** (review them first). The photos one
  is needed before deploying `main`.
- **Legal check on "remove personal details":** keeping rent amounts and
  dates without a name is a common approach to an erasure request while
  keeping accounts, but please confirm it with someone who knows UK GDPR.
- **Note on `main`'s photos commit (not changed today):** "Remove photo"
  deletes the row and the file instead of archiving with Undo, which the
  project rules ask for. Decide whether that is intended.
- **Turn on the late rent email** (from yesterday): verify a sending domain
  in Resend, set `RESEND_API_KEY`, `EMAIL_FROM` and `CRON_SECRET` in Vercel,
  redeploy.
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Fifth day.
- Delete the merged branches `auto/2026-11-15` to `auto/2026-11-19` and the
  probe branch `auto/2026-11-18-format-probe` (this environment cannot
  delete branches). None of them is a blocked build.
- Dependabot pull requests are still open, including the grouped
  minor-and-patch one (#9), which passed CI.

## 2026-11-20

### Start of run

- First run on the PropDesk task book (`docs/ROADMAP.md`, `PRODUCT_SPEC.md`,
  `DESIGN_SYSTEM.md`, `DECISIONS.md`, all read).
- Latest CI run on `main` (commit `e9e5568`, the task book): passed. Nothing
  to fix.
- No open "Daily build blocked" issue. The branches `auto/2026-11-15` to
  `auto/2026-11-19` and `auto/2026-11-18-format-probe` still exist; earlier
  logs say all are merged and none is a blocked build, so no task was spent
  on them. No `next` branch yet, so nothing to rebase.
- **Environment problem, sixth day:** `pnpm install --frozen-lockfile`
  cannot run. `registry.npmjs.org` does not resolve directly and the egress
  proxy answers 403 (a policy denial; not retried or worked around). No
  `node_modules`, so the Next.js guides cannot be read and the checks cannot
  run here. Same approach as before: work goes to `auto/2026-11-20`, the CI
  workflow runs every Step 5 check there, and `main` only moves forward to
  a commit that passed them all. New code uses only Next.js and Base UI APIs
  the existing code already uses.

### Plan

Today: **A1 (L) only**, since it is marked large. No decision blocks it.

**A1: Design tokens and app shell** → `main` (no migration).

- Scope: `DESIGN_SYSTEM.md` §1 tokens in `globals.css` (as `--pd-*`
  variables, mapped onto the shadcn variables and exposed as Tailwind
  colours); Geist is already loaded with `next/font`. New shell in
  `src/components/app/`: grouped sidebar (links to pages that do not exist
  yet are left out, and a group with nothing in it is hidden), organisation
  block (name and account type; a menu of the user's organisations only
  when there is more than one, switching comes in B5), person block
  (initials, email until profiles exist in B2, role) with Sign out; top bar
  with a search box that opens a ⌘K / Ctrl K dialog searching homes and
  tenants, and a **+ New** menu with only the items that work today
  (Property); phone top bar (logo, search icon, + New) and a bottom bar with
  Today, Properties, Rent and More (More opens the rest of the menu).
  `formatDateUK` (DD/MM/YYYY) with tests, used where record and table dates
  are shown.
- Files: `src/app/globals.css`, `src/app/(app)/layout.tsx`,
  `src/components/app/*` (new), `src/components/app-nav.tsx` (removed),
  `src/lib/dates.ts`, `src/lib/nav.ts`, `src/lib/people.ts`,
  `src/lib/validation/search.ts`, `src/server/shell.ts`,
  `src/server/search.ts`, `src/app/(app)/search/actions.ts`,
  `src/server/run-action.ts`, the guard test, e2e specs that click menu
  links by their old names.
- Migration: none. Account type is not stored until B2, so the
  organisation block shows "Property manager" (D-5).
- Tests: unit tests for `formatDateUK`, the menu groups, initials and role
  names, and the search schema (it strips characters that could change a
  query filter); guard test updated for the search action; a new Playwright
  spec for the shell at phone and desktop widths (⌘K search, + New, More).
- Risks: no local typecheck or build (CI only); Base UI dialog and menu
  props must match the copies in `src/components/ui/`; the search action
  is read-only, so it does not write `audit_log` (a search term can be a
  person's name, which the audit log must never hold).

### Results

| Task                                | Status                    | Branch                         |
| ----------------------------------- | ------------------------- | ------------------------------ |
| A1 (L): Design tokens and app shell | Done                      | `main` (via `auto/2026-11-20`) |
| A2 onwards                          | Not started (A1 is large) |                                |

What A1 added:

- Tokens: `--pd-*` variables in `globals.css`, exposed as Tailwind colours
  (`bg-canvas`, `bg-subtle`, `text-ink`, `text-ink-2`, `text-bad`,
  `bg-good-soft` and so on); the shadcn variables point at them. Geist was
  already loaded with `next/font`.
- Shell (`src/components/app/`): grouped sidebar 248px wide (Today;
  Portfolio › Properties with a count of homes; Money › Rent; Account ›
  Settings), organisation block, person block with role and Sign out; top
  bar with the search box and **+ New** (Property only); phone top bar and
  bottom bar (Today, Properties, Rent, More). The menu is defined once in
  `src/lib/nav.ts`; Owners, Tenants, Tenancies, Reports, Repairs and
  Contractors are listed there with `ready: false` and appear when their
  pages are built.
- ⌘K / Ctrl K search over homes (name, street, postcode) and tenants
  (name), six of each, with ↑ ↓ and Enter.
- `formatDateUK`, used for a tenant's move-in date and payment dates.
- Content is left-aligned beside the sidebar, at most 1240px wide.

Checks (`pnpm install` cannot run here; every check ran in GitHub Actions
on `auto/2026-11-20`, run 44, passed first time):

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

Local stand-ins before pushing: the new nav, people, date and search tests
ran here with a small stand-in for Vitest (search against a local Zod
copy); Prettier 3.8 on every changed file; Tailwind 4.3.3's own class
order on every changed component (139 class lists, no differences).
Playwright screenshots at 375, 768 and 1440px could not be taken: the app
cannot be built or run here.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `service_role`, JWT-shaped strings, `re_` keys and private keys; the
  only hit is the existing e2e skip message naming
  `SUPABASE_SERVICE_ROLE_KEY`). No new `NEXT_PUBLIC_` variable and no
  service-role client anywhere near the new code.
- One new server action (`searchAction`): shared Zod schema, `runAction`
  (session check, rate limit: its own 120 a minute, the user's own client
  so RLS applies), organisation from memberships via `getOrganisationId`.
  The guard test lists it, and `search.searchRecords` is on its reviewed
  "no audit" list because it only reads. No new route handler.
- No raw SQL. The search term goes into a PostgREST `or` filter for homes,
  so the schema removes every character except letters, numbers, spaces
  and `' . - &` (no commas, brackets, quotes, backslashes, `%` or `_`),
  and the value is double-quoted; tests cover it. No
  `dangerouslySetInnerHTML`. Errors shown are the existing plain messages.
- The shell's data (memberships, organisation names, a count of homes)
  is read with the user's own client. If it fails, pages still load
  without the organisation block, and only an error code is logged.
- No migration, so no new table or policy. Nothing weakened.

Pending migrations: none new today. Still waiting (see
`docs/PENDING_MIGRATIONS.md`): the four from 16 to 19 November.

Decisions made without asking:

- Only **A1** today, because it is marked large.
- The organisation block shows "Property manager" for every organisation
  until account types are stored in B2 (D-5). With several organisations
  it opens a list, but the others cannot be picked until B5.
- The person block shows the email address in place of a name until
  profiles exist (B2).
- No notifications bell yet: there is nothing for it to list until D5,
  and the roadmap's A1 does not ask for it. It is added with D5.
- **+ New** lists Property only. Tenant needs a home or room first, and
  Payment, Owner, Repair and Contractor have no page yet.
- The search placeholder says "Search homes and tenants…" rather than the
  mockup's "…owners…", because owners are not searchable until D3.
- Search does not write `audit_log`: it changes nothing, and search terms
  are often names, which the audit log must never hold.
- The phone bottom bar has Today, Properties, Rent and More; Repairs joins
  when it exists. Settings and Sign out are under More.
- The page title on `/dashboard` is still "Dashboard"; it becomes "Today"
  in A3.
- No new dependencies.

Needs a human:

- **Run `pnpm test:e2e` and `pnpm test:rls` locally** (new spec
  `e2e/shell.spec.ts`), and look at the new shell at 375, 768 and 1440px:
  sidebar, ⌘K search, + New, and More on a phone.
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Sixth day. Without it the run cannot read the Next.js guides, take
  screenshots or run the app.
- **Apply the four pending migrations** (review them first). The photos
  one is needed before deploying `main`.
- From earlier days (unchanged): legal check on "remove personal details";
  "Remove photo" hard-deletes instead of archiving; Resend and
  `CRON_SECRET` settings for the late rent email; delete the merged
  `auto/*` branches (now including `auto/2026-11-20`); Dependabot pull
  requests #1, #2, #3, #5, #6 and #9 are open.

## 2026-11-21

### Start of run

- Docs read: `ROADMAP.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md` (and the
  Today mockup), `DECISIONS.md`, `PENDING_MIGRATIONS.md`, README, AGENTS.md
  and the last days of this log.
- Latest CI run on `main` (run 46, commit `135d78c`, yesterday's log):
  passed. Nothing to fix.
- No open "Daily build blocked" issue. `auto/2026-11-16`, `-17`, `-19` and
  `-20` are merged into `main`. `auto/2026-11-15`, `auto/2026-11-18` and
  `auto/2026-11-18-format-probe` are not ancestors of `main`; earlier logs
  say their work reached `main` by other commits (and no blocked-build issue
  is open for them), so no task was spent on them. No `next` branch yet.
- **Environment problem, seventh day:** `pnpm install --frozen-lockfile`
  fails. `registry.npmjs.org` does not resolve directly and the egress proxy
  answers 403 (a policy denial; not retried or worked around). No
  `node_modules`, so the Next.js guides cannot be read and typecheck, lint,
  tests and build cannot run here. Same approach as before: the work goes to
  `auto/2026-11-21`, the CI workflow runs every Step 5 check there, and
  `main` only moves forward to a commit that passed them all. New code uses
  only Next.js, React and Base UI APIs the existing code already uses.

### Plan

Today: **A2 (L) only**, since it is marked large. No decision blocks it.

**A2: Page templates** → `main` (no migration).

- Scope: shared components in `src/components/app/` from
  `DESIGN_SYSTEM.md` §3 and §4: page header, stat card (and grid), section
  card, status pill, count pill, priority badge, filter tabs, data table
  (sticky header, row hover, sortable headings as links), pagination,
  record header (back link, photo or initials avatar, chips, actions),
  record tabs (links, so they work without JavaScript), activity timeline,
  empty state, photo card, avatar and side sheet. Then move the Properties
  list, the home page, the tenant page and the Rent page onto them without
  changing what they do. A small `homeStatus` helper gives the home status
  words (Fully let, 1 room empty, Empty, Archived).
- Files: `src/components/app/*` (new), `src/lib/home-status.ts` (new),
  `src/app/(app)/homes/page.tsx`, `src/app/(app)/homes/[id]/page.tsx`,
  `src/app/(app)/tenants/[id]/page.tsx`, `src/app/(app)/rent/page.tsx`,
  `src/components/homes/homes-table.tsx`, `home-card.tsx`,
  `src/components/rent/rent-status-badge.tsx`, loading skeletons, e2e specs
  only where a visible word changes.
- Migration: none.
- Tests: unit tests (Testing Library) for every new component and the home
  status helper; a Playwright spec that opens the Properties list, a home
  and the Rent page at 375, 768 and 1440px and saves screenshots.
- Risks: no local typecheck, lint or build (CI only); e2e specs find things
  by their accessible names, so every heading, link and button keeps its
  name; screenshots cannot be taken here (the app cannot run).

### Results

| Task                   | Status                    | Branch                         |
| ---------------------- | ------------------------- | ------------------------------ |
| A2 (L): Page templates | Done                      | `main` (via `auto/2026-11-21`) |
| A3 onwards             | Not started (A2 is large) |                                |

What A2 added (`src/components/app/`):

- Page header (title, count read out as "Properties 4 homes", one line,
  main action), stat card and grid with a progress bar, section card,
  status pill (good, bad, warn, info, orange, neutral, outline), count
  pill, priority badge (Urgent, High, Normal, Low), filter tabs and record
  tabs (both links, so they work without JavaScript and keep the address),
  data table (sticky header, row hover, its own sideways scroll, sortable
  headings as links), pagination, record header (back link, photo or
  initials, fact chips, actions), activity timeline, empty state, photo
  card, initials avatar, side sheet (full screen on phones, 560px
  elsewhere), and `action-classes.ts` for links that look like buttons.
- `homeStatus()` in `src/lib/home-status.ts`: Fully let, 1 room empty /
  N rooms empty, Empty, Archived.
- Rent statuses now use the fixed colours: Paid green, Part paid blue,
  Due amber, Late red (always with the word).
- Pages moved onto them, same behaviour, same link and button names:
  **Properties** (title is now "Properties", matching the menu; Current /
  Including archived filter tabs replace the "Show archived homes" link;
  photo cards on phones and tablets, the shared table on desktop),
  **a home** (record header with cover photo, let type chip and status;
  Overview and Photos tabs, `?tab=photos`; stat and section cards),
  **a tenant** (record header with initials, Current / Moved out; Rent
  card, Contact card on the right) and **Rent** (page header, three stat
  cards with a progress bar, rows in a section card with initials).

Checks (`pnpm install` cannot run here, so every check ran in GitHub
Actions on `auto/2026-11-21`; run 52 passed):

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

Runs 47, 48, 51 failed on the way and were fixed: plain `<a>` page links
in the new unit test (lint), a union type that Prettier 3.10 prints
differently from the 3.8 copy here (found with a short-lived probe branch,
`auto/2026-11-21-format-probe`; the type is now derived from its colour
map), a file named `actions.ts` that the server-action guard test
reserves (renamed `action-classes.ts`), and the spoken page count.
Local stand-ins: every new component rendered with React's server
renderer through esbuild; Tailwind 4.3.3's own class order checked on
every changed file.

**Screenshots at 375, 768 and 1440px: not taken.** The app cannot run
here (no `node_modules`, no Supabase). The new `e2e/templates-desktop.spec.ts`
opens Properties, a home and Rent at all three widths, checks nothing
scrolls sideways and saves `test-results/screens/*.png` when it is run
locally.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `service_role`, JWT-shaped strings, API keys and private keys; the only
  hit is the e2e skip message naming `SUPABASE_SERVICE_ROLE_KEY`). No new
  `NEXT_PUBLIC_` variable; no service-role client near the new code.
- No new server action or route handler. Pages still call
  `requireUser()` and read with the user's own client, so RLS applies.
  The home page's `?tab=` value is checked against a fixed list.
- No raw SQL, no `dangerouslySetInnerHTML`, no new error text.
- No migration, so no new table or policy. Nothing weakened.

Pending migrations: none new today. Still waiting: the four from 16 to
19 November (`docs/PENDING_MIGRATIONS.md`).

Decisions made without asking:

- Only **A2** today, because it is marked large.
- The Properties page title is "Properties" (the menu name); sentences
  and links still say "home" ("All homes", "Add a home").
- Archived homes are a filter tab ("Including archived") instead of a
  link under the list. Same address (`?archived=1`).
- A home's photos moved to a **Photos** tab; the cover photo shows in the
  header. Past tenants stay on Overview (a History tab comes with the
  activity log). The tenant page has no tabs yet: it has only two cards.
- The Rent page has no status filter tabs yet; filtering rent by status
  is part of A3's "Rent this month" table.
- Tables keep their own sideways scroll and a 640px minimum width on
  wide screens; phones and tablets get cards instead.
- The side sheet is built but not used yet; quick edits move into it as
  later items touch those forms.
- No new dependencies.

Needs a human:

- **Run `pnpm test:e2e` and `pnpm test:rls` locally.** New spec
  `e2e/templates-desktop.spec.ts`; look at its screenshots in
  `test-results/screens/` (Properties, a home, Rent at 375, 768 and
  1440px).
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`.**
  Seventh day. Without it the run cannot read the Next.js guides, take
  screenshots or run checks before pushing.
- **Delete the branch `auto/2026-11-21-format-probe`** (the run could not
  delete it: the push was refused) and the merged `auto/*` branches.
- **Apply the four pending migrations** (review them first).
- From earlier days (unchanged): legal check on "remove personal details";
  "Remove photo" hard-deletes instead of archiving; Resend and
  `CRON_SECRET` settings for the late rent email; Dependabot pull
  requests are open.

## 2026-11-22

### Start of run

- Docs read: `ROADMAP.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md` (and the
  Today mockup), `DECISIONS.md`, `PENDING_MIGRATIONS.md`, README, AGENTS.md
  and the last days of this log.
- Latest CI run on `main` (run 54, commit `ba96128`, yesterday's log):
  passed. Nothing to fix. No open "Daily build blocked" issue; every
  `auto/*` branch is merged or was resolved on earlier days. No `next`
  branch yet.
- The run has no `add_repo` tool; the repository was already cloned in the
  session with push access, so that was used.
- **Environment problem, eighth day:** `pnpm install --frozen-lockfile`
  fails (`registry.npmjs.org` does not resolve; the egress proxy answers
  403, a policy denial, not retried). So, as before, every Step 5 check runs
  in GitHub Actions on `auto/2026-11-22` and `main` only moves to a commit
  that passed. New today: local stand-ins found in the image (Node 22 type
  stripping for the pure unit tests, global TypeScript 7 for the pure
  modules, esbuild + React 19 server rendering, Tailwind 4.3.3 to compile
  the CSS and sort classes, and Playwright's Chromium for screenshots).

### Plan

Today: **A3** and **B1** (neither is large). No decision blocks them.

**A3: Today page** → `main` (no migration).

- Scope: rebuild `/dashboard` as Today to match the mockup with the data
  that exists: date line, greeting, one sentence on what needs the user;
  four stat cards (rent received this month with a bar, late rent, left
  after owners, rooms let with one dash per place); **Needs you** (late
  rent, and rooms or whole homes empty for 2+ weeks, each with one action);
  **Your homes** (4 photo cards with the status chip); **Rent this month**
  (All / Late / Still due / Paid as links, table on desktop, cards on
  phones, "Mark as paid" with Undo); **Recent activity** from `audit_log`
  with home names and amounts only. First-run card when there are no homes.
  Repairs and tenancies ending stay out until D2 and D5.
- Files: `src/lib/today.ts` (new, pure), `src/lib/dashboard.ts` (optional
  `createdOn` and charge `id`), `src/server/dashboard.ts`,
  `src/server/rent.ts` (charge ids, "can remove payments"),
  `src/app/(app)/dashboard/*`, `src/components/rent/mark-paid-button.tsx`
  (new), `e2e/rent.spec.ts`, `e2e/today.spec.ts` (new).
- Migration: none (reads existing columns; photos are read in their own
  query and simply hidden if that fails).
- Tests: unit tests for every helper in `today.ts`; existing dashboard sums
  unchanged; Playwright at 375, 768 and 1440px.
- Risks: query count grows from three to five plus one Storage signing
  call (still constant, never per home); "Mark as paid" reuses the existing
  server action, so no new write path.

**B1: Email and password** → `main` (no migration).

- Scope: sign up, sign in and password reset with Supabase Auth, "Email me
  a sign-in code" kept as a second option; rate limits and plain errors;
  remove the test-only password box and `ENABLE_TEST_LOGIN`; update the seed
  script and README.
- Files: `src/app/(auth)/*`, `src/app/auth/confirm/route.ts`,
  `src/lib/validation/auth.ts`, `src/server/test-login.ts` (removed),
  `scripts/seed-demo.mjs`, README, e2e specs.
- Migration: none.
- Tests: Zod schema tests, the server-action guard test, e2e for the forms.
- Risks: sign-in is the front door of the live test site; anything not
  verified by CI stays off `main`.

### Results

| Task                   | Status                        | Branch                         |
| ---------------------- | ----------------------------- | ------------------------------ |
| A3: Today page         | Done                          | `main` (via `auto/2026-11-22`) |
| B1: Email and password | Done                          | `main` (via `auto/2026-11-22`) |
| B2 onwards             | Not started (two items a day) |                                |

What A3 added:

- `/dashboard` is now **Today**, laid out like the approved mockup: date
  line, "Good morning." (by the hour in London; no first name until
  profiles arrive in B2), and one sentence on how many things need the
  user. Four figures: **Rent received, November** (£ of £, bar, "75% in ·
  £1,285 still to come"), **Late rent** (red when above zero, "1 tenant ·
  14 days overdue"), **Left after owners** (green, red below zero, "£400
  owed to owners for 1 home"), **Rooms let** (one dash per room or whole
  home, a bar above 24). **Needs you**: late rent (longest late first,
  "Record payment" opens that month's rent) and rooms or whole homes empty
  for 2+ weeks ("Add tenant" opens the add-tenant step for that room), up
  to 5 with "and N more". **Your homes**: 4 photo cards with the status
  chip. **Rent this month**: All / Late / Still due / Paid tabs as links
  (`?rent=late`, opening at the table), a table on desktop and cards on
  phones and tablets, 10 rows then "See all rent", and **Mark as paid**
  (the existing server action) with an Undo toast. **Recent activity**:
  the last 6 `audit_log` rows in plain words with amounts and home names
  only, never people ("Payment of £580 recorded at Sample House 01",
  "Today, 09:12", "3 days ago"). A new account sees **Add your first
  property** with three steps instead of empty figures.
- Pure helpers in `src/lib/today.ts` (21 unit tests); the money sums stay
  in `buildDashboard`, so Today, the rent page and the late rent email
  agree. Queries: membership, then homes, charges and activity together,
  then one photos query and one signing call. A constant six, never per
  home (was three).

What B1 added:

- `/sign-in` is email and password, with **Forgot your password?** and
  **Email me a sign-in code instead** (`/sign-in/code`, the old flow,
  unchanged). `/sign-up` creates an account (at least 8 characters, at most
  72; no symbol rules) and goes to Today, or to "Confirm your email" when
  the project asks for confirmation. `/reset-password` emails a link and
  always shows the same "Check your email" page; the link signs the person
  in for `/reset-password/new` (two boxes, must match).
- Four new server actions (`signInWithPassword`, `signUpWithPassword`,
  `requestPasswordReset`, `setNewPassword`), each validated with a shared
  Zod schema and rate limited by IP and by account; errors are plain and
  appear under the box they are about. The guard test lists them.
- `/auth/confirm` now also takes `type=signup|recovery` token links and
  PKCE `code` links (Supabase's default templates), and still redirects
  only to fixed pages. The proxy lets signed-out people open `/sign-up` and
  `/reset-password`, and sends signed-in people from sign-in or sign-up to
  Today.
- Removed `src/server/test-login.ts`, the test password form and
  `ENABLE_TEST_LOGIN`. The demo account signs in on the normal page; the
  seed script reads `DEMO_EMAIL` / `DEMO_PASSWORD` (old names still work).
  New `supabase/templates/reset-password.html`; `config.toml` sets the
  minimum password length to 8 and the reset template. README and
  `.env.example` updated.

Checks (`pnpm install` cannot run here; every check ran in GitHub Actions
on `auto/2026-11-22`: run 55 after A3, run 56 after B1, both passed the
first time):

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

Local stand-ins before pushing: `today.test.ts`, `dashboard.test.ts`,
`rent.test.ts`, `validation/auth.test.ts` and the server-action guard test
ran under Node's type stripping with a small Vitest shim (all passed);
TypeScript 7 on the pure modules; Prettier 3.8 and Tailwind 4.3.3's class
order on every changed file; every new page rendered with React's server
renderer through esbuild.

**Screenshots:** the Today page was rendered with fixture data, styled with
the real `globals.css` compiled by Tailwind 4.3.3, and photographed in
Chromium at 375, 768 and 1440px: no sideways scroll at any width, layout
matches the mockup (stat cards one per row on phones, two-up from 420px,
four-up on desktop; Needs you and Your homes side by side from 1280px).
Icons and the Geist font were stand-ins, so those images are not kept.
The real screenshots come from `e2e/today.spec.ts` (saved to
`test-results/screens/today-*.png`) when it runs locally.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `service_role`, JWT-shaped strings, API keys and private keys; hits are
  only the README variable table and e2e skip messages). No new
  `NEXT_PUBLIC_` variable; `NEXT_PUBLIC_APP_URL` (already public) builds the
  email link address. No service-role client near the new code.
- Today adds no server action: "Mark as paid" and Undo call the existing
  rent actions (session, organisation from memberships, Zod, rate limit,
  audit). Reads use the user's own client (RLS) and filter by the
  organisation from memberships. The rent filter is checked against a
  fixed list. Activity text never includes names or contact details.
- The four new auth actions run before a session exists (like the code
  actions): Zod plus rate limits by IP and account; `setNewPassword` needs
  the session from the reset link. Sign-up and reset never reveal whether
  an email has an account. `/auth/confirm` stays rate limited and only
  redirects to fixed paths (no `next` URL is followed, only `next=reset`).
  Auth errors are logged as codes only, never the email.
- No raw SQL, no `dangerouslySetInnerHTML`, no internals in error text. No
  migration, so no new table or policy. Nothing weakened; a test-only
  password path was removed.

Pending migrations: none new today. Still waiting: the four from 16 to 19
November (`docs/PENDING_MIGRATIONS.md`).

Decisions made without asking:

- **Needs you** includes rooms and whole homes empty for 2+ weeks now (the
  data exists: the last move-out date, or the date the room or home was
  added). D5 adds tenancies ending soon and urgent repairs.
- No first name in the greeting until profiles exist (B2): "Good morning."
- No "Demo data" pill: nothing marks an organisation as demo yet.
- "Rooms let" counts each room once and each home let as a whole once.
- "Left after owners" shows the number of homes with owner rent, not
  owners (owner records arrive in C1).
- Passwords: at least 8 characters, at most 72, no symbol or capital
  rules (NCSC-style advice); the Supabase minimum should match.
- After sign-up without email confirmation the person goes straight to
  Today; with confirmation on, to "Confirm your email".
- No new dependencies.

Needs a human:

- **Supabase (hosted project) for B1:** paste
  `supabase/templates/reset-password.html` into **Reset Password**; add
  `<app URL>/auth/confirm` to **Redirect URLs**; set the minimum password
  length to 8. Until the template is pasted, reset links still work but
  only in the same browser (Supabase's default PKCE link).
- **Remove `ENABLE_TEST_LOGIN` (and `TEST_LOGIN_*`) from Vercel**; the
  variable does nothing now. The demo account signs in on the normal page
  with its password.
- **Run `pnpm test:e2e` and `pnpm test:rls` locally.** New specs
  `e2e/today.spec.ts` and `e2e/auth.spec.ts`; `e2e/rent.spec.ts` now
  checks the Today figures. Look at `test-results/screens/today-*.png`.
- **Try by hand:** sign up with a new email, sign out, reset the password
  from a real email, and sign in with the code.
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`**
  (eighth day).
- **Apply the four pending migrations** (review them first).
- **Delete** the probe branches `auto/2026-11-18-format-probe` and
  `auto/2026-11-21-format-probe` and the merged `auto/*` branches.
- From earlier days (unchanged): legal check on "remove personal details";
  "Remove photo" hard-deletes instead of archiving; Resend and
  `CRON_SECRET` settings for the late rent email; Dependabot pull
  requests are open.

## 2026-11-23

### Start of run

- Docs read: `ROADMAP.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`,
  `DECISIONS.md`, `PENDING_MIGRATIONS.md`, README, AGENTS.md and the last
  days of this log.
- Latest CI run on `main` (run 58, commit `b3a9e29`, yesterday's log):
  passed. No open "Daily build blocked" issue; the `auto/*` branches are
  from earlier days and already merged. No `next` branch existed.
- The run has no `add_repo` tool; the repository was already cloned in the
  session with push access, so that was used.
- **Environment problem, ninth day:** `pnpm install --frozen-lockfile`
  fails (`registry.npmjs.org` does not resolve; the egress proxy answers
  403, a policy denial, not retried). So `node_modules` and the Next.js
  guides in `node_modules/next/dist/docs/` are not readable here; every
  Step 5 check ran in GitHub Actions on the `next` pull request. New
  today: **PostgreSQL 16 is in the image**, so the migrations were applied
  to a local database (with a small stand-in for Supabase's `auth`
  schema and roles) and the new policies and function were tried there
  as `authenticated` and `anon`.

### Plan

Today: **B2 (L), Organisation setup and profiles**, the only item (large).
No decision blocks it.

- Scope: migration for `organisations.account_type` and `contact_email`,
  a `profiles` table, a sign-up trigger that makes a profile only, and a
  server-side way to set up an organisation; a `/setup` screen that every
  app page sends a new account to; names and account types in the shell,
  Today's greeting and Settings.
- Files: `supabase/migrations/20261123030000_organisation_setup_and_profiles.sql`,
  `src/lib/supabase/database.types.ts`, `src/lib/validation/organisation.ts`,
  `src/server/organisation.ts`, `src/app/(setup)/*`,
  `src/components/setup/organisation-setup-form.tsx`,
  `src/app/(app)/layout.tsx`, `src/server/shell.ts`, Today and Settings
  pages, the guard test, RLS tests, e2e helper and specs, seed script,
  README.
- Migration: yes, so it goes to **`next`** (created from `main` today)
  with pull request #10, "PropDesk next: apply migrations, then merge".
- Tests: Zod schema tests, `firstNameOf` and greeting tests, the guard test
  now covers the setup action, RLS tests for profiles and set-up (two
  organisations plus a third person who joins one as staff), e2e set-up
  flow at 375, 768 and 1440px.
- Risks: between applying the migration and merging `next`, a brand new
  sign-up on the old code would have no organisation (existing accounts
  are fine), so the PR says to merge straight after applying. Every e2e
  and RLS test user now needs an organisation set up first.

### Result

| Task                                    | Status                           | Branch          |
| --------------------------------------- | -------------------------------- | --------------- |
| B2 (L): Organisation setup and profiles | Done (waiting for its migration) | `next` (PR #10) |

What B2 added:

- **Database** (`20261123030000_organisation_setup_and_profiles.sql`):
  `organisations.account_type` (landlord / property_manager, not null;
  existing organisations become property_manager, D-5) and
  `contact_email` (checked shape; empty for existing organisations).
  `profiles` (id = the user, full name) with RLS: you see your own profile
  and those of people you share an organisation with, add or change only
  your own name (column grants: never id or timestamps), and nobody
  deletes one. Every existing user got a profile. The sign-up trigger now
  only makes the profile (name from `full_name` metadata if given).
  `public.create_organisation(org_name, org_account_type,
org_contact_email, creator_full_name)`: SECURITY DEFINER, works out the
  caller from the session, checks every value, takes a per-user lock,
  refuses a second organisation (`PD001`), then makes the organisation,
  the owner membership, saves the name and writes `audit_log`
  (`organisation.created`, account type only) in one transaction. Execute
  is revoked from `anon` and `public`. Still no insert grant or policy on
  `organisations`.
- **`/setup`** ("Set up your organisation"): your full name, organisation
  name, Landlord or Property manager (radio cards), contact email (starts
  as the sign-in email). React Hook Form + the shared Zod schema; errors
  under each field; "Not you? Sign out". The `(app)` layout and Today send
  anyone without an organisation here; `/setup` sends people who have one
  to Today.
- **Shell, Today, Settings:** the sidebar shows the stored account type and
  the person's name (email until they give one); Today says "Good morning,
  Taylor."; Settings has an **Organisation** card (name, kind of account,
  contact email, read-only for now). Recent activity shows "Organisation
  set up".
- `getOrganisationId` now says "Please finish setting up your organisation
  first." when there is none. Seed script makes "Taylor Example", owner of
  "Demo Lettings", directly with the service role (test setup only).

Checks (GitHub Actions on pull request #10, run 59, commit `a7223bd`;
passed the first time):

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

Local stand-ins before pushing: every migration applied in order to a
local PostgreSQL 16, both on an empty database and on one with an
organisation made by the old trigger (it became property_manager and its
user got a profile). As `authenticated` and `anon` there: set-up refused
signed out, refused each bad value, worked once and refused a second time;
direct insert into `organisations` refused; profiles visible only to
yourself and colleagues; another person's name, the id, timestamps and
deletes all refused; check constraints held. The new schema, people,
today and guard tests ran under Node's type stripping with a small Vitest
shim (Zod 4 from the image); Prettier 3.8 on every changed file.

Security review of today's diff:

- No secrets, keys, tokens or `.env` files (searched for `sb_secret_`,
  `service_role`, JWT-shaped strings, API keys and private keys; hits are
  only grants to the `service_role` role in SQL and the e2e skip message).
  No new `NEXT_PUBLIC_` variable; the e2e helper reads the existing
  publishable key to sign the test user in. No service-role client in app
  code; the seed script and test setup use it as before.
- The new action `setUpOrganisationAction`: Zod (`organisationSetupSchema`,
  extra ids dropped), `runAction` (session, rate limit `setup-write`, the
  user's own client). There is no organisation to derive yet, so the
  database function derives everything from `auth.uid()`; it refuses a
  second organisation and writes `audit_log` itself. The guard test now
  includes `app/(setup)/` and allows this one function only if it calls
  `create_organisation` (reviewed list, with the reason).
- RLS enabled on `profiles` with explicit select / insert / update policies
  (same for every role: a profile belongs to a person); no delete. Every
  existing policy and grant unchanged. No raw SQL from input (the RPC takes
  parameters), no `dangerouslySetInnerHTML`, error text is fixed plain
  words. The audit row holds the account type only, never names or emails.

Pending migrations: one new, on `next` only
(`20261123030000_organisation_setup_and_profiles.sql`). The four from 16 to
19 November are still waiting too.

Decisions made without asking:

- **D-17 (new, provisional):** one organisation per person at set-up;
  more come by invitation (B4) and the switcher (B5).
- Existing organisations get no contact email (not copied from the owner's
  sign-in email); Settings says "Not added yet".
- The full name is asked on `/setup`, not on the sign-up form, so people
  who sign in with a code are asked too.
- `account_type` defaults to property_manager in the database (D-5) but
  `/setup` makes people choose.
- Profiles are visible to everyone in a shared organisation (needed for
  Members in B4). Organisation details are read-only in Settings until a
  later item adds editing.
- No new dependencies.

Needs a human:

- **Apply the migrations, then merge pull request #10 straight away.**
  Apply the four older ones first if not done (`pnpm db:push` applies them
  in order). After the B2 migration and before the merge, new sign-ups
  would have no organisation.
- **Run `pnpm test:rls` and `pnpm test:e2e` locally** after applying. New
  spec `e2e/setup.spec.ts` (screenshots `test-results/screens/setup-*.png`);
  all test users now get an organisation through `create_organisation`.
- **Re-run `pnpm seed:demo`** after applying (the demo account is now
  "Taylor Example").
- **Try by hand:** sign up with a new email, land on "Set up your
  organisation", leave everything empty and press the button, then fill it
  in.
- **Allow the daily run's cloud environment to reach `registry.npmjs.org`**
  (ninth day).
- From earlier days (unchanged): Supabase reset template and redirect URL;
  remove `ENABLE_TEST_LOGIN` from Vercel; delete the merged `auto/*` and
  probe branches; legal check on "remove personal details"; "Remove photo"
  hard-deletes; Resend and `CRON_SECRET`; Dependabot pull requests.

Review follow-up (automated reviewers on pull request #10, same run):

- Fixed on `next`: the database contact-email check now needs a dot after
  the `@` (like the form); the profile backfill runs after the sign-up
  trigger changes; a failed profile read gives no name instead of failing
  Today or `/setup`; the e2e helper deletes a half-made test user if set-up
  fails. Re-checked on the local PostgreSQL and in CI.
- Not changed, for later items: owners can still add a membership for any
  user id directly (existing policy since the first schema; now that would
  also show that person's name), to be closed by invitations in **B4**;
  the active organisation is "first membership" (ties by time could differ
  between queries) until the switcher in **B5**; people whose accounts
  existed before B2 have no way to add their name yet (a profile section in
  Settings would fit with **B4**). New sign-ups must not hit the old code
  after the migration: merge straight after applying (in the PR steps).
