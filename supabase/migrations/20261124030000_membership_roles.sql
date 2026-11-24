-- Roadmap B3: roles.
--
-- 1. memberships.role allows owner / admin / manager / staff (it was owner
--    / staff), and memberships gain `status`: active, invited or removed.
--    Every existing membership is active. Only active memberships give
--    access to anything.
-- 2. Helper functions by role level (owner > admin > manager > staff), in
--    the private schema like the existing ones. is_org_member and
--    is_org_owner now count active memberships only.
-- 3. Policies per PRODUCT_SPEC.md §5. Every change here makes a policy
--    stricter, never looser:
--      * homes, rooms, owner leases, tenants (tenancies), rent charges and
--        home photos: everyone in the organisation reads them; managers
--        and above add and change them (staff could before);
--      * payments: every role records and changes them (unchanged);
--      * deletes stay owner-only (unchanged);
--      * organisation settings: owners only (unchanged);
--      * members: owners change or remove anyone; admins change or remove
--        anyone except an owner, and cannot make anyone an owner (before,
--        owners only). Only the role and status of a membership can be
--        changed. Adding a membership directly stays owner-only until
--        invitations arrive (roadmap B4).
-- 4. An organisation always keeps an active owner (the existing trigger
--    now also counts status), and setting up an organisation only looks at
--    active memberships.
--
-- The app code that goes with this is on the `next` branch. Apply after
-- every earlier migration (including 20261123030000).

-- ---------------------------------------------------------------------------
-- 1. Roles and status on memberships
-- ---------------------------------------------------------------------------

-- The role check was written inline in the first schema, so look it up by
-- what it checks rather than trusting its generated name.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.memberships'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%role%'
  loop
    execute format(
      'alter table public.memberships drop constraint %I',
      constraint_name
    );
  end loop;
end;
$$;

alter table public.memberships
  add constraint memberships_role_check
    check (role in ('owner', 'admin', 'manager', 'staff'));

alter table public.memberships
  add column status text not null default 'active',
  add constraint memberships_status_check
    check (status in ('active', 'invited', 'removed'));

comment on column public.memberships.role is
  'owner, admin, manager or staff (PRODUCT_SPEC.md §5). Higher roles can do everything lower ones can.';
comment on column public.memberships.status is
  'active (has access), invited (not yet accepted) or removed (kept for history, no access).';

-- Membership look-ups are by person, then by status.
create index memberships_user_id_status_idx
  on public.memberships (user_id, status);

-- ---------------------------------------------------------------------------
-- 2. Helper functions by role level
-- ---------------------------------------------------------------------------

-- owner 4, admin 3, manager 2, staff 1, anything else 0.
create function private.role_rank(role_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case role_name
    when 'owner' then 4
    when 'admin' then 3
    when 'manager' then 2
    when 'staff' then 1
    else 0
  end;
$$;

-- True when the signed-in user has an active membership of org_id with
-- min_role or a higher one. An unknown min_role is always false, so a
-- typo can never let everyone in.
create function private.has_org_role(org_id uuid, min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_rank(min_role) > 0
    and exists (
      select 1
      from public.memberships m
      where m.organisation_id = org_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and private.role_rank(m.role) >= private.role_rank(min_role)
    );
$$;

revoke all on function private.role_rank(text) from public, anon;
revoke all on function private.has_org_role(uuid, text) from public, anon;
grant execute on function private.role_rank(text) to authenticated, service_role;
grant execute on function private.has_org_role(uuid, text)
  to authenticated, service_role;

-- The existing helpers now count active memberships only. Same names and
-- signatures, so every policy that uses them picks this up.
create or replace function private.is_org_member(org_id uuid)
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
      and m.status = 'active'
  );
$$;

create or replace function private.is_org_owner(org_id uuid)
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
      and m.status = 'active'
      and m.role = 'owner'
  );
$$;

-- Storage: the organisation is the first folder of the object's path.
create or replace function private.is_member_of_path_org(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.organisation_id::text = (storage.foldername(object_name))[1]
  );
$$;

create function private.has_role_in_path_org(object_name text, min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_rank(min_role) > 0
    and exists (
      select 1
      from public.memberships m
      where m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.organisation_id::text = (storage.foldername(object_name))[1]
        and private.role_rank(m.role) >= private.role_rank(min_role)
    );
$$;

revoke all on function private.has_role_in_path_org(text, text) from public, anon;
grant execute on function private.has_role_in_path_org(text, text)
  to authenticated, service_role;

-- Profiles: colleagues are people you share an organisation with while
-- your own membership is active. (Their membership may be any status, so
-- names stay readable in history.)
create or replace function private.shares_organisation_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs
      on theirs.organisation_id = mine.organisation_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

-- Members: only the role and status can ever be changed through the API
-- (never who or which organisation a membership is for).
revoke update on table public.memberships from authenticated;
grant update (role, status) on table public.memberships to authenticated;

-- "Owners can view / add" stay as they are. Updates and removals: owners
-- for anyone; admins for anyone who is not an owner, and an admin can
-- never make someone an owner (WITH CHECK sees the new row).
drop policy "Owners can update memberships" on public.memberships;
create policy "Owners and admins can update memberships"
  on public.memberships for update to authenticated
  using (
    private.has_org_role(organisation_id, 'owner')
    or (private.has_org_role(organisation_id, 'admin') and role <> 'owner')
  )
  with check (
    private.has_org_role(organisation_id, 'owner')
    or (private.has_org_role(organisation_id, 'admin') and role <> 'owner')
  );

drop policy "Owners can remove memberships" on public.memberships;
create policy "Owners and admins can remove memberships"
  on public.memberships for delete to authenticated
  using (
    private.has_org_role(organisation_id, 'owner')
    or (private.has_org_role(organisation_id, 'admin') and role <> 'owner')
  );

-- Homes (properties): managers and above add and change them.
drop policy "Members can add properties" on public.properties;
create policy "Managers and above can add properties"
  on public.properties for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));
