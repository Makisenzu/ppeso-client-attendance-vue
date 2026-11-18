-- =============================================================================
-- Migration: 20261118000200_profile_photos.sql
-- Purpose:   Profile pictures. Users upload their own photo on My Account; it is used on the GIP ID.
--
--   1. public.profiles.avatar_path — the photo's path in the private `avatars` bucket ("<user id>/<file>").
--      Never a URL: screens open it with a short-lived signed URL (PRIVACY.md §4.3).
--   2. Storage bucket `avatars` — PRIVATE, JPG / PNG / WebP, up to 5 MB.
--   3. storage.objects policies: a user reads, uploads, replaces and deletes only files in their own folder;
--      admins read (to print IDs) and delete (account deletion removes the photo).
--   4. guard_profile_update(): a non-admin may only point avatar_path at their own folder (or clear it).
--
-- Privacy (PRIVACY.md §2): a face photo is personal data (not sensitive under Sec. 3(l)); visible to the person
-- and admins only. User Management deletes it with the account.
-- =============================================================================

begin;

-- ─── 1. Profile column ─────────────────────────────────────────────────────

alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles
  add constraint profiles_avatar_path_check check (avatar_path is null or char_length(avatar_path) <= 300);

comment on column public.profiles.avatar_path is
  'Profile picture path in the private avatars bucket (<user id>/<file>); opened with signed URLs only.';

-- Same guard as 20261118000000, plus: a non-admin may set avatar_path only inside their own folder.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only enforce for API requests made as a signed-in user. Backend roles
  -- (postgres, service_role, cron) have no auth.uid().
  if auth.uid() is null or private.is_admin() then
    if tg_op = 'UPDATE' then
      new.updated_at := now();
    end if;
    return new;
  end if;

  if new.id        is distinct from old.id
     or new.role      is distinct from old.role
     or new.status    is distinct from old.status
     or new.office_id is distinct from old.office_id
     or new.position  is distinct from old.position
     or new.passcode  is distinct from old.passcode
     or new.funding   is distinct from old.funding
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an administrator can change role, status, office, position, funding or passcode.'
      using errcode = '42501';
  end if;

  if new.avatar_path is distinct from old.avatar_path
     and new.avatar_path is not null
     and split_part(new.avatar_path, '/', 1) <> auth.uid()::text then
    raise exception 'A profile picture must be one of your own uploads.' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_profile_update() from public, anon, authenticated;


-- ─── 2. Private bucket ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ─── 3. Storage policies (own folder; admins read & delete) ────────────────

drop policy if exists "avatars: read own, admin all" on storage.objects;
create policy "avatars: read own, admin all"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );

drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: replace own" on storage.objects;
create policy "avatars: replace own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: delete own, admin all" on storage.objects;
create policy "avatars: delete own, admin all"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );

commit;
