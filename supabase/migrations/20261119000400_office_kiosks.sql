-- =============================================================================
-- Migration: 20261119000400_office_kiosks.sql
-- Purpose:   Office kiosks — each office's PACD computer records attendance for that office's people only.
--
--   1. Kiosk accounts are profiles with role `kiosk` and an office. They have no passcode, are never flagged
--      absent, and RLS gives them nothing beyond their own profile and the shared lists (offices, holidays).
--   2. core.record_punch(passcode, mode) — the ONLY way a punch is recorded, for the admin kiosk and the office
--      kiosks alike. SECURITY DEFINER: it looks up the passcode itself and returns just the punch result and the
--      person's name, never passcodes or other profile data. An office kiosk refuses anyone from another office.
--   3. Wrong passcodes are counted per kiosk (core.kiosk_failed_attempts): 5 within 5 minutes lock that kiosk for
--      5 minutes, so 6-digit passcodes can't be guessed.
--   4. core.attendances.recorded_by — the kiosk account (or admin) that recorded the latest punch.
--   5. core.kiosk_today_punches() — today's punches for the kiosk screen (office kiosks: their office only).
--   6. core.list_kiosk_accounts() — admins: kiosk accounts with their sign-in email and last punch.
-- =============================================================================

begin;

-- ─── 1. Kiosk accounts: no passcode, never absent ──────────────────────────

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
  if new.role in ('admin'::public.profile_roles, 'supervisor'::public.profile_roles, 'kiosk'::public.profile_roles) then
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
  on conflict (profile_id, attendance_date) do update
  set am_in_status  = case when core.attendances.am_check_in  is null then 'absent'::core.punch_status else core.attendances.am_in_status  end,
      am_out_status = case when core.attendances.am_check_out is null then 'absent'::core.punch_status else core.attendances.am_out_status end,
      pm_in_status  = case when core.attendances.pm_check_in  is null then 'absent'::core.punch_status else core.attendances.pm_in_status  end,
      pm_out_status = case when core.attendances.pm_check_out is null then 'absent'::core.punch_status else core.attendances.pm_out_status end;
end;
$$;

revoke execute on function core.flag_daily_absences(date) from public, anon, authenticated;

-- Existing kiosk-role rows (none yet) lose any passcode
update public.profiles set passcode = null where role = 'kiosk'::public.profile_roles and passcode is not null;

create or replace function private.is_kiosk()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.user_role() = 'kiosk'::public.profile_roles, false)
$$;

revoke execute on function private.is_kiosk() from public, anon;
grant execute on function private.is_kiosk() to authenticated;


-- ─── 2. Who recorded a punch ────────────────────────────────────────────────

alter table core.attendances
  add column if not exists recorded_by uuid references public.profiles (id) on delete set null;

comment on column core.attendances.recorded_by is
  'The kiosk account (or admin) that recorded the latest punch of the day, set by core.record_punch().';


-- ─── 3. Failed passcode attempts (per kiosk) ───────────────────────────────

