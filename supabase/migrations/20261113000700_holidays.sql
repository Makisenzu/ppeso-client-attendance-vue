-- =============================================================================
-- public.holidays — dates set by admins on the Calendar page.
--
-- * Shown on Civil Service Form 48 DTRs (the day's row prints the holiday name).
-- * core.flag_daily_absences() skips holidays, so nobody is marked absent on one.
--
-- Access: every signed-in user can read (DTRs for any role); only active admins write.
-- =============================================================================

create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name         text not null check (length(btrim(name)) > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

revoke all on public.holidays from anon, authenticated;
grant select, insert, update, delete on public.holidays to authenticated;
grant all on public.holidays to service_role;

alter table public.holidays enable row level security;

drop policy if exists "holidays: authenticated read" on public.holidays;
create policy "holidays: authenticated read"
  on public.holidays for select
  to authenticated
  using (true);

drop policy if exists "holidays: admin insert" on public.holidays;
create policy "holidays: admin insert"
  on public.holidays for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "holidays: admin update" on public.holidays;
create policy "holidays: admin update"
  on public.holidays for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "holidays: admin delete" on public.holidays;
create policy "holidays: admin delete"
  on public.holidays for delete
  to authenticated
  using ((select private.is_admin()));

-- Keep updated_at current.
create or replace function public.touch_holiday_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_holiday_updated_at() from public, anon, authenticated;

drop trigger if exists trg_touch_holiday_updated_at on public.holidays;
create trigger trg_touch_holiday_updated_at
  before update on public.holidays
  for each row execute function public.touch_holiday_updated_at();

-- -----------------------------------------------------------------------------
-- Absence flagging: do nothing on a holiday.
-- -----------------------------------------------------------------------------
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
  on conflict (profile_id, attendance_date) do update
  set am_in_status  = case when core.attendances.am_check_in  is null then 'absent'::core.punch_status else core.attendances.am_in_status  end,
      am_out_status = case when core.attendances.am_check_out is null then 'absent'::core.punch_status else core.attendances.am_out_status end,
      pm_in_status  = case when core.attendances.pm_check_in  is null then 'absent'::core.punch_status else core.attendances.pm_in_status  end,
      pm_out_status = case when core.attendances.pm_check_out is null then 'absent'::core.punch_status else core.attendances.pm_out_status end;
end;
$$;

revoke execute on function core.flag_daily_absences(date) from public, anon, authenticated;
