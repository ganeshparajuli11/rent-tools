# PropDesk product specification

The product owner's brief ("PropDesk Product Requirements & Build Proposal",
18 November 2026), condensed for the daily build run, with the decisions taken
since. **This file is the source of truth for what to build.** Where it and older
code disagree, this file wins; where it is silent, follow existing patterns.

Companion files:

- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md): how every screen looks and behaves.
- [`DECISIONS.md`](DECISIONS.md): open questions and the provisional answers to
  build with until the product owner confirms them.
- [`ROADMAP.md`](ROADMAP.md): the task book, in order.

## 1. What PropDesk is

A web-based property-management CRM for independent landlords and small
property-management businesses (including rent-to-rent operators). It brings
properties, owners, tenants, tenancies, rent, maintenance and contractors into
one organised workspace. It will be sold as a multi-tenant subscription
(software owned by the product owner, licensed to customers). The first pilot
customer is a small rent-to-rent operation.

MVP success: a user can sign up, create an organisation, add a property and an
owner, add a tenant and a tenancy, record rent manually, log a maintenance
request, assign a contractor and see accurate dashboard figures, and a second
test organisation cannot see any of it.

## 2. Principles and boundaries

- Property-management specialist. Not a generic CRM.
- Manual-first: users record and confirm rent. No bank feeds, no payment
  collection, never mark rent paid from an external event.
- Clear records: show dates, amounts, statuses and history; archive, never lose
  history.
- Multi-tenant from day one: every organisation-owned row has
  `organisation_id` and RLS; access derives from active memberships.
- Privacy by design: collect only what a workflow needs. No ID documents, bank
  details, card data or health information.
