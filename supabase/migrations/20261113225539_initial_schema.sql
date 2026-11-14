-- RentDesk initial schema: tables, constraints, indexes, row-level security.
--
-- Conventions
--   * uuid primary keys, created_at / updated_at on every table (audit_log is
--     append-only, so it only has created_at).
--   * Money is always integer pence. Never floats.
--   * Every business row carries organisation_id. Child rows use composite
--     foreign keys (parent_id, organisation_id) so a row can never point at a
--     parent that belongs to a different organisation.
--   * Financial history (tenancies, rent_charges, payments) is protected with
--     ON DELETE NO ACTION: you cannot delete a property, room, tenancy or charge
--     that still has money records. Deleting a whole organisation still
--     cascades through everything in one statement.

-- ---------------------------------------------------------------------------
-- Private schema for helper functions. It is NOT exposed through the Data API,
-- so these functions cannot be called directly by clients over REST/RPC.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Keeps updated_at current on every UPDATE.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organisation_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  property_type text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for composite foreign keys from child tables.
  unique (id, organisation_id)
);

-- Rent the operator pays the property owner (rent-to-rent). Optional.
create table public.owner_leases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null,
  owner_name text not null check (char_length(btrim(owner_name)) between 1 and 200),
  owner_phone text,
  owner_email text,
  rent_pence integer not null check (rent_pence >= 0),
  due_day smallint not null check (due_day between 1 and 28),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  foreign key (property_id, organisation_id)
    references public.properties (id, organisation_id) on delete cascade
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organisation_id),
  -- Lets tenancies check the room belongs to the same property.
  unique (id, property_id, organisation_id),
  foreign key (property_id, organisation_id)
    references public.properties (id, organisation_id) on delete cascade
);

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null,
  room_id uuid, -- null = whole-property let
  tenant_name text not null check (char_length(btrim(tenant_name)) between 1 and 200),
  tenant_phone text,
  tenant_email text,
  rent_pence integer not null check (rent_pence >= 0),
  due_day smallint not null check (due_day between 1 and 28),
  deposit_pence integer not null default 0 check (deposit_pence >= 0),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (id, organisation_id),
  foreign key (property_id, organisation_id)
    references public.properties (id, organisation_id) on delete no action,
  -- MATCH SIMPLE: only checked when room_id is not null.
  foreign key (room_id, property_id, organisation_id)
    references public.rooms (id, property_id, organisation_id) on delete no action
);

create table public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  tenancy_id uuid not null,
  period_start date not null,
  due_date date not null,
  amount_pence integer not null check (amount_pence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenancy_id, period_start),
  unique (id, organisation_id),
  foreign key (tenancy_id, organisation_id)
    references public.tenancies (id, organisation_id) on delete no action
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  rent_charge_id uuid not null,
  amount_pence integer not null check (amount_pence >= 0),
  paid_on date not null default current_date,
  method text,
  note text,
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (rent_charge_id, organisation_id)
    references public.rent_charges (id, organisation_id) on delete no action
);

-- Append-only. No UPDATE or DELETE for anyone using the API.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  table_name text not null check (char_length(table_name) between 1 and 100),
  record_id uuid,
  changes jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: organisation_id on every table, every foreign key, and the date
-- used to find overdue rent. (Columns that already lead a unique index,
-- e.g. memberships.user_id and rent_charges.tenancy_id, are covered.)
-- ---------------------------------------------------------------------------
create index memberships_organisation_id_idx on public.memberships (organisation_id);

create index properties_organisation_id_idx on public.properties (organisation_id);

create index owner_leases_organisation_id_idx on public.owner_leases (organisation_id);
create index owner_leases_property_id_idx on public.owner_leases (property_id);

create index rooms_organisation_id_idx on public.rooms (organisation_id);
create index rooms_property_id_idx on public.rooms (property_id);

create index tenancies_organisation_id_idx on public.tenancies (organisation_id);
create index tenancies_property_id_idx on public.tenancies (property_id);
create index tenancies_room_id_idx on public.tenancies (room_id);

create index rent_charges_organisation_id_idx on public.rent_charges (organisation_id);
create index rent_charges_due_date_idx on public.rent_charges (due_date);

create index payments_organisation_id_idx on public.payments (organisation_id);
create index payments_rent_charge_id_idx on public.payments (rent_charge_id);
create index payments_recorded_by_idx on public.payments (recorded_by);

create index audit_log_organisation_id_idx on public.audit_log (organisation_id);
create index audit_log_user_id_idx on public.audit_log (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.organisations
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.properties
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.owner_leases
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.rooms
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.tenancies
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.rent_charges
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- SECURITY DEFINER so they read memberships without RLS. This is what stops
-- the memberships policies from recursing into themselves. STABLE so Postgres
-- can reuse the result within a statement. search_path = '' and fully
-- qualified names, as Supabase recommends.
-- ---------------------------------------------------------------------------
create function private.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organisation_id = org_id
      and m.user_id = (select auth.uid())
  );
$$;

