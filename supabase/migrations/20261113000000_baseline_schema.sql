-- =============================================================================
-- Baseline schema for ppeso-client-attendance
--
-- Captures the schema that already exists on the live project so it lives in
-- version control. Every statement is idempotent: it is safe to run against
-- the existing database (no data is dropped) and against a fresh database.
-- RLS policies and grants live in the next migration.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists core;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'profile_position') then
    create type public.profile_position as enum ('employee', 'gip', 'tupad', 'client');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'profile_roles') then
    create type public.profile_roles as enum ('admin', 'beneficiary', 'supervisor');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'profile_status') then
    create type public.profile_status as enum ('active', 'inactive', 'pending');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'core' and t.typname = 'gender_type') then
    create type core.gender_type as enum ('male', 'female', 'not specified');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'core' and t.typname = 'punch_status') then
    create type core.punch_status as enum ('ontime', 'late', 'early_out', 'absent');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'core' and t.typname = 'service_required') then
    create type core.service_required as enum ('gip', 'spes', 'job_start', 'ofw', 'cea', 'skills', 'others');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- public.offices
-- -----------------------------------------------------------------------------
create table if not exists public.offices (
  id         uuid primary key default gen_random_uuid(),
  code       text unique,
  name       text not null,
  is_active  boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- public.profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  firstname  text not null,
  middlename text,
  lastname   text not null,
  passcode   text not null unique,
  status     public.profile_status not null default 'active',
  position   public.profile_position not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  role       public.profile_roles default 'beneficiary',
  office_id  uuid references public.offices (id) on delete set null
);

create index if not exists idx_profiles_office_id on public.profiles (office_id);

-- -----------------------------------------------------------------------------
-- core.attendances (one row per profile per day)
-- -----------------------------------------------------------------------------
create table if not exists core.attendances (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  attendance_date date not null default current_date,
  am_check_in     timestamptz,
  am_in_status    core.punch_status,
  am_check_out    timestamptz,
  am_out_status   core.punch_status,
  pm_check_in     timestamptz,
  pm_in_status    core.punch_status,
  pm_check_out    timestamptz,
  pm_out_status   core.punch_status,
  created_at      timestamptz not null default now(),
  constraint unique_daily_attendance unique (profile_id, attendance_date)
);

create index if not exists idx_attendances_date on core.attendances (attendance_date);

-- -----------------------------------------------------------------------------
-- core.walkin_attendances (walk-in client log)
-- -----------------------------------------------------------------------------
create table if not exists core.walkin_attendances (
  id             uuid primary key default gen_random_uuid(),
  firstname      text not null,
  middlename     text,
  lastname       text not null,
  gender         core.gender_type not null default 'not specified',
  contact_number text,
  province       text not null,
  geographic     text not null,
  barangay       text not null,
  purok          text not null,
  purpose        core.service_required not null default 'others',
  check_in       timestamptz not null default now(),
  check_out      timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_walkin_check_in on core.walkin_attendances (check_in desc);
create index if not exists idx_walkin_purpose  on core.walkin_attendances (purpose);

-- Redundant with the unique constraint profiles_passcode_key.
drop index if exists public.idx_profiles_passcode;

-- -----------------------------------------------------------------------------
-- Functions & triggers
-- -----------------------------------------------------------------------------

-- Generates a unique 6-digit passcode when none is supplied.
create or replace function public.set_profile_passcode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code    text;
  code_exists boolean;
begin
  if new.passcode is null then
    loop
      new_code := lpad(floor(random() * 1000000)::text, 6, '0');
      select exists (select 1 from public.profiles where passcode = new_code) into code_exists;
      exit when not code_exists;
    end loop;
    new.passcode := new_code;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_set_profile_passcode on public.profiles;
create trigger trigger_set_profile_passcode
  before insert on public.profiles
  for each row execute function public.set_profile_passcode();

-- Creates the profile row for every new auth user. Role is never read from
-- user metadata (which the client controls); it always starts as the column
-- default and only an admin can change it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_position public.profile_position;
begin
  begin
    parsed_position := (new.raw_user_meta_data ->> 'position')::public.profile_position;
  exception when others then
    parsed_position := 'employee'::public.profile_position;
  end;

  insert into public.profiles (id, firstname, middlename, lastname, position)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'firstname', ''), 'User'),
    nullif(new.raw_user_meta_data ->> 'middlename', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'lastname', ''), 'Name'),
    coalesce(parsed_position, 'employee'::public.profile_position)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enforces the 5-minute cooldown and fills in punch statuses left null.
create or replace function core.calculate_punch_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  last_punch timestamptz;
  new_punch  timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.am_check_in is distinct from old.am_check_in then
      new_punch := new.am_check_in;
    elsif new.am_check_out is distinct from old.am_check_out then
      new_punch := new.am_check_out;
    elsif new.pm_check_in is distinct from old.pm_check_in then
      new_punch := new.pm_check_in;
    elsif new.pm_check_out is distinct from old.pm_check_out then
      new_punch := new.pm_check_out;
    end if;

    last_punch := greatest(old.am_check_in, old.am_check_out, old.pm_check_in, old.pm_check_out);

    if last_punch is not null and new_punch is not null
       and new_punch < last_punch + interval '5 minutes' then
      raise exception 'Already Recorded';
    end if;
  end if;

  if new.am_check_in is not null and new.am_in_status is null then
    new.am_in_status := case when new.am_check_in::time < '08:00:00'::time
                             then 'ontime' else 'late' end::core.punch_status;
  end if;

  if new.am_check_out is not null and new.am_out_status is null then
    new.am_out_status := case when new.am_check_out::time >= '12:00:00'::time
                              then 'ontime' else 'early_out' end::core.punch_status;
  end if;

  if new.pm_check_in is not null and new.pm_in_status is null then
    new.pm_in_status := case when new.pm_check_in::time < '13:00:00'::time
                             then 'ontime' else 'late' end::core.punch_status;
  end if;

  if new.pm_check_out is not null and new.pm_out_status is null then
    new.pm_out_status := case when new.pm_check_out::time >= '17:00:00'::time
                              then 'ontime' else 'early_out' end::core.punch_status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_calculate_punch_status on core.attendances;
create trigger trg_calculate_punch_status
  before insert or update on core.attendances
  for each row execute function core.calculate_punch_status();

-- Marks missing punches as 'absent' for active, non-client profiles.
-- Run by pg_cron (job: auto-flag-daily-absences).
create or replace function core.flag_daily_absences(target_date date default current_date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into core.attendances (profile_id, attendance_date, am_in_status, am_out_status, pm_in_status, pm_out_status)
  select p.id, target_date, 'absent', 'absent', 'absent', 'absent'
  from public.profiles p
  where p.status = 'active'::public.profile_status
    and p.position <> 'client'::public.profile_position
  on conflict (profile_id, attendance_date) do update
  set am_in_status  = case when core.attendances.am_check_in  is null then 'absent'::core.punch_status else core.attendances.am_in_status  end,
      am_out_status = case when core.attendances.am_check_out is null then 'absent'::core.punch_status else core.attendances.am_out_status end,
      pm_in_status  = case when core.attendances.pm_check_in  is null then 'absent'::core.punch_status else core.attendances.pm_in_status  end,
      pm_out_status = case when core.attendances.pm_check_out is null then 'absent'::core.punch_status else core.attendances.pm_out_status end;
end;
$$;
