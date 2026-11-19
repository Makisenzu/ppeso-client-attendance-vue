-- =============================================================================
-- Migration: 20261119000100_pacd_files.sql
-- Purpose:   Files — the PACD (Public Assistance and Complaints Desk) file container on the admin Files page:
--            printable forms, templates and guidelines that admins upload, download and print.
--
--   1. core.pacd_files — one row per file: title, category, optional description, and where the file is stored.
--   2. Storage bucket `pacd-files` — PRIVATE, PDF and Word (.docx) only, up to 20 MB each.
--   3. Access: admins only, for the table and the bucket. Files are opened with short-lived signed URLs.
--
-- Privacy: office forms, not personal data. Uploader is kept for accountability (set null if they're deleted).
-- =============================================================================

begin;

-- ─── 1. Table ───────────────────────────────────────────────────────────────

create table if not exists core.pacd_files (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(btrim(title)) between 1 and 200),
  category     text not null default 'forms' check (category in ('forms', 'templates', 'guidelines', 'others')),
  description  text check (description is null or char_length(description) <= 1000),
  file_path    text not null unique check (char_length(file_path) between 1 and 300),
  file_name    text not null check (char_length(file_name) between 1 and 255),
  mime_type    text not null check (
    mime_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ),
  size_bytes   bigint not null check (size_bytes between 1 and 20971520),
  uploaded_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_pacd_files_category on core.pacd_files (category, created_at desc);

create or replace function core.touch_pacd_file()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  if tg_op = 'UPDATE' then
    -- The stored file never changes under a row: replace a file by uploading a new one
    new.file_path := old.file_path;
    new.file_name := old.file_name;
    new.mime_type := old.mime_type;
    new.size_bytes := old.size_bytes;
    new.uploaded_by := old.uploaded_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function core.touch_pacd_file() from public, anon, authenticated;

drop trigger if exists trg_touch_pacd_file on core.pacd_files;
create trigger trg_touch_pacd_file
  before insert or update on core.pacd_files
  for each row execute function core.touch_pacd_file();

revoke all on core.pacd_files from public, anon;
grant select, insert, update, delete on core.pacd_files to authenticated;
grant all on core.pacd_files to service_role;

alter table core.pacd_files enable row level security;

drop policy if exists "pacd_files: admin all" on core.pacd_files;
create policy "pacd_files: admin all"
  on core.pacd_files for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));


-- ─── 2. Private bucket ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pacd-files', 'pacd-files', false, 20971520,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ─── 3. Storage policies (admins only) ─────────────────────────────────────

drop policy if exists "pacd-files: admin read" on storage.objects;
create policy "pacd-files: admin read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'pacd-files' and (select private.is_admin()));

drop policy if exists "pacd-files: admin upload" on storage.objects;
create policy "pacd-files: admin upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pacd-files' and (select private.is_admin()));

drop policy if exists "pacd-files: admin delete" on storage.objects;
create policy "pacd-files: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'pacd-files' and (select private.is_admin()));

commit;
