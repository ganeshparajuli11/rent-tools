-- Photos of a home.
--
-- The image files live in a private Storage bucket, "property-photos", at
--   <organisation_id>/<property_id>/<random uuid>.<jpg|png|webp>
-- and each one has a row in public.property_photos. The browser uploads the
-- file straight to Storage with the signed-in user's own session (so no big
-- request goes through our server), then a server action records the row.
--
-- Security:
--   * The bucket is private. Photos are shown with short-lived signed URLs.
--   * Storage policies only let a member read, add or remove files inside
--     their own organisation's folder (the first part of the path).
--   * The table has the same RLS as the other business tables, and a
--     composite foreign key so a photo can never point at another
--     organisation's home.
--   * Photos are not financial records, so members (not only owners) may
--     remove them.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  property_id uuid not null,
  storage_path text not null unique
    check (char_length(storage_path) between 1 and 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The file must sit in this organisation's and this home's folder.
  check (
    storage_path like (organisation_id::text || '/' || property_id::text || '/%')
  ),
  foreign key (property_id, organisation_id)
    references public.properties (id, organisation_id) on delete cascade
);

create index property_photos_organisation_id_idx
  on public.property_photos (organisation_id);
create index property_photos_property_id_idx
  on public.property_photos (property_id, created_at);
create index property_photos_created_by_idx
  on public.property_photos (created_by);

create trigger set_updated_at before update on public.property_photos
  for each row execute function private.set_updated_at();

revoke all on table public.property_photos from anon, authenticated;
grant select, insert, delete on table public.property_photos to authenticated;
grant all on table public.property_photos to service_role;

alter table public.property_photos enable row level security;

create policy "Members can view property photos"
  on public.property_photos for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "Members can add property photos"
  on public.property_photos for insert to authenticated
  with check (
    private.is_org_member(organisation_id)
    and created_by = (select auth.uid())
  );

create policy "Members can remove property photos"
  on public.property_photos for delete to authenticated
  using (private.is_org_member(organisation_id));

-- ---------------------------------------------------------------------------
-- Storage bucket (private, 5 MB, images only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True when the first folder of a Storage path is an organisation the
-- signed-in user belongs to. Compares as text, so a path that is not a uuid
-- simply gives false instead of an error.
create function private.is_member_of_path_org(object_name text)
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
      and m.organisation_id::text = (storage.foldername(object_name))[1]
  );
$$;

revoke all on function private.is_member_of_path_org(text) from public, anon;
grant execute on function private.is_member_of_path_org(text) to authenticated, service_role;

create policy "Members can view their organisation's property photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'property-photos'
    and private.is_member_of_path_org(name)
  );

create policy "Members can upload their organisation's property photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-photos'
    and private.is_member_of_path_org(name)
  );

create policy "Members can remove their organisation's property photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-photos'
    and private.is_member_of_path_org(name)
  );
-- No update policy: a photo is replaced by removing it and adding a new one.
