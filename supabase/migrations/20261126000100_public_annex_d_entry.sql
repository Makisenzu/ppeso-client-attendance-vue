-- =============================================================================
-- Migration: 20261126000100_public_annex_d_entry.sql
-- Purpose:   Public Data Entry form (/data-entry) — PESO staff encode TUPAD beneficiary profiles (ANNEX D)
--            without signing in, several people at the same time. Same model as the public walk-in form
--            (20261125000000 / 0100): an INSERT-ONLY SECURITY DEFINER function, nothing is ever read back.
--
--   1. core.annex_d_entries.source — 'admin' (Data Entry page) or 'public_form' (this form), for review.
--   2. One row per beneficiary: unique (last, first, middle name, birthdate), case-insensitive. Also stops two
--      people encoding the same beneficiary at the same moment.
--   3. core.annex_d_submission_log — MD5 IP hashes, kept 1 day, for rate limits.
--   4. public.submit_annex_d_entry(...) — validates, rate-limits, inserts. anon + authenticated may execute.
--
-- Rate limits (errcode PT429 → HTTP 429). Staff in one office share one public IP, so they are higher than the
-- walk-in form's: per IP 200 per 10 minutes and 2,000 per day; whole form 60 per minute.
--
-- Security (SECURITY.md §4.3 rule 4 exception, approved by the user 11/26/2026): anon still has no table grants
-- and no `core` usage. The function returns nothing, so the form can't be used to read or check records.
-- =============================================================================

begin;

-- ─── 1. Source ──────────────────────────────────────────────────────────────

alter table core.annex_d_entries
  add column if not exists source text not null default 'admin'
  check (source in ('admin', 'public_form'));

-- ─── 2. One row per beneficiary ────────────────────────────────────────────

create unique index if not exists uq_annex_d_entries_person
  on core.annex_d_entries (lower(lastname), lower(firstname), lower(coalesce(middlename, '')), birthdate);

-- ─── 3. Rate-limit log ─────────────────────────────────────────────────────

create table if not exists core.annex_d_submission_log (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_annex_d_submission_log_ip on core.annex_d_submission_log (ip_hash, submitted_at desc);
create index if not exists idx_annex_d_submission_log_time on core.annex_d_submission_log (submitted_at desc);

revoke all on core.annex_d_submission_log from public, anon, authenticated;
grant all on core.annex_d_submission_log to service_role;
alter table core.annex_d_submission_log enable row level security;
-- No policies: only the DEFINER function below touches it.

-- ─── 4. Insert-only RPC ────────────────────────────────────────────────────

create or replace function public.submit_annex_d_entry(
  p_lastname                 text,
  p_firstname                text,
  p_middlename               text,
  p_extension_name           text,
  p_birthdate                date,
  p_barangay                 text,
  p_municipality             text,
  p_province                 text,
  p_district                 text,
  p_id_type                  text,
  p_id_number                text,
  p_contact_number           text,
  p_epayment_account         text,
  p_beneficiary_type         text,
  p_occupation               text,
  p_sex                      text,
  p_civil_status             text,
  p_average_monthly_income   numeric,
  p_dependent                text,
  p_interested_in_employment boolean,
  p_skills_training_needed   text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_headers json;
  v_ip      text;
  v_ip_hash text;
  v_count   int;
begin
  -- Required fields (the table's CHECK constraints and trigger enforce the rest)
  if btrim(coalesce(p_lastname, '')) = '' or btrim(coalesce(p_firstname, '')) = '' or p_birthdate is null
     or btrim(coalesce(p_barangay, '')) = '' or btrim(coalesce(p_municipality, '')) = ''
     or btrim(coalesce(p_province, '')) = '' then
    raise exception 'Please fill in all required fields.' using errcode = '22023';
  end if;

  if p_sex is null or p_sex not in ('male', 'female') then
    raise exception 'Please select the sex.' using errcode = '22023';
  end if;

  if p_beneficiary_type is null or p_beneficiary_type not in (
    'underemployed_self_employed', 'displaced', 'pwd', 'indigenous_people', 'former_rebel',
    'former_violent_extremist', 'parent_malnourished_child', 'senior_citizen'
  ) then
    raise exception 'Please select the type of beneficiary.' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_civil_status, '')), '') is not null
     and p_civil_status not in ('single', 'married', 'divorced', 'separated', 'widowed') then
    raise exception 'Please select a valid civil status.' using errcode = '22023';
  end if;

  -- Client IP (first hop of X-Forwarded-For, as set by the Supabase gateway), hashed
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', 'unknown'), ',', 1));
  v_ip_hash := md5(v_ip);

  delete from core.annex_d_submission_log where submitted_at < now() - interval '1 day';

  select count(*) into v_count from core.annex_d_submission_log
  where ip_hash = v_ip_hash and submitted_at > now() - interval '10 minutes';
  if v_count >= 200 then
    raise exception 'Too many entries from this network. Please wait a few minutes and try again.' using errcode = 'PT429';
  end if;

  select count(*) into v_count from core.annex_d_submission_log where ip_hash = v_ip_hash;
  if v_count >= 2000 then
    raise exception 'This network has reached today''s entry limit. Please ask a PESO administrator.' using errcode = 'PT429';
  end if;

  select count(*) into v_count from core.annex_d_submission_log where submitted_at > now() - interval '1 minute';
  if v_count >= 60 then
    raise exception 'The form is busy right now. Please try again in a minute.' using errcode = 'PT429';
  end if;

  begin
    insert into core.annex_d_entries (
      lastname, firstname, middlename, extension_name, birthdate, barangay, municipality, province, district,
      id_type, id_number, contact_number, epayment_account, beneficiary_type, occupation, sex, civil_status,
      average_monthly_income, dependent, interested_in_employment, skills_training_needed, source, created_by
    ) values (
      btrim(p_lastname), btrim(p_firstname), p_middlename, p_extension_name, p_birthdate, btrim(p_barangay),
      btrim(p_municipality), btrim(p_province), p_district, p_id_type, p_id_number, p_contact_number,
      p_epayment_account, p_beneficiary_type, p_occupation, p_sex, nullif(btrim(coalesce(p_civil_status, '')), ''),
      p_average_monthly_income, p_dependent, p_interested_in_employment, p_skills_training_needed,
      'public_form', null
    );
  exception
    when unique_violation then
      raise exception 'This beneficiary is already encoded (same name and birthdate).' using errcode = '23505';
    when check_violation then
      raise exception 'Some details are not valid. Check the form and try again.' using errcode = '22023';
  end;

  insert into core.annex_d_submission_log (ip_hash) values (v_ip_hash);
end;
$$;

revoke execute on function public.submit_annex_d_entry(
  text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, boolean, text
) from public;
grant execute on function public.submit_annex_d_entry(
  text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, text, boolean, text
) to anon, authenticated;

commit;
