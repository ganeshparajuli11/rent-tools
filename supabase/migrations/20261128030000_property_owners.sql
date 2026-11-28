-- Roadmap C1: owners as records.
--
-- 1. property_owners: the real people and companies who own the homes an
--    organisation lets or manages (PRODUCT_SPEC.md §7). An owner is an
--    organisation-wide record (D-7), separate from the organisation
--    itself, even when a landlord is both. Never deleted by the app:
--    archived instead.
-- 2. property_owner_links: which owners own which home. A home can have
--    several owners and an owner several homes (D-2; no percentages yet).
-- 3. owner_leases.owner_id: the rent an organisation pays an owner
--    (rent-to-rent) now points at the owner record. The old owner_name,
--    owner_phone and owner_email columns stay until a later clean-up item.
-- 4. Copies the owners typed on existing owner leases into owner records,
--    sets owner_leases.owner_id, and links the owner of every current
--    lease to its home. One record per organisation for each distinct
--    name + email + phone (compared without case and spaces), so two
--    different people are never merged into one record.
--
-- Row-level security, in this file: everyone in the organisation reads;
-- managers and above add, change, link and unlink; only owners can delete
-- an owner record (the app never does; it archives). Composite foreign
-- keys mean a link or a lease can never point at another organisation's
-- home or owner. Nothing here loosens an existing policy.
--
-- Apply after every earlier migration (including the pending
-- 20261123030000, 20261124030000 and 20261125030000: the policies use
-- private.has_org_role from 20261124030000). The app code that goes with
-- this is on the `next` branch.

-- ---------------------------------------------------------------------------
-- 1. Owner records
-- ---------------------------------------------------------------------------
create table public.property_owners (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  owner_type text not null default 'individual'
    check (owner_type in ('individual', 'company')),
  -- The person (individual) or the contact at the company (optional).
  full_name text
    check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  company_name text
    check (company_name is null or char_length(btrim(company_name)) between 1 and 200),
  email text check (email is null or char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) between 1 and 100),
  address_line1 text check (address_line1 is null or char_length(address_line1) <= 200),
  address_line2 text check (address_line2 is null or char_length(address_line2) <= 200),
  city text check (city is null or char_length(city) <= 100),
  postcode text check (postcode is null or char_length(postcode) <= 10),
  notes text check (notes is null or char_length(notes) <= 2000),
  -- The name shown in lists and used to sort them.
  display_name text generated always as (
    case when owner_type = 'company' then company_name else full_name end
  ) stored,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_owners_named check (
    (owner_type = 'individual' and full_name is not null)
    or (owner_type = 'company' and company_name is not null)
  ),
  -- Target for composite foreign keys from links and leases.
  unique (id, organisation_id)
);

comment on table public.property_owners is
  'Owners of homes (roadmap C1): a person or a company. Organisation-wide records linked to homes through property_owner_links. Archived, never deleted by the app.';

create trigger set_updated_at before update on public.property_owners
  for each row execute function private.set_updated_at();

-- Lists are by organisation, current first, sorted by name.
create index property_owners_organisation_name_idx
  on public.property_owners (organisation_id, display_name);

-- ---------------------------------------------------------------------------
-- 2. Links between homes and owners
-- ---------------------------------------------------------------------------
create table public.property_owner_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null,
  owner_id uuid not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (property_id, owner_id),
  foreign key (property_id, organisation_id)
    references public.properties (id, organisation_id) on delete cascade,
  foreign key (owner_id, organisation_id)
    references public.property_owners (id, organisation_id) on delete cascade
);

comment on table public.property_owner_links is
  'Which owners own which home (roadmap C1, D-2). Unlinking removes the row; audit_log keeps the history.';

create index property_owner_links_organisation_id_idx
  on public.property_owner_links (organisation_id);
create index property_owner_links_owner_id_idx
  on public.property_owner_links (owner_id);
create index property_owner_links_created_by_idx
  on public.property_owner_links (created_by);
-- (property_id, owner_id) is covered by the unique index.