drop policy "Members can update properties" on public.properties;
create policy "Managers and above can update properties"
  on public.properties for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Rent paid to owners.
drop policy "Members can add owner leases" on public.owner_leases;
create policy "Managers and above can add owner leases"
  on public.owner_leases for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));
drop policy "Members can update owner leases" on public.owner_leases;
create policy "Managers and above can update owner leases"
  on public.owner_leases for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Rooms.
drop policy "Members can add rooms" on public.rooms;
create policy "Managers and above can add rooms"
  on public.rooms for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));
drop policy "Members can update rooms" on public.rooms;
create policy "Managers and above can update rooms"
  on public.rooms for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Tenants (tenancies).
drop policy "Members can add tenancies" on public.tenancies;
create policy "Managers and above can add tenancies"
  on public.tenancies for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));
drop policy "Members can update tenancies" on public.tenancies;
create policy "Managers and above can update tenancies"
  on public.tenancies for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Rent charges are made when a tenant is added or changed (and by the
-- daily job, with the service role).
drop policy "Members can add rent charges" on public.rent_charges;
create policy "Managers and above can add rent charges"
  on public.rent_charges for insert to authenticated
  with check (private.has_org_role(organisation_id, 'manager'));
drop policy "Members can update rent charges" on public.rent_charges;
create policy "Managers and above can update rent charges"
  on public.rent_charges for update to authenticated
  using (private.has_org_role(organisation_id, 'manager'))
  with check (private.has_org_role(organisation_id, 'manager'));

-- Payments: every role records them ("Members can record payments" and
-- "Members can update payments" are unchanged; is_org_member now means an
-- active member).

-- Home photos (the table and the Storage files).
drop policy "Members can add property photos" on public.property_photos;
create policy "Managers and above can add property photos"
  on public.property_photos for insert to authenticated
  with check (
    private.has_org_role(organisation_id, 'manager')
    and created_by = (select auth.uid())
  );
drop policy "Members can remove property photos" on public.property_photos;
create policy "Managers and above can remove property photos"
  on public.property_photos for delete to authenticated
  using (private.has_org_role(organisation_id, 'manager'));

drop policy "Members can upload their organisation's property photos"
  on storage.objects;
create policy "Managers and above can upload property photo files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-photos'
    and private.has_role_in_path_org(name, 'manager')
  );
drop policy "Members can remove their organisation's property photos"
  on storage.objects;
create policy "Managers and above can remove property photo files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-photos'
    and private.has_role_in_path_org(name, 'manager')
  );

-- ---------------------------------------------------------------------------
-- 4. Keep an active owner; set-up looks at active memberships only
-- ---------------------------------------------------------------------------
create or replace function private.ensure_org_keeps_an_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only an active owner losing that is a concern.
  if old.role <> 'owner' or old.status <> 'active' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
     and new.role = 'owner'
     and new.status = 'active'
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
      and m.status = 'active'
      and m.id <> old.id
  ) then
    raise exception 'An organisation must keep at least one owner.'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.ensure_org_keeps_an_owner() from public, anon, authenticated;

-- Same as in 20261123030000, except that only an ACTIVE membership counts
-- as "already set up": someone removed from every organisation can set up
-- their own.
create or replace function public.create_organisation(
  org_name text,
  org_account_type text,
  org_contact_email text,
  creator_full_name text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  clean_name text := btrim(coalesce(org_name, ''));
  clean_email text := lower(btrim(coalesce(org_contact_email, '')));
  clean_full_name text := btrim(coalesce(creator_full_name, ''));
  new_org_id uuid;
begin
  if me is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;

  if char_length(clean_name) not between 1 and 200 then
    raise exception 'Organisation name is not valid.' using errcode = '22023';
  end if;
  if org_account_type is null
     or org_account_type not in ('landlord', 'property_manager') then
    raise exception 'Account type is not valid.' using errcode = '22023';
  end if;
  if char_length(clean_email) not between 3 and 254
     or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Contact email is not valid.' using errcode = '22023';
  end if;
  if char_length(clean_full_name) not between 1 and 200 then
    raise exception 'Full name is not valid.' using errcode = '22023';
  end if;

  -- Two quick clicks must not make two organisations.
  perform pg_advisory_xact_lock(
    hashtextextended('create_organisation:' || me::text, 0)
  );
  if exists (
    select 1 from public.memberships m
    where m.user_id = me and m.status = 'active'
  ) then
    raise exception 'Your organisation is already set up.' using errcode = 'PD001';
  end if;

  insert into public.organisations (name, account_type, contact_email)
  values (clean_name, org_account_type, clean_email)
  returning id into new_org_id;

  insert into public.memberships (user_id, organisation_id, role, status)
  values (me, new_org_id, 'owner', 'active');

  insert into public.profiles (id, full_name)
  values (me, clean_full_name)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.audit_log
    (organisation_id, user_id, action, table_name, record_id, changes)
  values (
    new_org_id,
    me,
    'organisation.created',
    'organisations',
    new_org_id,
    jsonb_build_object('account_type', org_account_type)
  );

  return new_org_id;
end;
$$;

revoke all on function public.create_organisation(text, text, text, text)
  from public, anon;
grant execute on function public.create_organisation(text, text, text, text)
  to authenticated, service_role;
