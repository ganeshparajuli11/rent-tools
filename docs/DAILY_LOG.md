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

Security review of today's diff: only YAML and Markdown changed
(`.github/`, `docs/`, `README.md`). No secrets, keys, tokens or `.env` files;
no `NEXT_PUBLIC_` variables; no new server actions, route handlers, SQL or
migrations. The workflow uses no secrets, has `contents: read` only, and
checks out without persisting credentials. Nothing existing was weakened.

Pending migrations: none new.

Decisions made without asking:

- Ran the Step 5 checks in GitHub Actions instead of locally, because that was
  the only place they could run. Work went to `auto/2026-11-15` first; `main`
  was only moved forward to a commit that had already passed every check, and
  the branch was then removed.
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