create table if not exists core.kiosk_failed_attempts (
  id           bigint generated always as identity primary key,
  kiosk_id     uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_kiosk_failed_attempts_kiosk_time
  on core.kiosk_failed_attempts (kiosk_id, attempted_at desc);

-- Only core.record_punch() (SECURITY DEFINER) reads and writes it
revoke all on core.kiosk_failed_attempts from public, anon, authenticated;
grant all on core.kiosk_failed_attempts to service_role;
alter table core.kiosk_failed_attempts enable row level security;


-- ─── 4. Record a punch ─────────────────────────────────────────────────────

create or replace function core.record_punch(p_passcode text, p_mode text default 'auto')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller        uuid := auth.uid();
  caller_role   public.profile_roles := private.user_role();
  kiosk_office  uuid;
  prof          public.profiles%rowtype;
  rec           core.attendances%rowtype;
  has_record    boolean;
  prof_found    boolean;
  now_ts        timestamptz := now();
  local_ts      timestamp := now() at time zone 'Asia/Manila';
  today         date := (now() at time zone 'Asia/Manila')::date;
  local_hour    int := extract(hour from (now() at time zone 'Asia/Manila'))::int;
  local_minutes int := extract(hour from (now() at time zone 'Asia/Manila'))::int * 60
                       + extract(minute from (now() at time zone 'Asia/Manila'))::int;
  last_punch    timestamptz;
  last_type     text;
  target        text;
  v_status      core.punch_status;
  failures      int;
begin
  if caller is null or caller_role is null
     or caller_role not in ('admin'::public.profile_roles, 'kiosk'::public.profile_roles) then
    raise exception 'This account can''t record attendance.' using errcode = '42501';
  end if;

  if caller_role = 'kiosk'::public.profile_roles then
    kiosk_office := private.user_office_id();
    if kiosk_office is null then
      raise exception 'This kiosk has no office. Ask an administrator to assign one.' using errcode = '42501';
    end if;
  end if;

  -- Lockout after repeated wrong passcodes on this kiosk
  select count(*) into failures
  from core.kiosk_failed_attempts a
  where a.kiosk_id = caller and a.attempted_at > now_ts - interval '5 minutes';
  if failures >= 5 then
    return jsonb_build_object('ok', false, 'locked', true,
      'message', 'Too many wrong passcodes. Please wait 5 minutes and try again.');
  end if;

  if p_passcode is null or p_passcode !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'message', 'Please enter a complete 6-digit passcode.');
  end if;
  if p_mode is null or p_mode not in ('auto', 'am_in', 'am_out', 'pm_in', 'pm_out') then
    p_mode := 'auto';
  end if;

  select * into prof
  from public.profiles p
  where p.passcode = p_passcode and p.status = 'active'::public.profile_status;
  prof_found := found;

  -- Unknown passcode, or (office kiosk) someone from another office: same answer, counted as a failed attempt,
  -- so a kiosk can't be used to find valid passcodes of other offices.
  if not prof_found or (kiosk_office is not null and prof.office_id is distinct from kiosk_office) then
    insert into core.kiosk_failed_attempts (kiosk_id) values (caller);
    if prof_found then
      return jsonb_build_object('ok', false,
        'message', 'You are not assigned to this office. Please record your attendance at your own office''s kiosk.');
    end if;
    return jsonb_build_object('ok', false, 'message', 'Invalid passcode or the account is inactive.');
  end if;

  select * into rec
  from core.attendances a
  where a.profile_id = prof.id and a.attendance_date = today
  for update;
  has_record := found;

  -- 5-minute cooldown after the latest punch
  if has_record then
    last_punch := greatest(rec.am_check_in, rec.am_check_out, rec.pm_check_in, rec.pm_check_out);
    if last_punch is not null and now_ts - last_punch < interval '5 minutes' then
      last_type := case last_punch
                     when rec.pm_check_out then 'pm_out'
                     when rec.pm_check_in then 'pm_in'
                     when rec.am_check_out then 'am_out'
                     else 'am_in'
                   end;
      return jsonb_build_object('ok', false, 'already_recorded', true,
        'punch_type', last_type, 'timestamp', last_punch,
        'profile', jsonb_build_object('id', prof.id, 'firstname', prof.firstname, 'middlename', prof.middlename,
                                      'lastname', prof.lastname, 'position', prof.position));
    end if;
  end if;

  -- Which punch (same rules the kiosk used before)
  if p_mode <> 'auto' then
    target := p_mode;
  elsif not has_record then
    target := case when local_hour < 12 then 'am_in' else 'pm_in' end;
  elsif rec.am_check_in is null then
    target := case when local_hour < 12 then 'am_in' when rec.pm_check_in is null then 'pm_in' else 'pm_out' end;
  elsif rec.am_check_out is null then
    target := case when local_hour < 13 then 'am_out' when rec.pm_check_in is null then 'pm_in' else 'pm_out' end;
  elsif rec.pm_check_in is null then
    target := 'pm_in';
  else
    target := 'pm_out';
  end if;

  -- Is it allowed?
  if has_record then
    if target = 'am_in' and rec.am_check_in is not null then
      return jsonb_build_object('ok', false, 'message',
        'Morning Check-In was already recorded today at ' || to_char(rec.am_check_in at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.');
    elsif target = 'am_out' and rec.am_check_out is not null then
      return jsonb_build_object('ok', false, 'message',
        'Morning Check-Out was already recorded today at ' || to_char(rec.am_check_out at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.');
    elsif target = 'am_out' and rec.am_check_in is null then
      return jsonb_build_object('ok', false, 'message', 'Cannot record Morning Check-Out without a Morning Check-In.');
    elsif target = 'pm_in' and rec.pm_check_in is not null then
      return jsonb_build_object('ok', false, 'message',
        'Afternoon Check-In was already recorded today at ' || to_char(rec.pm_check_in at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.');
    elsif target = 'pm_out' and rec.pm_check_out is not null then
      return jsonb_build_object('ok', false, 'message',
        'Afternoon Check-Out was already recorded today at ' || to_char(rec.pm_check_out at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.');
    elsif target = 'pm_out' and rec.pm_check_in is null and rec.am_check_in is null then
      return jsonb_build_object('ok', false, 'message', 'Cannot record Afternoon Check-Out without any prior check-in.');
    end if;
  elsif target = 'am_out' then
    return jsonb_build_object('ok', false, 'message', 'Cannot record Morning Check-Out without a Morning Check-In.');
  elsif target = 'pm_out' then
    return jsonb_build_object('ok', false, 'message', 'Cannot record Afternoon Check-Out without any prior check-in.');
  end if;

  -- Status, in Philippine time: in by 8:00 / 1:00, out from 12:00 / 5:00
  v_status := case target
    when 'am_in'  then case when local_minutes <= 8 * 60  then 'ontime' else 'late' end
    when 'am_out' then case when local_minutes < 12 * 60  then 'early_out' else 'ontime' end
    when 'pm_in'  then case when local_minutes <= 13 * 60 then 'ontime' else 'late' end
    else               case when local_minutes < 17 * 60  then 'early_out' else 'ontime' end
  end::core.punch_status;

  if not has_record then
    insert into core.attendances (profile_id, attendance_date, recorded_by,
                                  am_check_in, am_in_status, am_check_out, am_out_status,
                                  pm_check_in, pm_in_status, pm_check_out, pm_out_status)
    values (prof.id, today, caller,
            case when target = 'am_in'  then now_ts end, case when target = 'am_in'  then v_status end,
            case when target = 'am_out' then now_ts end, case when target = 'am_out' then v_status end,
            case when target = 'pm_in'  then now_ts end, case when target = 'pm_in'  then v_status end,
            case when target = 'pm_out' then now_ts end, case when target = 'pm_out' then v_status end);
  else
    update core.attendances a
       set recorded_by   = caller,
           am_check_in   = case when target = 'am_in'  then now_ts else a.am_check_in end,
           am_in_status  = case when target = 'am_in'  then v_status else a.am_in_status end,
           am_check_out  = case when target = 'am_out' then now_ts else a.am_check_out end,
           am_out_status = case when target = 'am_out' then v_status else a.am_out_status end,
           pm_check_in   = case when target = 'pm_in'  then now_ts else a.pm_check_in end,
           pm_in_status  = case when target = 'pm_in'  then v_status else a.pm_in_status end,
           pm_check_out  = case when target = 'pm_out' then now_ts else a.pm_check_out end,
           pm_out_status = case when target = 'pm_out' then v_status else a.pm_out_status end
     where a.id = rec.id;
  end if;

  -- A good punch clears this kiosk's failed attempts
  delete from core.kiosk_failed_attempts a where a.kiosk_id = caller;

  return jsonb_build_object('ok', true, 'punch_type', target, 'status', v_status, 'timestamp', now_ts,
    'profile', jsonb_build_object('id', prof.id, 'firstname', prof.firstname, 'middlename', prof.middlename,
                                  'lastname', prof.lastname, 'position', prof.position));
end;
$$;

revoke execute on function core.record_punch(text, text) from public, anon;
grant execute on function core.record_punch(text, text) to authenticated;


-- ─── 5. Today's punches for the kiosk screen ───────────────────────────────

create or replace function core.kiosk_today_punches()
returns table (
  attendance_id uuid,
  profile_id    uuid,
  firstname     text,
  middlename    text,
  lastname      text,
  "position"    text,
  am_check_in   timestamptz,
  am_in_status  text,
  am_check_out  timestamptz,
  am_out_status text,
  pm_check_in   timestamptz,
  pm_in_status  text,
  pm_check_out  timestamptz,
  pm_out_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role  public.profile_roles := private.user_role();
  kiosk_office uuid;
begin
  if caller_role is null or caller_role not in ('admin'::public.profile_roles, 'kiosk'::public.profile_roles) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if caller_role = 'kiosk'::public.profile_roles then
    kiosk_office := private.user_office_id();
    if kiosk_office is null then
      return;
    end if;
  end if;

  return query
  select a.id, p.id, p.firstname, p.middlename, p.lastname, p.position::text,
         a.am_check_in, a.am_in_status::text, a.am_check_out, a.am_out_status::text,
         a.pm_check_in, a.pm_in_status::text, a.pm_check_out, a.pm_out_status::text
  from core.attendances a
  join public.profiles p on p.id = a.profile_id
  where a.attendance_date = (now() at time zone 'Asia/Manila')::date
    and (a.am_check_in is not null or a.am_check_out is not null or a.pm_check_in is not null or a.pm_check_out is not null)
    and (kiosk_office is null or p.office_id = kiosk_office);
end;
$$;

revoke execute on function core.kiosk_today_punches() from public, anon;
grant execute on function core.kiosk_today_punches() to authenticated;


-- ─── 6. Admin list of kiosk accounts ───────────────────────────────────────

create or replace function core.list_kiosk_accounts()
returns table (
  id            uuid,
  label         text,
  email         text,
  office_id     uuid,
  status        text,
  created_at    timestamptz,
  last_punch_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can list kiosk accounts.' using errcode = '42501';
  end if;

  return query
  select p.id, p.firstname, u.email::text, p.office_id, p.status::text, p.created_at,
         (select max(greatest(a.am_check_in, a.am_check_out, a.pm_check_in, a.pm_check_out))
            from core.attendances a where a.recorded_by = p.id)
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.role = 'kiosk'::public.profile_roles
  order by p.created_at desc;
end;
$$;

revoke execute on function core.list_kiosk_accounts() from public, anon;
grant execute on function core.list_kiosk_accounts() to authenticated;

commit;
