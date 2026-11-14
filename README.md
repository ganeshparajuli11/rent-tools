# RentDesk

Simple property and rent management for small UK landlords and rent-to-rent
operators. Add properties, rooms and tenancies, mark rent as paid or late, and
see what has come in, what is owed to owners, and who is overdue.

Mobile first, plain words, very simple screens. Multi-tenant: each landlord's
data is isolated by `organisation_id` with Postgres row-level security (RLS) in
Supabase.

> Status: project setup only. No features are built yet.

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
│   │   ├── (app)/            Logged-in area: /dashboard (needs a session)
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
│   │   └── env.ts            Secret env validation
│   └── proxy.ts              Refreshes the Supabase session on each request
├── next.config.ts            Security headers, env check
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

## Data model and security

- Every business table has `organisation_id`. A user sees a row only if they
  are a member of that organisation (Postgres RLS, see
  `supabase/migrations/*_initial_schema.sql`).
- Members can read, add and change rows. Only owners can delete rows and
  manage memberships. The audit log can be read and added to, never changed.
- Signing up creates an organisation ("My organisation") with the new user as
  its owner. An organisation always keeps at least one owner.
- Money is stored as whole pence (`integer`), never as decimals.
- The service role key bypasses RLS. It is only used in `src/server/` and in
  the RLS test setup.

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