-- ---------------------------------------------------------------------------
-- 3. Rent paid to an owner points at the owner record
-- ---------------------------------------------------------------------------
alter table public.owner_leases
  add column owner_id uuid,
  -- MATCH SIMPLE: only checked when owner_id is set. NO ACTION keeps the
  -- rent history: an owner with leases cannot be deleted.
  add constraint owner_leases_owner_id_organisation_id_fkey
    foreign key (owner_id, organisation_id)
    references public.property_owners (id, organisation_id) on delete no action;

comment on column public.owner_leases.owner_id is
  'The owner record this rent is paid to (roadmap C1). owner_name, owner_phone and owner_email are kept until a later clean-up.';

create index owner_leases_owner_id_idx on public.owner_leases (owner_id);

-- ---------------------------------------------------------------------------
-- 4. Copy existing owners into records
-- ---------------------------------------------------------------------------
create temporary table owner_copy (
  lease_id uuid primary key,
  organisation_id uuid not null,
  property_id uuid not null,
  end_date date,
  created_at timestamptz not null,
  full_name text not null,
  email text,
  phone text,
  match_key text not null,
  owner_id uuid
);

insert into owner_copy (
  lease_id, organisation_id, property_id, end_date, created_at,
  full_name, email, phone, match_key
)
select
  l.id,
  l.organisation_id,
  l.property_id,
  l.end_date,
  l.created_at,
  btrim(l.owner_name),
  case
    when char_length(btrim(coalesce(l.owner_email, ''))) between 3 and 254
      then lower(btrim(l.owner_email))
  end,
  nullif(left(btrim(coalesce(l.owner_phone, '')), 100), ''),
  ''
from public.owner_leases l;

update owner_copy
set match_key = lower(full_name)
  || '|' || coalesce(email, '')
  || '|' || regexp_replace(coalesce(phone, ''), '\s', '', 'g');

-- One new id for each owner (organisation + match key).
update owner_copy c
set owner_id = g.owner_id
from (
  select organisation_id, match_key, gen_random_uuid() as owner_id
  from owner_copy
  group by organisation_id, match_key
) g
where g.organisation_id = c.organisation_id
  and g.match_key = c.match_key;

-- The record takes its details from that owner's newest lease.
insert into public.property_owners (
  id, organisation_id, owner_type, full_name, email, phone, created_at
)
select distinct on (owner_id)
  owner_id, organisation_id, 'individual', full_name, email, phone, created_at
from owner_copy
order by owner_id, created_at desc;

update public.owner_leases l
set owner_id = c.owner_id
from owner_copy c
where c.lease_id = l.id;

-- The owner of each current lease owns that home.
insert into public.property_owner_links (organisation_id, property_id, owner_id, created_by)
select distinct organisation_id, property_id, owner_id, null::uuid
from owner_copy
where end_date is null
on conflict (property_id, owner_id) do nothing;

drop table owner_copy;

-- ---------------------------------------------------------------------------
-- 5. Privileges and row-level security
-- ---------------------------------------------------------------------------
revoke all on table public.property_owners, public.property_owner_links
  from anon, authenticated;

grant select, insert, update, delete on table public.property_owners
  to authenticated;
-- Links are added and removed, never changed.
grant select, insert, delete on table public.property_owner_links
  to authenticated;
grant all on table public.property_owners, public.property_owner_links
  to service_role;

alter table public.property_owners enable row level security;
alter table public.property_owner_links enable row level security;

-- Owner records.
create policy "Members can view owners"
  on public.property_owners for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "Managers and above can add owners"
  on public.property_owners for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));

create policy "Managers and above can update owners"
  on public.property_owners for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Same as every other business table: deletes are owner-only. The app
-- archives owners instead.
create policy "Owners can delete owner records"
  on public.property_owners for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- Links between homes and owners.
create policy "Members can view owner links"
  on public.property_owner_links for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "Managers and above can link owners"
  on public.property_owner_links for insert to authenticated
  with check (
    private.has_org_role(organisation_id, 'manager')
    and created_by = (select auth.uid())
  );

create policy "Managers and above can unlink owners"
  on public.property_owner_links for delete to authenticated
  using (private.has_org_role(organisation_id, 'manager'));
