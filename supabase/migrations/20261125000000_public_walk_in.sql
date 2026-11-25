-- =============================================================================
-- public.submit_walk_in(...) — public walk-in client form (/walk-in)
--
-- Walk-in clients fill in their own details on a logged-out page. This is the ONLY thing `anon`
-- can do with walk-in data: insert one row. The function returns nothing, so it can't be used to
-- read records back, and anon still has no grants on core.walkin_attendances and no usage on core.
--
-- Exception to SECURITY.md §4.2 (no grants to anon, no unapproved SECURITY DEFINER), approved by
-- the project owner on 11/25/2026. SECURITY DEFINER (owner postgres) because anon cannot use the
-- core schema.
--
-- Abuse limits: every field is validated and length-capped, and each client IP may submit at most
-- 5 times per 10 minutes. IPs are kept only as an MD5 hash, and only for 1 day.
-- =============================================================================

create table if not exists core.walk_in_submission_log (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_walk_in_submission_log_ip
  on core.walk_in_submission_log (ip_hash, submitted_at desc);

-- Only the function touches the log.
alter table core.walk_in_submission_log enable row level security;
revoke all on core.walk_in_submission_log from anon, authenticated;
grant all on core.walk_in_submission_log to service_role;

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
  v_recent     int;
  v_firstname  text := btrim(coalesce(p_firstname, ''));
  v_middlename text := nullif(btrim(coalesce(p_middlename, '')), '');
  v_lastname   text := btrim(coalesce(p_lastname, ''));
  v_contact    text := nullif(btrim(coalesce(p_contact_number, '')), '');
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

  if v_contact is not null and v_contact !~ '^[0-9+() -]{7,20}$' then
    raise exception 'Please enter a valid contact number.' using errcode = '22023';
  end if;

  if p_gender is null or p_gender not in ('male', 'female', 'not specified') then
    raise exception 'Please choose a valid gender.' using errcode = '22023';
  end if;

  if p_purpose is null
     or p_purpose not in ('gip', 'spes', 'job_start', 'ofw', 'cea', 'skills', 'others') then
    raise exception 'Please choose a valid service.' using errcode = '22023';
  end if;

  -- Rate limit per client IP (first hop of X-Forwarded-For, as set by the Supabase gateway).
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', 'unknown'), ',', 1));
  v_ip_hash := md5(v_ip);

  delete from core.walk_in_submission_log where submitted_at < now() - interval '1 day';

  select count(*) into v_recent
  from core.walk_in_submission_log
  where ip_hash = v_ip_hash
    and submitted_at > now() - interval '10 minutes';

  if v_recent >= 5 then
    raise exception 'Too many submissions. Please wait a few minutes and try again.' using errcode = 'P0001';
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
