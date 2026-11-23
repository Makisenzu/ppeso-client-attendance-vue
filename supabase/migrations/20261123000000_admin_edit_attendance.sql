-- =============================================================================
-- Migration: admin_edit_attendance
-- Purpose:   Admins can correct a day's DTR punches from Attendance Records.
--            core.admin_update_attendance() sets the four punch times (Philippine time) and recomputes their
--            statuses with the same rules as core.record_punch(). The punch trigger's 5-minute cooldown is meant
--            for kiosk punches, so it is skipped for this function's update (transaction-local flag).
-- =============================================================================

-- 1. Punch trigger: skip the cooldown when the admin edit function is the caller
create or replace function core.calculate_punch_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  last_punch timestamptz;
  new_punch  timestamptz;
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('ppeso.admin_attendance_edit', true), '') <> 'on' then
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

-- 2. Admin edit of one attendance row. Times are Philippine local times on the row's date; null clears a punch.
--    A cleared punch stays 'absent' if it was absent, otherwise its status is cleared.
create or replace function core.admin_update_attendance(
  p_id      uuid,
  p_am_in   time default null,
  p_am_out  time default null,
  p_pm_in   time default null,
  p_pm_out  time default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec core.attendances%rowtype;
  to_ts constant text := 'Asia/Manila';
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can edit attendance records.' using errcode = '42501';
  end if;

  select * into rec from core.attendances a where a.id = p_id for update;
  if not found then
    raise exception 'Attendance record not found.' using errcode = 'P0002';
  end if;

  if p_am_out is not null and p_am_in is null then
    raise exception 'Morning Check-Out needs a Morning Check-In.' using errcode = '22023';
  end if;
  if p_pm_out is not null and p_pm_in is null and p_am_in is null then
    raise exception 'Afternoon Check-Out needs a check-in.' using errcode = '22023';
  end if;
  if (p_am_in is not null and p_am_out is not null and p_am_out <= p_am_in)
     or (p_am_out is not null and p_pm_in is not null and p_pm_in < p_am_out)
     or (p_am_in is not null and p_pm_in is not null and p_pm_in <= p_am_in)
     or (p_pm_in is not null and p_pm_out is not null and p_pm_out <= p_pm_in)
     or (p_am_out is not null and p_pm_out is not null and p_pm_out <= p_am_out)
     or (p_am_in is not null and p_pm_out is not null and p_pm_out <= p_am_in) then
    raise exception 'Punch times must be in order: AM in, AM out, PM in, PM out.' using errcode = '22023';
  end if;

  perform set_config('ppeso.admin_attendance_edit', 'on', true);

  -- Status rules match core.record_punch(): in by 8:00 / 1:00, out from 12:00 / 5:00
  update core.attendances a
     set recorded_by   = (select auth.uid()),
         am_check_in   = case when p_am_in  is null then null else (rec.attendance_date + p_am_in)  at time zone to_ts end,
         am_check_out  = case when p_am_out is null then null else (rec.attendance_date + p_am_out) at time zone to_ts end,
         pm_check_in   = case when p_pm_in  is null then null else (rec.attendance_date + p_pm_in)  at time zone to_ts end,
         pm_check_out  = case when p_pm_out is null then null else (rec.attendance_date + p_pm_out) at time zone to_ts end,
         am_in_status  = case when p_am_in is not null
                              then (case when p_am_in < '08:01'::time then 'ontime' else 'late' end)::core.punch_status
                              when rec.am_in_status = 'absent' then 'absent'::core.punch_status end,
         am_out_status = case when p_am_out is not null
                              then (case when p_am_out < '12:00'::time then 'early_out' else 'ontime' end)::core.punch_status
                              when rec.am_out_status = 'absent' then 'absent'::core.punch_status end,
         pm_in_status  = case when p_pm_in is not null
                              then (case when p_pm_in < '13:01'::time then 'ontime' else 'late' end)::core.punch_status
                              when rec.pm_in_status = 'absent' then 'absent'::core.punch_status end,
         pm_out_status = case when p_pm_out is not null
                              then (case when p_pm_out < '17:00'::time then 'early_out' else 'ontime' end)::core.punch_status
                              when rec.pm_out_status = 'absent' then 'absent'::core.punch_status end
   where a.id = p_id;

  perform set_config('ppeso.admin_attendance_edit', 'off', true);
end;
$$;

revoke execute on function core.admin_update_attendance(uuid, time, time, time, time) from public, anon;
grant execute on function core.admin_update_attendance(uuid, time, time, time, time) to authenticated;