create function private.is_org_owner(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organisation_id = org_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.is_org_owner(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.is_org_owner(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- Some Supabase projects auto-grant every privilege (including TRUNCATE,
-- which ignores RLS) to anon and authenticated. Reset that and grant only
-- what each table needs. anon gets nothing: signed-out visitors read no data.
-- ---------------------------------------------------------------------------
revoke all on table
  public.organisations, public.memberships, public.properties,
  public.owner_leases, public.rooms, public.tenancies, public.rent_charges,
  public.payments, public.audit_log
from anon, authenticated;

grant select, update, delete on table public.organisations to authenticated;
grant select, insert, update, delete on table
  public.memberships, public.properties, public.owner_leases, public.rooms,
  public.tenancies, public.rent_charges, public.payments
to authenticated;
grant select, insert on table public.audit_log to authenticated;

grant all on table
  public.organisations, public.memberships, public.properties,
  public.owner_leases, public.rooms, public.tenancies, public.rent_charges,
  public.payments, public.audit_log
to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.organisations enable row level security;
alter table public.memberships enable row level security;
alter table public.properties enable row level security;
alter table public.owner_leases enable row level security;
alter table public.rooms enable row level security;
alter table public.tenancies enable row level security;
alter table public.rent_charges enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

-- organisations: created only by the sign-up trigger (no insert policy).
create policy "Members can view their organisations"
  on public.organisations for select to authenticated
  using (private.is_org_member(id));

create policy "Owners can update their organisations"
  on public.organisations for update to authenticated
  using (private.is_org_owner(id))
  with check (private.is_org_owner(id));

create policy "Owners can delete their organisations"
  on public.organisations for delete to authenticated
  using (private.is_org_owner(id));

-- memberships: members see who is in their organisation; only owners manage.
create policy "Members can view memberships in their organisations"
  on public.memberships for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "Owners can add memberships"
  on public.memberships for insert to authenticated
  with check (private.is_org_owner(organisation_id));

create policy "Owners can update memberships"
  on public.memberships for update to authenticated
  using (private.is_org_owner(organisation_id))
  with check (private.is_org_owner(organisation_id));

create policy "Owners can remove memberships"
  on public.memberships for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- Business tables: members select/insert/update, owners delete.
create policy "Members can view properties"
  on public.properties for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add properties"
  on public.properties for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "Members can update properties"
  on public.properties for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete properties"
  on public.properties for delete to authenticated
  using (private.is_org_owner(organisation_id));

create policy "Members can view owner leases"
  on public.owner_leases for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add owner leases"
  on public.owner_leases for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "Members can update owner leases"
  on public.owner_leases for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete owner leases"
  on public.owner_leases for delete to authenticated
  using (private.is_org_owner(organisation_id));

create policy "Members can view rooms"
  on public.rooms for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add rooms"
  on public.rooms for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "Members can update rooms"
  on public.rooms for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete rooms"
  on public.rooms for delete to authenticated
  using (private.is_org_owner(organisation_id));

create policy "Members can view tenancies"
  on public.tenancies for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add tenancies"
  on public.tenancies for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "Members can update tenancies"
  on public.tenancies for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete tenancies"
  on public.tenancies for delete to authenticated
  using (private.is_org_owner(organisation_id));

create policy "Members can view rent charges"
  on public.rent_charges for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add rent charges"
  on public.rent_charges for insert to authenticated
  with check (private.is_org_member(organisation_id));
create policy "Members can update rent charges"
  on public.rent_charges for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete rent charges"
  on public.rent_charges for delete to authenticated
  using (private.is_org_owner(organisation_id));

create policy "Members can view payments"
  on public.payments for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can record payments"
  on public.payments for insert to authenticated
  with check (
    private.is_org_member(organisation_id)
    and recorded_by = (select auth.uid())
  );
create policy "Members can update payments"
  on public.payments for update to authenticated
  using (private.is_org_member(organisation_id))
  with check (private.is_org_member(organisation_id));
create policy "Owners can delete payments"
  on public.payments for delete to authenticated
  using (private.is_org_owner(organisation_id));

-- audit_log: read and append only. No update/delete policy (and no grant).
create policy "Members can view the audit log"
  on public.audit_log for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "Members can add to the audit log as themselves"
  on public.audit_log for insert to authenticated
  with check (
    private.is_org_member(organisation_id)
    and user_id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Keep at least one owner per organisation.
-- Blocks removing or demoting the last owner. Allowed when the whole
-- organisation or the user account is being deleted.
-- ---------------------------------------------------------------------------
create function private.ensure_org_keeps_an_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
     and new.role = 'owner'
     and new.organisation_id = old.organisation_id then
    return new;
  end if;

  -- Organisation or user is being deleted: nothing to protect.
  if not exists (select 1 from public.organisations o where o.id = old.organisation_id)
     or not exists (select 1 from auth.users u where u.id = old.user_id) then
    return coalesce(new, old);
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.organisation_id = old.organisation_id
      and m.role = 'owner'
      and m.id <> old.id
  ) then
    raise exception 'An organisation must keep at least one owner.'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger ensure_org_keeps_an_owner
  before update or delete on public.memberships
  for each row execute function private.ensure_org_keeps_an_owner();

-- ---------------------------------------------------------------------------
-- New user sign-up: create an organisation and make the user its owner.
-- If this trigger fails, sign-up fails, so keep it simple.
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  insert into public.organisations (name)
  values (
    coalesce(
      left(nullif(btrim(new.raw_user_meta_data ->> 'organisation_name'), ''), 200),
      'My organisation'
    )
  )
  returning id into new_org_id;

  insert into public.memberships (user_id, organisation_id, role)
  values (new.id, new_org_id, 'owner');

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.ensure_org_keeps_an_owner() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
