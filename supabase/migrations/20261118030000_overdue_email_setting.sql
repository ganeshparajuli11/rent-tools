-- A switch for the daily "late rent" email, one per organisation.
--
-- The daily job (/api/cron/overdue-reminders) emails an organisation's
-- owners a list of late rent, but only when this is true. Owners turn it off
-- or on from the Settings page. It starts on, as the feature is meant to be
-- used; nothing is sent until RESEND_API_KEY and EMAIL_FROM are set.
--
-- This adds no table and changes no RLS policy or grant: the existing
-- organisations policies already let members read their own organisation
-- and only owners update it, and that covers the new column.
--
-- Before this is applied the app still works: the Settings page says the
-- switch is not ready yet, and the daily job sends nothing at all (it cannot
-- tell who has turned the email off, so it does not guess).

alter table public.organisations
  add column overdue_email_enabled boolean not null default true;

comment on column public.organisations.overdue_email_enabled is
  'When true, the owners get a daily email listing late rent. Changed on the Settings page.';
