-- Roadmap B2: organisation setup and profiles.
--
-- 1. organisations gains account_type (landlord / property_manager) and
--    contact_email. Existing organisations become "property_manager", the
--    provisional answer to D-5. Their contact email stays empty until an
--    owner adds one.
-- 2. profiles: one row per user with their full name. Every existing user
--    gets an empty profile.
-- 3. Signing up no longer creates an organisation. The sign-up trigger now
--    only creates the profile; the person then sets up their organisation
--    on the /setup screen, which calls public.create_organisation. That
--    function makes the organisation, makes the caller its owner, saves
--    their name and writes audit_log, all in one transaction, on the
--    server. Nobody can insert into organisations directly (there is still
--    no insert grant or policy).
--
-- Apply this and merge the code that uses it together: until the new code
-- is live, a brand new account would have no organisation and no /setup
-- screen to make one. Existing accounts are not affected.

-- ---------------------------------------------------------------------------
-- 1. Organisation account type and contact email
-- ---------------------------------------------------------------------------
alter table public.organisations
  add column account_type text,
  add column contact_email text;

update public.organisations
set account_type = 'property_manager'
where account_type is null;

alter table public.organisations
  alter column account_type set default 'property_manager',
  alter column account_type set not null,
  add constraint organisations_account_type_check
    check (account_type in ('landlord', 'property_manager')),
  add constraint organisations_contact_email_check
    check (
      contact_email is null
      or (
        char_length(contact_email) between 3 and 254
        and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
      )
    );

comment on column public.organisations.account_type is
  'landlord (own homes) or property_manager (homes managed or leased from owners). Chosen at set-up.';
comment on column public.organisations.contact_email is
  'The organisation''s contact email, given at set-up. Null for organisations made before set-up existed.';

-- The existing organisations policies already cover the new columns:
-- members read them, only owners change them. No grant or policy changes.

-- ---------------------------------------------------------------------------
-- 2. Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text
    check (full_name is null or char_length(btrim(full_name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user: their name. Made by the sign-up trigger; removed with the user.';

create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Every existing user gets a profile (no name yet).
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- True when the signed-in user and other_user are in the same organisation.
-- SECURITY DEFINER so it reads memberships without RLS (as is_org_member).
create function private.shares_organisation_with(other_user uuid)
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
      and theirs.user_id = other_user
  );
$$;

revoke all on function private.shares_organisation_with(uuid) from public, anon;
grant execute on function private.shares_organisation_with(uuid)
  to authenticated, service_role;

-- Privileges: anon nothing; signed-in people read, and add or change only
-- the name (never id or timestamps after the row exists). No delete: a
-- profile goes when its user is deleted.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, full_name) on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

alter table public.profiles enable row level security;

-- Every role (owner, admin, manager, staff) has the same rights here: a
-- profile belongs to a person, not an organisation.
create policy "People can view their own profile and their colleagues'"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.shares_organisation_with(id)
  );

create policy "People can add their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "People can change their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: nobody deletes a profile through the API.

-- ---------------------------------------------------------------------------
-- 3. Sign-up makes a profile only. Keep it simple: if it fails, sign-up fails.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 200)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

-- The trigger on auth.users (on_auth_user_created) already calls this
-- function, so it does not need to be made again.

-- ---------------------------------------------------------------------------
-- 4. Set up an organisation (the /setup screen)
--
-- Checks the caller is signed in and has no organisation yet (people join
-- further organisations by invitation, roadmap B4), checks every value,
-- then in one transaction: makes the organisation, makes the caller its
-- owner, saves their name on their profile and writes audit_log (account
-- type only: never names or contact details). Returns the new id.
--
-- Error codes: 42501 not signed in, 22023 a value is not valid,
-- PD001 already set up.
-- ---------------------------------------------------------------------------
create function public.create_organisation(
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
     or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'Contact email is not valid.' using errcode = '22023';
  end if;
  if char_length(clean_full_name) not between 1 and 200 then
    raise exception 'Full name is not valid.' using errcode = '22023';
  end if;

  -- Two quick clicks must not make two organisations.
  perform pg_advisory_xact_lock(
    hashtextextended('create_organisation:' || me::text, 0)
  );
  if exists (select 1 from public.memberships m where m.user_id = me) then
    raise exception 'Your organisation is already set up.' using errcode = 'PD001';
  end if;

  insert into public.organisations (name, account_type, contact_email)
  values (clean_name, org_account_type, clean_email)
  returning id into new_org_id;

  insert into public.memberships (user_id, organisation_id, role)
  values (me, new_org_id, 'owner');

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
