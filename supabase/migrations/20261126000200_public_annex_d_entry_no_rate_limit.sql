-- =============================================================================
-- Migration: 20261126000200_public_annex_d_entry_no_rate_limit.sql
-- Purpose:   Removes the rate limits from public.submit_annex_d_entry (requested by the user 11/26/2026: staff
--            encode in bulk from one office). Same signature and grants; validation and the duplicate-beneficiary
--            check stay. core.annex_d_submission_log (IP hashes only) is no longer used and is dropped.
-- =============================================================================

begin;

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

drop table if exists core.annex_d_submission_log;

commit;
