-- =============================================================================
-- public.directories — office directory (office name, code and head).
--
-- Access: every signed-in user can read; only active admins can write.
-- anon has no access. Follows the rules in .agents/DATABASE.md §9.
-- =============================================================================

create table if not exists public.directories (
  id          uuid primary key default gen_random_uuid(),
  office_name text not null,
  office_code text unique,
  office_head text,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  constraint directories_status_check check (status in ('active', 'inactive'))
);

create index if not exists idx_directories_office_name on public.directories (office_name);

-- -----------------------------------------------------------------------------
-- Privileges: no anon access, no TRUNCATE / TRIGGER / REFERENCES for clients.
-- -----------------------------------------------------------------------------
revoke all on public.directories from anon, authenticated;
grant select, insert, update, delete on public.directories to authenticated;
grant all on public.directories to service_role;

alter table public.directories enable row level security;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------
drop policy if exists "directories: authenticated read" on public.directories;
create policy "directories: authenticated read"
  on public.directories for select
  to authenticated
  using (true);

drop policy if exists "directories: admin insert" on public.directories;
create policy "directories: admin insert"
  on public.directories for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "directories: admin update" on public.directories;
create policy "directories: admin update"
  on public.directories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "directories: admin delete" on public.directories;
create policy "directories: admin delete"
  on public.directories for delete
  to authenticated
  using ((select private.is_admin()));
