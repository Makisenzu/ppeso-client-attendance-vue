-- =============================================================================
-- public.submit_walk_in — contact number in the 4-3-4 format
--
-- Replaces the function from 20261125000100_walk_in_rate_limits.sql (same signature, rate limits and
-- grants). The contact number, when given, must be an 11-digit mobile number starting with 09
-- (`0912 345 6789`); spaces and dashes are stripped and only the digits are stored.
-- Also renames the "gender" message to "sex", matching the public form.
-- =============================================================================

create or replace function public.submit_walk_in(
  p_firstname      text,
  p_middlename     text,
  p_lastname       text,
  p_gender         text,
  p_contact_number text,
  p_province       text,
  p_geographic     text,
  p_barangay       text,
  p_purok          text,
  p_purpose        text,
  p_consent        boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_headers    json;
  v_ip         text;
  v_ip_hash    text;
  v_count      int;
  v_firstname  text := btrim(coalesce(p_firstname, ''));
  v_middlename text := nullif(btrim(coalesce(p_middlename, '')), '');
  v_lastname   text := btrim(coalesce(p_lastname, ''));
  -- Stored as digits only (e.g. 09123456789); the apps format it for display.
  v_contact    text := nullif(regexp_replace(coalesce(p_contact_number, ''), '[^0-9]', '', 'g'), '');
  v_province   text := btrim(coalesce(p_province, ''));
  v_geographic text := btrim(coalesce(p_geographic, ''));
  v_barangay   text := btrim(coalesce(p_barangay, ''));
  v_purok      text := btrim(coalesce(p_purok, ''));
begin
  -- Consent to the privacy notice (RA 10173) is required.
  if p_consent is distinct from true then
    raise exception 'Please agree to the privacy notice before submitting.' using errcode = '22023';
  end if;

  -- Required fields and length caps.
  if v_firstname = '' or v_lastname = '' or v_province = '' or v_geographic = ''
     or v_barangay = '' or v_purok = '' then
    raise exception 'Please fill in all required fields.' using errcode = '22023';
  end if;

  if length(v_firstname) > 80 or length(v_lastname) > 80 or length(coalesce(v_middlename, '')) > 80
     or length(v_province) > 120 or length(v_geographic) > 120 or length(v_barangay) > 120
     or length(v_purok) > 160 then
    raise exception 'One of the fields is too long.' using errcode = '22023';
  end if;

  if v_contact is not null and v_contact !~ '^09[0-9]{9}$' then
    raise exception 'Contact number must be 11 digits, like 0912 345 6789.' using errcode = '22023';
  end if;

  if p_gender is null or p_gender not in ('male', 'female') then
    raise exception 'Please select your sex.' using errcode = '22023';
  end if;

  if p_purpose is null
     or p_purpose not in ('gip', 'spes', 'job_start', 'ofw', 'cea', 'skills', 'others') then
    raise exception 'Please choose a valid service.' using errcode = '22023';
  end if;

  -- Client IP (first hop of X-Forwarded-For, as set by the Supabase gateway), hashed.
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', 'unknown'), ',', 1));
  v_ip_hash := md5(v_ip);

  delete from core.walk_in_submission_log where submitted_at < now() - interval '1 day';

  -- 1. Per IP: 5 per 10 minutes, 20 per day.
  select count(*) into v_count
  from core.walk_in_submission_log
  where ip_hash = v_ip_hash and submitted_at > now() - interval '10 minutes';
  if v_count >= 5 then
    raise exception 'Too many submissions from this device. Please wait a few minutes and try again.'
      using errcode = 'PT429';
  end if;

  select count(*) into v_count
  from core.walk_in_submission_log
  where ip_hash = v_ip_hash;
  if v_count >= 20 then
    raise exception 'This device has reached today''s submission limit. Please ask the PESO staff for help.'
      using errcode = 'PT429';
  end if;

  -- 2. Whole form: 30 per minute.
  select count(*) into v_count
  from core.walk_in_submission_log
  where submitted_at > now() - interval '1 minute';
  if v_count >= 30 then
    raise exception 'The form is busy right now. Please try again in a minute.' using errcode = 'PT429';
  end if;

  -- 3. Same person again within 30 minutes.
  if exists (
    select 1 from core.walkin_attendances w
    where w.check_in > now() - interval '30 minutes'
      and lower(w.firstname) = lower(v_firstname)
      and lower(w.lastname)  = lower(v_lastname)
  ) then
    raise exception 'Your visit is already logged. Please wait for a PESO staff member to assist you.'
      using errcode = 'PT429';
  end if;

  insert into core.walk_in_submission_log (ip_hash) values (v_ip_hash);

  insert into core.walkin_attendances (
    firstname, middlename, lastname, gender, contact_number,
    province, geographic, barangay, purok, purpose
  ) values (
    v_firstname, v_middlename, v_lastname, p_gender::core.gender_type, v_contact,
    v_province, v_geographic, v_barangay, v_purok, p_purpose::core.service_required
  );
end;
$$;

revoke execute on function public.submit_walk_in(
  text, text, text, text, text, text, text, text, text, text, boolean
) from public;
grant execute on function public.submit_walk_in(
  text, text, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;
