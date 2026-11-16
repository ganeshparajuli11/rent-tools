# Pending migrations

Migrations written by the daily build run that have **not** been applied to
any database. The run never applies migrations itself. Review each file, apply
it (`pnpm db:push`), then delete its line from this list.

| File                                                                  | Added      | What it does                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261116030000_one_current_tenant_per_place.sql` | 2026-11-16 | Unique indexes so a room, or a home let as a whole, can have only one current tenant, plus an index for current-tenant lookups. No new tables, columns or policies, so `database.types.ts` does not change. The app works before it is applied too. |
