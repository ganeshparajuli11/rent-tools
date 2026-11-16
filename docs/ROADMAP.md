# Roadmap

The daily build run takes the next two unchecked items, in order. An item is
ticked only when it is fully done and every check has passed.

## Already complete (original project)

- [x] Schema with row-level security, and passwordless sign-in
- [x] Homes and rooms screens

## Backlog

- [x] **Item 1: Continuous integration.** GitHub Actions workflow on push and pull request (install, typecheck, lint, format check, unit tests, production build with `SKIP_ENV_VALIDATION=1`, `pnpm audit` at high severity), plus Dependabot for npm and GitHub Actions. Actions pinned to major versions, read-only workflow permissions.
- [x] **Item 2: Desktop pass on existing screens.** Persistent labelled sidebar over 1024px, centred content container, lists as sortable tables on desktop and cards on phones, fixed-width form columns, visible focus rings, full keyboard support.
- [x] **Item 3: Tenants.** Add a tenant from a home or room in short steps (name and contact; monthly rent in pounds, due day 1-28, move-in date; optional deposit). One current tenant per room or whole home. Tenant detail and edit; a rent change affects future months only. "Tenant moved out" sets `end_date` and frees the room, with Undo. Home detail shows each room's tenant or "Empty".
- [ ] **Item 4: Rent ledger.** `rent_charges` rows created when a tenant is added (move-in month to current month) and by a daily idempotent cron route protected by a secret header (the only place the service-role client may be used, in server-only code). Status is calculated, never stored: Paid, Part paid, Due, Late. A `/rent` page by month, late tenants first, with one-tap "Mark as paid" plus Undo, an "Other amount" form for part payments, several payments per month, and payment removal with Undo. All date logic in Europe/London, in tested helpers.
- [ ] **Item 5: Dashboard.** This month's rent expected and received, rent owed to owners, margin per home, overdue tenants, and empty rooms. Load with as few queries as possible.
- [ ] **Item 6: Overdue reminders.** A daily email digest to the landlord through Resend listing late rent, with a settings switch to turn it off. Must skip safely when `RESEND_API_KEY` is absent.
- [ ] **Item 7: Security hardening.** A content security policy, a check that every server action uses the rate limiter, session and organisation checks, Zod validation and an `audit_log` write, plus tests for security headers.
- [ ] **Item 8: Data rights.** CSV export of homes, tenants and payments, and a way to delete a tenant's personal data.
- [ ] **Item 9.** Onboarding and empty states, plain-language help text, and friendly error and not-found pages.
- [ ] **Item 10: Accessibility pass to WCAG 2.2 AA.** Labels, focus order, contrast, keyboard use, and automated axe checks in the Playwright suite.
- [ ] **Item 11: Performance and scale pass.** Review every query for N+1 problems, add missing indexes in a new migration, confirm pagination on every list, and check bundle size.
- [ ] **Item 12: Staff invites.** An owner invites a staff member by email; enforce the owner and staff roles on the server and in RLS.
- [ ] **Item 13.** Privacy policy and terms pages, clearly marked as drafts that need legal review.
- [ ] **Item 14: Test coverage and documentation.** Fill gaps in unit tests, and bring README and docs up to date.

When every item is ticked: maintenance only (patch-level dependency updates,
flaky test fixes, small refactors with tests). No new features.
