-- Payments can be removed and put back, without ever being deleted.
--
-- "Remove" on the rent page sets removed_at; "Undo" clears it. A removed
-- payment no longer counts towards the rent, but the row stays as a record.
-- This adds no table and changes no RLS policy: the existing payments
-- policies and grants cover the new column (members may update payments in
-- their own organisation; only owners may delete them, and the app never
-- deletes them).
--
-- The app works before this is applied: the rent page and dashboard load,
-- and rent can be marked as paid. Removing a payment (and Undo for "Mark as
-- paid") only works once it is applied.

alter table public.payments
  add column removed_at timestamptz;

comment on column public.payments.removed_at is
  'Set when the payment was removed in the app. Removed payments do not count towards the rent.';

-- The rent page reads one organisation''s charges for one month.
create index rent_charges_organisation_period_idx
  on public.rent_charges (organisation_id, period_start);
