# Roadmap: the PropDesk task book

The daily build run works through this list **in order**. Each run takes the
next two unchecked items, or one item marked **(L)** (large). An item is ticked
only when it is fully done, every check has passed, and it is on `main` or
waiting in the `next` branch as described below.

Read first: [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) (what), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)
(how it looks), [`DECISIONS.md`](DECISIONS.md) (open questions and provisional
answers). An item marked _(waits for D-n)_ is skipped while that decision is
open and blocking; take the next item instead and say so in the log.

**Where work goes.** Work that needs no new database migration goes to `main`
(it deploys straight to the live test site). Work that needs a new migration
goes to the long-lived branch **`next`**, kept rebased on `main`, with one open
pull request titled "PropDesk next: apply migrations, then merge". Later items
that build on unmerged `next` work continue on `next`. The product owner applies
the migrations, then merges. Never push code to `main` that fails before its
migration is applied.

## Done (RentDesk, before the PropDesk brief)

- [x] Schema with row-level security; passwordless sign-in
- [x] Homes and rooms
- [x] Continuous integration and Dependabot
- [x] Desktop pass (sidebar, tables, focus rings)
- [x] Tenants (add in steps, move out with Undo)
- [x] Rent ledger (charges, payments, daily cron)
- [x] Dashboard (first version)
- [x] Overdue rent email (optional, Resend)
- [x] Security hardening (CSP, action checks, header tests)
- [x] Data rights (CSV export, remove a past tenant's details)
- [x] Home photos, PropDesk landing page and rename (done by hand on 19/11)

## Phase A: design system and app shell

- [x] **A1 (L): Design tokens and app shell.** Implement `DESIGN_SYSTEM.md` §1
      and §2: tokens in `globals.css`, Geist via `next/font`, the grouped
      sidebar (with links to pages that do not exist yet hidden, not broken),
      top bar with the search box (opens a ⌘K dialog that searches homes and
      tenants for now) and the **+ New** menu (only items that work), phone
      bottom bar with More, organisation and person blocks. Add a shared
      `formatDateUK` (DD/MM/YYYY) helper with tests and use it in tables.
- [ ] **A2 (L): Page templates.** Build `src/components/app/` templates from
      §3 and the components in §4 (stat card, section card, status pill, filter
      tabs, data table, record header, tabs, activity timeline, empty state,
      photo card, side sheet). Move the Homes list and home page, Tenants and
      Rent pages onto them without changing behaviour. Playwright screenshots
      at 375, 768 and 1440px in the log.
- [ ] **A3: Today page.** Rebuild `/dashboard` as **Today** to match
      `docs/design/today-dashboard.dc.html` with the data that exists now
      (rent, late rent, owners' rent, rooms let, homes with photos, activity).
      Repairs and tenancy-ending cards appear once those features exist. First-run
      empty state. Keep the three-query budget or better; tests for the sums.

## Phase B: accounts and multiple users

- [ ] **B1: Email and password.** Sign up, sign in and password reset with
      Supabase Auth (D-12), keeping "Email me a sign-in code" as a second
      option. Rate limits, plain errors, e2e tests. Then remove the test-only
      password box (`src/server/test-login.ts`, `ENABLE_TEST_LOGIN`) and update
      `scripts/seed-demo.mjs` and the README. No migration.
- [ ] **B2 (L): Organisation setup and profiles.** Migration: `organisations.account_type`
      (landlord / property_manager), `contact_email`; `profiles` (full name);
      change the sign-up trigger so a new user gets a profile but creates the
      organisation through an onboarding screen (name, account type, contact
      email) handled server-side. Existing organisations get account type
      "property_manager" (D-5). → `next`.
- [ ] **B3 (L): Roles.** Migration: membership roles owner / admin / manager /
      staff and `status`; RLS helper functions by role level; policies per
      `PRODUCT_SPEC.md` §5 (staff cannot export, manage members or change
      settings; only owner and admin manage members; nobody but the owner
      changes the owner). Server-side `requireRole`. RLS tests for every role
      in two organisations. → `next`.
- [ ] **B4 (L): Members and invites.** Settings › Members: list, change role,
      remove (with confirm), invite by email (an `invitations` table with a
      single-use token and expiry; the email is Supabase Auth's invite or
      magic link, sent from server code; accepting adds the membership).
      Ownership transfer as a deliberate two-step confirm. → `next`.
- [ ] **B5: Organisation switcher.** People in several organisations pick
      the active one (stored in a cookie, always re-checked against
      memberships on the server). Replace "first membership" in
      `getOrganisationId`.

## Phase C: core CRM records

- [ ] **C1 (L): Owners as records.** Migration: `property_owners`
      (individual / company, name, company name, email, phone, address,
      notes, archived) and `property_owner_links` (D-2); copy existing owner
      names from `owner_leases` into owner records and link them;
      `owner_leases` gains `owner_id` (keeps the rent paid to the owner).
      Owners list and record page (linked homes, rent you pay them); link and
      unlink owners on the home page. → `next`.
- [ ] **C2 (L): Tenants as records.** Migration: `tenants` (full name, email,
      phone, address, notes, archived) and `tenancy_tenants` (D-1, lead
      tenant flag); copy tenant details from `tenancies` into records and
      link them; keep old columns until a later clean-up migration. Tenants
      list (people) and record page with tenancy history; the add-tenant
      steps pick an existing tenant or create one. Keep "remove personal
      details" working on the new tables. → `next`.
- [ ] **C3: Tenancies page and property details.** Tenancies list (Current /
      Upcoming / Ended, filters by home) and tenancy record page; property
      fields bedrooms, bathrooms, country (default United Kingdom),
      management status, notes on the home form and page. → `next` if a
      migration is needed.

## Phase D: operations

- [ ] **D1: Contractors.** Migration: `contractors` (company, contact name,
      email, phone, service type, notes, archived). List, record page (jobs),
      add and edit, archive. → `next`.
- [ ] **D2 (L): Repairs (maintenance).** Migration: `maintenance_requests`
      per `PRODUCT_SPEC.md` §6 (statuses, priority, reported, due and
      resolved dates, resolution notes, optional tenancy and contractor).
      Repairs list with status and priority filters, record page with a
      status stepper and history, "Report a repair" from a home or tenancy,
      assign a contractor. No hard delete. Add the repair cards to Today and
      the Repairs tab on homes and tenancies. → `next`.
- [ ] **D3: Search.** ⌘K search across homes, owners, tenants, contractors and
      repairs (organisation-scoped, rate limited, indexed with `pg_trgm` or
      `ilike` on indexed columns); search and filters on every list.
- [ ] **D4: Reports.** Reports page: rent summary for a date range (expected,
      received, outstanding, by home and by owner) and repairs summary (open,
      resolved, by status and contractor); CSV export of each, owner and admin
      only.
- [ ] **D5: Today, complete.** Tenancies ending within 60 days, rooms empty for
      2+ weeks and urgent repairs in **Needs you**; notifications bell lists
      the same items.

## Phase E: hardening and quality

- [ ] **E1:** Empty states, first-steps guidance, plain help text, friendly
      error and not-found pages on every screen.
- [ ] **E2:** Accessibility pass to WCAG 2.2 AA with automated axe checks in
      Playwright at phone and desktop widths.
- [ ] **E3:** Access-control test matrix: every table × every role × two
      organisations (read, insert, update, delete), plus server-action tests
      for role limits. Written security report in `docs/SECURITY.md`.
- [ ] **E4:** Performance pass: N+1 queries, indexes on foreign keys and
      filters, pagination everywhere, bundle size.
- [ ] **E5:** Privacy notice and terms pages, clearly marked as drafts for
      legal review.
- [ ] **E6:** Documentation: README, `docs/ARCHITECTURE.md`, schema and
      migration guide, environment variables, backup and export notes,
      deployment guide; fill unit-test gaps.

## Phase F: pilot readiness (human checkpoints)

- [ ] **F1:** Demo organisation: update `scripts/seed-demo.mjs` to the new
      model (owners, tenants, contractors, repairs, two roles) with fictional
      data only, plus `docs/PILOT_WALKTHROUGH.md` and a feedback log template.
- [ ] **F2:** Hosting note _(waits for D-13)_: compare Vercel Pro and
      Cloudflare Workers (OpenNext) from current official docs and pricing in
      `docs/HOSTING.md`. Research and document only; no migration, no paid
      plan.

When every item is ticked: maintenance only (patch-level dependency updates,
flaky test fixes, small refactors with tests). No new features without a new
roadmap item from the product owner.
