-- Roadmap B4: members and invitations.
--
-- 1. invitations: an owner or admin invites someone by email with a role
--    (admin, manager or staff; never owner). The link carries a random
--    single-use token; only its SHA-256 hash is stored. Invitations expire
--    after 7 days, can be cancelled (and the cancel undone), and are never
--    deleted, so the history stays.
-- 2. Accepting goes through public.accept_invitation, which checks that the
--    signed-in person's confirmed email address is the one invited, that
--    the invitation is still open, then adds the membership (or makes a
--    removed one active again) and writes audit_log, in one transaction.
--    public.my_invitations and public.invitation_for_token let the invited
--    person see their own open invitations, and nothing else.
-- 3. Memberships can no longer be inserted directly through the API (the
--    first schema let an owner add any user id). New members only arrive
--    through create_organisation (the owner) and accept_invitation.
-- 4. public.transfer_ownership: an owner makes another active member the
--    owner and becomes an admin, after typing the organisation's name.
--
-- Every change here makes access stricter or adds a new, narrowly granted
-- path. Apply after every earlier migration (including 20261123030000 and
-- 20261124030000). The app code that goes with this is on the `next`
-- branch.

-- ---------------------------------------------------------------------------
-- 1. Invitations
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  email text not null
    check (
      char_length(email) between 3 and 254
      and email = lower(btrim(email))
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  role text not null check (role in ('admin', 'manager', 'staff')),
  -- SHA-256 of the token in the link, as 64 hex characters. The token
  -- itself is never stored.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_accepted_or_revoked
    check (accepted_at is null or revoked_at is null),
  constraint invitations_accepted_by_with_accepted_at
    check ((accepted_at is null) = (accepted_by is null)),
  constraint invitations_expiry_window
    check (expires_at > created_at and expires_at <= created_at + interval '30 days')
);

comment on table public.invitations is
  'Invitations to join an organisation (roadmap B4). Only the hash of the link token is stored. Never deleted: cancelled ones have revoked_at.';

create trigger set_updated_at before update on public.invitations
  for each row execute function private.set_updated_at();

create index invitations_organisation_id_idx on public.invitations (organisation_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
-- Open invitations by email (what the invited person looks up).
create index invitations_open_email_idx on public.invitations (email)
  where accepted_at is null and revoked_at is null;
-- At most one open invitation per email address in an organisation. The
-- app cancels the older one before sending a new one.
create unique index invitations_one_open_per_email_idx
  on public.invitations (organisation_id, email)
  where accepted_at is null and revoked_at is null;

revoke all on table public.invitations from anon, authenticated;
-- Owners and admins read invitations, but never the token hash.
grant select (
  id, organisation_id, email, role, invited_by, expires_at, accepted_at,
  accepted_by, revoked_at, created_at, updated_at
) on table public.invitations to authenticated;
-- They add them (the expiry, who invited and the rest come from defaults)
-- and can cancel or un-cancel them. Nothing else can change.
grant insert (organisation_id, email, role, token_hash)
  on table public.invitations to authenticated;
grant update (revoked_at) on table public.invitations to authenticated;
grant all on table public.invitations to service_role;

alter table public.invitations enable row level security;

-- Owners and admins (PRODUCT_SPEC.md §5: they manage members). Managers
-- and staff see no invitations; an invited person sees their own only
-- through the functions below.
create policy "Owners and admins can view invitations"
  on public.invitations for select to authenticated
  using (private.has_org_role(organisation_id, 'admin'));

create policy "Owners and admins can invite"
  on public.invitations for insert to authenticated
  with check (
    private.has_org_role(organisation_id, 'admin')
    and invited_by = (select auth.uid())
    and accepted_at is null
    and accepted_by is null
    and revoked_at is null
  );

-- Cancel (or undo a cancel of) an invitation nobody has accepted yet.
create policy "Owners and admins can cancel invitations"
  on public.invitations for update to authenticated
  using (
    private.has_org_role(organisation_id, 'admin')
    and accepted_at is null
  )
  with check (
    private.has_org_role(organisation_id, 'admin')
    and accepted_at is null
  );

-- No delete policy: invitations are kept as history.

-- ---------------------------------------------------------------------------
-- 2. The invited person: see and accept their own invitations
-- ---------------------------------------------------------------------------

-- The signed-in person's email address, only once they have confirmed it
-- (signing in with a code or link confirms it). Null otherwise.
create function private.my_confirmed_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(u.email))
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null;
$$;