- Fictional data only in development, tests, seeds and demos ("Sample House
  01", "Taylor Example", "Demo Plumbing Ltd"; made-up UK-style addresses).
- Never claim legal, accounting or regulatory compliance.

## 3. Customers

| Segment                        | Need                                     | Approach                             |
| ------------------------------ | ---------------------------------------- | ------------------------------------ |
| Independent landlord           | Own small portfolio, out of spreadsheets | Properties, tenants, tenancies, rent |
| Independent property manager   | Homes managed for several owners         | Owner records linked to properties   |
| Small property management firm | A small team and contractors             | Membership roles, shared records     |

## 4. Modules (MVP)

| Module                                  | First version                                                                                    | Priority |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| Authentication                          | Sign up, sign in (email + password, plus email code), sign out, password reset, protected routes | Must     |
| Organisation setup                      | Create organisation, account type (landlord / property manager), contact email                   | Must     |
| Members and roles                       | Owner, admin, manager, staff; invite and manage members                                          | Must     |
| Dashboard ("Today")                     | What needs attention first, then figures (see design system)                                     | Must     |
| Properties                              | Create, view, edit, archive; address, type, bedrooms, bathrooms, status, notes, rooms, photos    | Must     |
| Owners                                  | Owner records (person or company), linked to one or more properties                              | Must     |
| Tenants                                 | Tenant records (people), reusable across tenancies; archive                                      | Must     |
| Tenancies                               | Property (and room) + tenant(s); dates, rent, due day, deposit, status; history kept             | Must     |
| Rent                                    | Monthly charges, full and part payments, outstanding balance, history                            | Must     |
| Maintenance                             | Issue, priority, status, dates, property, optional tenancy and contractor, resolution notes      | Must     |
| Contractors                             | Directory with service type, linked to jobs                                                      | Must     |
| Search and filters                      | Search properties, owners, tenants, contractors; filters on every list                           | Must     |
| Reports                                 | Date-range rent and maintenance summaries; CSV export                                            | Should   |
| Audit trail                             | Important changes recorded (already in `audit_log`)                                              | Should   |
| Billing, tenant portal, owner portal    | Not now                                                                                          | Later    |
| Bank feeds, legal/compliance automation | Never in MVP                                                                                     | Out      |

## 5. Roles

| Role    | Can                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------ |
| Owner   | Everything, including settings, members and data export; transfer ownership only by a confirmed flow   |
| Admin   | Run all records and manage members, but cannot remove or demote the owner                              |
| Manager | Manage properties, owners, tenants, tenancies, rent, maintenance and contractors                       |
| Staff   | Read records, and update operational ones (rent payments, maintenance); no settings, members or export |

Enforce roles in Postgres (RLS and helper functions) **and** on the server.
Never only by hiding buttons. No hidden super-admin, no service role in the
browser. The service-role client stays limited to cron routes and test setup.

## 6. Core workflows

1. **First-time setup:** sign up, create an organisation (name, account type,
   contact email), become its owner through a server-side process, land on an
   empty Today page that says what to do first.
2. **Property:** create with address and details; add or pick owner(s); show
   owners, rooms, current and past tenancies, rent, repairs and photos.
3. **Tenant and tenancy:** create or pick a tenant; create a tenancy for a whole
   home or a room; never overwrite a past tenancy; no two current tenancies for
   the same room or whole home.
4. **Rent:** monthly charges made automatically; record full or part payments
   with date and method; outstanding = expected − received (never shown below
   zero); status derived: Due, Part paid, Paid, Late (due date passed and
   something outstanding). A person always confirms receipt.
5. **Maintenance:** log title, description, property, reported date, priority;
   optionally link the tenancy and a contractor; statuses New → Assigned → In
   progress → (Awaiting parts or access) → Resolved, or Cancelled; resolution
   date and notes; jobs are never deleted.

## 7. Data model direction

Existing tables stay and evolve by migration; do not rebuild from scratch.

| Concept      | Current                       | Target                                                                                                                                  |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Organisation | `organisations` (name)        | + `account_type`, `contact_email`                                                                                                       |
| Profile      | none                          | `profiles` (id = auth user, full_name)                                                                                                  |
| Membership   | `memberships` (owner/staff)   | roles owner/admin/manager/staff, `status` (active/invited/removed), invitations                                                         |
| Property     | `properties`, `rooms`, photos | + bedrooms, bathrooms, country, management status                                                                                       |
| Owner        | name typed on `owner_leases`  | `property_owners` (person/company) + `property_owner_links`; `owner_leases` keeps the rent paid to an owner, linked to the owner record |
| Tenant       | fields on `tenancies`         | `tenants` + `tenancy_tenants` (lead tenant first; joint tenants later)                                                                  |
| Rent         | `rent_charges` + `payments`   | keep: this is the ledger-plus-transactions model the brief prefers                                                                      |
| Contractor   | none                          | `contractors`                                                                                                                           |
| Maintenance  | none                          | `maintenance_requests` (+ status history from `audit_log`)                                                                              |
| Audit        | `audit_log`                   | keep; never log names, contact details or secrets                                                                                       |

Money stays **integer pence** (the brief allows any non-float exact type; pence
is already tested end to end). Dates are `date`, timestamps `timestamptz`.

Modelling rule: the organisation (the customer) and a property owner (a real
person or company) are separate things, even when a landlord is both.

## 8. Pages

Today, Properties (+ detail), Owners (+ detail), Tenants (+ detail), Tenancies,
Rent, Repairs (maintenance, + detail), Contractors, Reports, Settings
(organisation, members, data). Sign in / sign up / reset password, and
organisation setup. The public landing page at `/` is marketing and has its own
look; everything after sign-in follows `DESIGN_SYSTEM.md`.

## 9. Technical

- Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Supabase (Auth,
  Postgres, Storage), RLS on every organisation-owned table, migrations in the
  repository only.
- Hosting: currently Vercel. The brief prefers Cloudflare Workers; moving is a
  product-owner decision (see `DECISIONS.md`). Do not write platform-specific
  code either way.
- Email: Supabase Auth emails for sign-in, reset and invites. The late rent
  email (Resend) stays optional and off unless configured.

## 10. Security and privacy

RLS with explicit SELECT/INSERT/UPDATE/DELETE policies per table; inserts
cannot spoof `organisation_id` or user ids; secrets server-side only; inputs
validated on server and database; rate limits; safe error messages; export and
delete within agreed retention. Test isolation with two organisations and every
role. This is not legal advice: live tenant data needs a data-processing
agreement and UK GDPR review first.

## 11. UX and accessibility

Desktop-first, responsive to tablet and phone. Plain English. Every form has
labels, validation, helpful errors and clear Save / Cancel. Loading, empty,
success and error states everywhere. Archive instead of delete; confirm any
action that cannot be undone. WCAG 2.2 AA. GBP throughout; dates as DD/MM/YYYY
in tables, forms and records. Today page puts tasks needing attention first.

## 12. Definition of done (acceptance tests)

- Sign up, sign in, sign out and reset password work.
- Creating an organisation makes the creator its owner, securely.
- Properties: create, edit, view, archive; link one or more owners.
- Tenants and tenancies created and linked; past tenancies kept.
- Rent: charges, part and full payments; balances correct.
- Maintenance: create, assign a contractor, resolve.
- Today figures match the records and exclude archived ones as documented.
- Organisation A cannot read, change, delete or infer Organisation B's records
  through the UI, the API or direct queries.
- Role limits are tested, not just hidden in navigation.
- All migrations apply to a clean Supabase project with no manual SQL.
- No secret in Git or in browser code.
- Builds and runs locally with documented steps.
