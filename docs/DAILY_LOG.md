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