revoke all on function private.my_confirmed_email() from public, anon;
grant execute on function private.my_confirmed_email() to authenticated, service_role;

-- Open invitations for the signed-in person's confirmed email address:
-- the organisation's name, the role and when it expires. Nothing about
-- anyone else's invitations.
create function public.my_invitations()
returns table (
  id uuid,
  organisation_name text,
  role text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, o.name, i.role, i.expires_at
  from public.invitations i
  join public.organisations o on o.id = i.organisation_id
  where i.email = private.my_confirmed_email()
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 20;
$$;

revoke all on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated, service_role;

-- What a link (/invite/<token>) points at. `state` is one of:
--   open, accepted, cancelled, expired, not_for_you, not_found.
-- The organisation's name and the role are only given when the invitation
-- is for the signed-in person's email address.
create function public.invitation_for_token(invite_token text)
returns table (
  id uuid,
  organisation_name text,
  role text,
  expires_at timestamptz,
  state text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_row public.invitations%rowtype;
  org_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;

  if invite_token is null or invite_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    return query select null::uuid, null::text, null::text, null::timestamptz, 'not_found'::text;
    return;
  end if;

  select * into found_row
  from public.invitations i
  where i.token_hash = encode(sha256(convert_to(invite_token, 'UTF8')), 'hex');

  if not found then
    return query select null::uuid, null::text, null::text, null::timestamptz, 'not_found'::text;
    return;
  end if;

  if found_row.email is distinct from private.my_confirmed_email() then
    return query select null::uuid, null::text, null::text, null::timestamptz, 'not_for_you'::text;
    return;
  end if;

  select o.name into org_name
  from public.organisations o
  where o.id = found_row.organisation_id;

  return query select
    found_row.id,
    org_name,
    found_row.role,
    found_row.expires_at,
    case
      when found_row.accepted_at is not null then 'accepted'
      when found_row.revoked_at is not null then 'cancelled'
      when found_row.expires_at <= now() then 'expired'
      else 'open'
    end;
end;
$$;

revoke all on function public.invitation_for_token(text) from public, anon;
grant execute on function public.invitation_for_token(text) to authenticated, service_role;

-- Accept an invitation: only the person it was sent to (by confirmed
-- email), only once, only before it expires or is cancelled. Adds the
-- membership with the invited role, or makes a removed one active again,
-- saves the person's name if they give one, and writes audit_log. Returns
-- the organisation's id.
--
-- Error codes the app turns into plain words:
--   42501 not signed in
--   PD002 not found, not for you, cancelled, used or expired
--   PD003 already an active member of that organisation
--   22023 a name that is not valid
create function public.accept_invitation(
  invitation_id uuid,
  full_name text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_email text := private.my_confirmed_email();
  clean_full_name text := nullif(btrim(coalesce(full_name, '')), '');
  invite public.invitations%rowtype;
  existing public.memberships%rowtype;
  membership_id uuid;
begin
  if me is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;

  if clean_full_name is not null and char_length(clean_full_name) > 200 then
    raise exception 'Full name is not valid.' using errcode = '22023';
  end if;

  -- Lock the invitation so two clicks cannot use it twice.
  select * into invite
  from public.invitations i
  where i.id = invitation_id
  for update;

  if not found
     or my_email is null
     or invite.email <> my_email
     or invite.accepted_at is not null
     or invite.revoked_at is not null
     or invite.expires_at <= now() then
    raise exception 'This invitation cannot be used.' using errcode = 'PD002';
  end if;

  select * into existing
  from public.memberships m
  where m.user_id = me
    and m.organisation_id = invite.organisation_id
  for update;

  if found and existing.status = 'active' then
    raise exception 'You are already a member of this organisation.'
      using errcode = 'PD003';
  end if;

  if found then
    -- A removed (or old invited) membership comes back with the new role.
    -- Never an owner: invitations cannot be for owners.
    update public.memberships m
    set role = invite.role, status = 'active'
    where m.id = existing.id
    returning m.id into membership_id;
  else
    insert into public.memberships (user_id, organisation_id, role, status)
    values (me, invite.organisation_id, invite.role, 'active')
    returning id into membership_id;
  end if;

  update public.invitations i
  set accepted_at = now(), accepted_by = me
  where i.id = invite.id;

  if clean_full_name is not null then
    insert into public.profiles (id, full_name)
    values (me, clean_full_name)
    on conflict (id) do update set full_name = excluded.full_name;
  end if;

  -- No names or email addresses in the audit log.
  insert into public.audit_log
    (organisation_id, user_id, action, table_name, record_id, changes)
  values (
    invite.organisation_id,
    me,
    'membership.joined',
    'memberships',
    membership_id,
    jsonb_build_object('role', invite.role, 'invitation_id', invite.id)
  );

  return invite.organisation_id;
end;
$$;

revoke all on function public.accept_invitation(uuid, text) from public, anon;
grant execute on function public.accept_invitation(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. No direct membership inserts
-- ---------------------------------------------------------------------------
-- Before: "Owners can add memberships" let an owner insert a membership for
-- any user id. Now nobody can insert one through the API; the definer
-- functions above (and create_organisation) are the only ways in. This is
-- stricter, never looser.
drop policy "Owners can add memberships" on public.memberships;
revoke insert on table public.memberships from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Ownership transfer
-- ---------------------------------------------------------------------------
-- The signed-in owner makes another active member of the same organisation
-- the owner, and becomes an admin themselves. They must type the
-- organisation's name to confirm (checked here, not only in the browser).
--
-- Error codes: 42501 not signed in or not an owner; PD004 the new owner is
-- not an active member (or is the caller); 22023 the name does not match.
create function public.transfer_ownership(
  new_owner_membership_id uuid,
  confirm_organisation_name text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target public.memberships%rowtype;
  mine public.memberships%rowtype;
  org_name text;
begin
  if me is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;

  select * into target
  from public.memberships m
  where m.id = new_owner_membership_id
  for update;

  if not found then
    raise exception 'That person is not an active member.' using errcode = 'PD004';
  end if;

  select * into mine
  from public.memberships m
  where m.organisation_id = target.organisation_id
    and m.user_id = me
  for update;

  if not found or mine.status <> 'active' or mine.role <> 'owner' then
    raise exception 'Only the owner can do this.' using errcode = '42501';
  end if;

  if target.user_id = me or target.status <> 'active' then
    raise exception 'That person is not an active member.' using errcode = 'PD004';
  end if;

  select o.name into org_name
  from public.organisations o
  where o.id = target.organisation_id;

  if lower(btrim(coalesce(confirm_organisation_name, '')))
     <> lower(btrim(org_name)) then
    raise exception 'The organisation name does not match.' using errcode = '22023';
  end if;

  -- New owner first, so the organisation always has an active owner.
  update public.memberships m set role = 'owner' where m.id = target.id;
  update public.memberships m set role = 'admin' where m.id = mine.id;

  insert into public.audit_log
    (organisation_id, user_id, action, table_name, record_id, changes)
  values (
    target.organisation_id,
    me,
    'membership.ownership_transferred',
    'memberships',
    target.id,
    jsonb_build_object('from_membership_id', mine.id)
  );
end;
$$;

revoke all on function public.transfer_ownership(uuid, text) from public, anon;
grant execute on function public.transfer_ownership(uuid, text)
  to authenticated, service_role;
