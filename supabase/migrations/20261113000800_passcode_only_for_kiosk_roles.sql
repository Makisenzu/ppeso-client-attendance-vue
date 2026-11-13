-- =============================================================================
-- Admins and supervisors have no kiosk passcode.
--
-- * profiles.passcode becomes nullable (UNIQUE still applies to the non-null values).
-- * set_profile_passcode() now runs on INSERT and on role changes:
--     role admin / supervisor  → passcode cleared
--     any other role           → a unique 6-digit passcode, generated if missing
-- * Existing admins / supervisors lose their passcode.
-- * flag_daily_absences() skips admins and supervisors (they never punch in).
-- =============================================================================

alter table public.profiles alter column passcode drop not null;

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
  if new.role in ('admin'::public.profile_roles, 'supervisor'::public.profile_roles) then
    new.passcode := null;
    return new;
  end if;

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

revoke execute on function public.set_profile_passcode() from public, anon, authenticated;

-- Fires on insert and whenever role (or passcode) is set. Name sorts after trg_guard_profile_update,
-- so the guard still compares the caller's own values first.
drop trigger if exists trigger_set_profile_passcode on public.profiles;
create trigger trigger_set_profile_passcode
  before insert or update of role, passcode on public.profiles
  for each row execute function public.set_profile_passcode();

-- Existing admins and supervisors: remove their passcodes.
update public.profiles
set passcode = null
where role in ('admin'::public.profile_roles, 'supervisor'::public.profile_roles)
  and passcode is not null;

-- Absence flagging: holidays off (migration 0700) and only people who use the kiosk.
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
    and (p.role is null or p.role not in ('admin'::public.profile_roles, 'supervisor'::public.profile_roles))
  on conflict (profile_id, attendance_date) do update
  set am_in_status  = case when core.attendances.am_check_in  is null then 'absent'::core.punch_status else core.attendances.am_in_status  end,
      am_out_status = case when core.attendances.am_check_out is null then 'absent'::core.punch_status else core.attendances.am_out_status end,
      pm_in_status  = case when core.attendances.pm_check_in  is null then 'absent'::core.punch_status else core.attendances.pm_in_status  end,
      pm_out_status = case when core.attendances.pm_check_out is null then 'absent'::core.punch_status else core.attendances.pm_out_status end;
end;
$$;

revoke execute on function core.flag_daily_absences(date) from public, anon, authenticated;
