-- =============================================================================
-- Row Level Security: rebuild every policy from scratch.
--
-- Access model
--   admin       : full read/write on everything (also runs the kiosk).
--   supervisor  : read profiles + attendance of users in their own office,
--                 read walk-in records.
--   beneficiary : read own profile + own attendance; edit own name only.
--   anon        : no table access at all.
-- Inactive/pending accounts get no elevated rights.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop every existing policy on the app tables (old ones were wide open).
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname, tablename) in (
      ('public', 'profiles'),
      ('public', 'offices'),
      ('core',   'attendances'),
      ('core',   'walkin_attendances')
    )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Helper functions in a schema NOT exposed through the Data API.
--    SECURITY DEFINER (owner postgres bypasses RLS) avoids policy recursion.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.user_role()
returns public.profile_roles
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'::public.profile_status
$$;

create or replace function private.user_office_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.office_id
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'active'::public.profile_status
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.user_role() = 'admin'::public.profile_roles, false)
$$;

create or replace function private.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.user_role() = 'supervisor'::public.profile_roles, false)
$$;

-- True when the caller is a supervisor and target profile is in their office.
create or replace function private.supervises(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_supervisor()
     and exists (
       select 1
       from public.profiles p
       where p.id = target_profile
         and p.office_id is not null
         and p.office_id = private.user_office_id()
     )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Table privileges. RLS only filters rows; also strip anon entirely and
--    remove TRUNCATE (which ignores RLS) / TRIGGER / REFERENCES.
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.offices, core.attendances, core.walkin_attendances
  from anon, authenticated;

grant select, insert, update, delete
  on public.profiles, public.offices, core.attendances, core.walkin_attendances
  to authenticated;

grant all
  on public.profiles, public.offices, core.attendances, core.walkin_attendances
  to service_role;

revoke usage on schema core from anon;
grant usage on schema core to authenticated, service_role;

alter table public.profiles           enable row level security;
alter table public.offices            enable row level security;
alter table core.attendances          enable row level security;
alter table core.walkin_attendances   enable row level security;

-- -----------------------------------------------------------------------------
-- 4. public.profiles
-- -----------------------------------------------------------------------------
create policy "profiles: read own, admin all, supervisor own office"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
    or (
      (select private.is_supervisor())
      and office_id is not null
      and office_id = (select private.user_office_id())
    )
  );

-- Self-registration rows are created by the on_auth_user_created trigger.
create policy "profiles: admin insert"
  on public.profiles for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "profiles: update own or admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create policy "profiles: admin delete others"
  on public.profiles for delete
  to authenticated
  using ((select private.is_admin()) and id <> (select auth.uid()));

-- Non-admins may only change their own name fields. Blocks self-promotion
-- (role), reactivation (status), office hopping and passcode changes.
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
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an administrator can change role, status, office, position or passcode.'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on public.profiles;
create trigger trg_guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- -----------------------------------------------------------------------------
-- 5. public.offices
-- -----------------------------------------------------------------------------
create policy "offices: authenticated read"
  on public.offices for select
  to authenticated
  using (true);

create policy "offices: admin insert"
  on public.offices for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "offices: admin update"
  on public.offices for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "offices: admin delete"
  on public.offices for delete
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- 6. core.attendances
-- -----------------------------------------------------------------------------
create policy "attendances: read own, admin all, supervisor own office"
  on core.attendances for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.is_admin())
    or private.supervises(profile_id)
  );

-- Punches are recorded through the kiosk, which runs under an admin session.
create policy "attendances: admin insert"
  on core.attendances for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "attendances: admin update"
  on core.attendances for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "attendances: admin delete"
  on core.attendances for delete
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- 7. core.walkin_attendances
-- -----------------------------------------------------------------------------
create policy "walkins: admin and supervisor read"
  on core.walkin_attendances for select
  to authenticated
  using ((select private.is_admin()) or (select private.is_supervisor()));

create policy "walkins: admin insert"
  on core.walkin_attendances for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "walkins: admin update"
  on core.walkin_attendances for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "walkins: admin delete"
  on core.walkin_attendances for delete
  to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- 8. Function privileges. Nothing below should be callable over the API.
--    (Triggers and pg_cron still run them; EXECUTE is only checked when a
--    trigger is created, and cron runs as postgres.)
-- -----------------------------------------------------------------------------
revoke execute on function core.flag_daily_absences(date)   from public, anon, authenticated;
revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.set_profile_passcode()     from public, anon, authenticated;
revoke execute on function public.guard_profile_update()     from public, anon, authenticated;
revoke execute on function core.calculate_punch_status()     from public, anon, authenticated;
