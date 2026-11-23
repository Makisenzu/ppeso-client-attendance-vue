-- =============================================================================
-- Migration: special_days
-- Purpose:   Fix DTR: an admin marks a date as a special day (Office Activity, Official Business / Travel,
--            Training / Seminar, Leave) for one beneficiary or for a whole office. A special day:
--              * prints its label across the DTR row (CS Form 48) like a holiday, when there are no punches;
--              * never counts as absent: setting one clears that date's 'absent' statuses, and the daily
--                absence job skips people who have one.
--            Writes go through admin-only DEFINER functions; reads follow the attendance access model.
-- =============================================================================

begin;

-- 1. Type + table
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'core' and t.typname = 'special_day_type') then
    create type core.special_day_type as enum ('office_activity', 'official_business', 'training', 'leave');
  end if;
end;
$$;

create table if not exists core.special_days (
  id              uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  day_type        core.special_day_type not null,
  note            text check (note is null or char_length(note) <= 200),
  profile_id      uuid references public.profiles (id) on delete cascade,
  office_id       uuid references public.offices (id) on delete cascade,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint special_days_one_target check ((profile_id is null) <> (office_id is null))
);

comment on table core.special_days is
  'Special days (office activity, official business, training, leave) for one beneficiary or a whole office. Excused: never absent.';

create unique index if not exists special_days_profile_date_key
  on core.special_days (profile_id, attendance_date) where profile_id is not null;
create unique index if not exists special_days_office_date_key
  on core.special_days (office_id, attendance_date) where office_id is not null;
create index if not exists special_days_date_idx on core.special_days (attendance_date);

-- 2. Access: read like attendances (own / own office, supervisor own office, admin all); no direct writes
revoke all on core.special_days from anon, authenticated;
grant select on core.special_days to authenticated;
grant all on core.special_days to service_role;

alter table core.special_days enable row level security;

drop policy if exists "special_days: read own or own office, admin all" on core.special_days;
create policy "special_days: read own or own office, admin all"
  on core.special_days for select
  to authenticated
  using (
    (select private.is_admin())
    or profile_id = (select auth.uid())
    or (office_id is not null and office_id = (select private.user_office_id()))
    or (profile_id is not null and private.supervises(profile_id))
  );

-- 3. Admin: set (insert or replace) a special day for one beneficiary or one office
create or replace function core.admin_set_special_day(
  p_date       date,
  p_day_type   core.special_day_type,
  p_note       text default null,
  p_profile_id uuid default null,
  p_office_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can set special days.' using errcode = '42501';
  end if;
  if (p_profile_id is null) = (p_office_id is null) then
    raise exception 'Choose either the beneficiary or the office.' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'The note can be at most 200 characters.' using errcode = '22023';
  end if;

  if p_profile_id is not null then
    insert into core.special_days (attendance_date, day_type, note, profile_id, created_by)
    values (p_date, p_day_type, v_note, p_profile_id, (select auth.uid()))
    on conflict (profile_id, attendance_date) where profile_id is not null
    do update set day_type = excluded.day_type, note = excluded.note,
                  created_by = excluded.created_by, created_at = now();
  else
    insert into core.special_days (attendance_date, day_type, note, office_id, created_by)
    values (p_date, p_day_type, v_note, p_office_id, (select auth.uid()))
    on conflict (office_id, attendance_date) where office_id is not null
    do update set day_type = excluded.day_type, note = excluded.note,
                  created_by = excluded.created_by, created_at = now();
  end if;

  -- Excused: the date's 'absent' statuses go away for everyone it covers
  update core.attendances a
     set am_in_status  = case when a.am_in_status  = 'absent' then null else a.am_in_status  end,
         am_out_status = case when a.am_out_status = 'absent' then null else a.am_out_status end,
         pm_in_status  = case when a.pm_in_status  = 'absent' then null else a.pm_in_status  end,
         pm_out_status = case when a.pm_out_status = 'absent' then null else a.pm_out_status end
   where a.attendance_date = p_date
     and 'absent' in (a.am_in_status, a.am_out_status, a.pm_in_status, a.pm_out_status)
     and (a.profile_id = p_profile_id
          or a.profile_id in (select p.id from public.profiles p where p.office_id = p_office_id));
end;
$$;

-- 4. Admin: remove a special day
create or replace function core.admin_delete_special_day(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can remove special days.' using errcode = '42501';
  end if;
  delete from core.special_days s where s.id = p_id;
end;
$$;

revoke execute on function core.admin_set_special_day(date, core.special_day_type, text, uuid, uuid) from public, anon;
grant execute on function core.admin_set_special_day(date, core.special_day_type, text, uuid, uuid) to authenticated;
revoke execute on function core.admin_delete_special_day(uuid) from public, anon;
grant execute on function core.admin_delete_special_day(uuid) to authenticated;

-- 5. One person's special days in a date range (theirs and their office's), as the caller may see them (RLS)
create or replace function core.get_special_days(p_profile_id uuid, p_start date, p_end date)
returns table (id uuid, attendance_date date, day_type core.special_day_type, note text, is_office boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.attendance_date, s.day_type, s.note, s.office_id is not null
    from core.special_days s
   where s.attendance_date between p_start and p_end
     and (s.profile_id = p_profile_id
          or s.office_id = (select p.office_id from public.profiles p where p.id = p_profile_id))
   order by s.attendance_date, (s.office_id is not null);
$$;

revoke execute on function core.get_special_days(uuid, date, date) from public, anon;
grant execute on function core.get_special_days(uuid, date, date) to authenticated;

-- 6. Daily absence job: skip anyone with a special day (their own or their office's)
create or replace function core.flag_daily_absences(target_date date default current_date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.holidays h where h.holiday_date = target_date) then
    return;
  end if;

  insert into core.attendances (profile_id, attendance_date, am_in_status, am_out_status, pm_in_status, pm_out_status)
  select p.id, target_date, 'absent', 'absent', 'absent', 'absent'
  from public.profiles p
  where p.status = 'active'::public.profile_status
    and p.position <> 'client'::public.profile_position
    and (p.role is null
         or p.role not in ('admin'::public.profile_roles, 'supervisor'::public.profile_roles, 'kiosk'::public.profile_roles))
    and not exists (
      select 1 from core.special_days s
       where s.attendance_date = target_date
         and (s.profile_id = p.id or (p.office_id is not null and s.office_id = p.office_id))
    )
  on conflict (profile_id, attendance_date) do update
  set am_in_status  = case when core.attendances.am_check_in  is null then 'absent'::core.punch_status else core.attendances.am_in_status  end,
      am_out_status = case when core.attendances.am_check_out is null then 'absent'::core.punch_status else core.attendances.am_out_status end,
      pm_in_status  = case when core.attendances.pm_check_in  is null then 'absent'::core.punch_status else core.attendances.pm_in_status  end,
      pm_out_status = case when core.attendances.pm_check_out is null then 'absent'::core.punch_status else core.attendances.pm_out_status end;
end;
$$;

revoke execute on function core.flag_daily_absences(date) from public, anon, authenticated;

commit;
