-- =============================================================================
-- Migration: admin_set_attendance
-- Purpose:   Fix DTR (Attendance Records → Fix): admins correct a beneficiary's punches for any past or current date,
--            including a day with no attendance row yet. core.admin_set_attendance() creates the row when needed
--            and then applies core.admin_update_attendance() (same order checks, Philippine time, status rules).
-- =============================================================================

create or replace function core.admin_set_attendance(
  p_profile_id uuid,
  p_date       date,
  p_am_in      time default null,
  p_am_out     time default null,
  p_pm_in      time default null,
  p_pm_out     time default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can fix attendance records.' using errcode = '42501';
  end if;

  if p_date > (now() at time zone 'Asia/Manila')::date then
    raise exception 'A future date cannot be fixed.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_profile_id) then
    raise exception 'Beneficiary not found.' using errcode = 'P0002';
  end if;

  select a.id into v_id
    from core.attendances a
   where a.profile_id = p_profile_id and a.attendance_date = p_date;

  if v_id is null then
    -- Nothing to record on an empty day
    if p_am_in is null and p_am_out is null and p_pm_in is null and p_pm_out is null then
      return;
    end if;
    insert into core.attendances (profile_id, attendance_date, recorded_by)
    values (p_profile_id, p_date, (select auth.uid()))
    returning id into v_id;
  end if;

  perform core.admin_update_attendance(v_id, p_am_in, p_am_out, p_pm_in, p_pm_out);
end;
$$;

revoke execute on function core.admin_set_attendance(uuid, date, time, time, time, time) from public, anon;
grant execute on function core.admin_set_attendance(uuid, date, time, time, time, time) to authenticated;
