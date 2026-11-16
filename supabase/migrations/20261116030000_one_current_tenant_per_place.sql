-- One current tenant per room, and one per home let as a whole.
--
-- A tenancy is "current" while end_date is null. The app already checks this
-- before adding a tenant (src/server/tenants.ts); these indexes make the
-- database refuse a second current tenant even if two people save at the
-- same moment. They add no tables and change no RLS policy.
--
-- BEFORE APPLYING: this fails if existing rows already break the rule.
-- Check with:
--   select room_id, property_id, count(*) from public.tenancies
--   where end_date is null group by room_id, property_id having count(*) > 1;

-- A room has at most one current tenant.
create unique index tenancies_one_current_per_room_idx
  on public.tenancies (room_id)
  where end_date is null and room_id is not null;

-- A home let as a whole (room_id is null) has at most one current tenant.
create unique index tenancies_one_current_whole_home_idx
  on public.tenancies (property_id)
  where end_date is null and room_id is null;

-- Speeds up "who lives here now?" lookups for a home.
create index tenancies_current_by_property_idx
  on public.tenancies (property_id)
  where end_date is null;
