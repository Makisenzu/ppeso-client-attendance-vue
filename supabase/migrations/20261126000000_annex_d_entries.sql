-- =============================================================================
-- Migration: 20261126000000_annex_d_entries.sql
-- Purpose:   Data Entry — the admin page where PESO staff encode TUPAD beneficiary profiles gathered on paper, so
--            the office can generate DOLE's "Profile of TUPAD Beneficiaries" (ANNEX D) as an Excel file.
--
--   1. core.annex_d_entries — one row per beneficiary, one column per ANNEX D field.
--      "No." and "Age" are not stored: the export numbers the rows and computes age from the birthdate.
--   2. core.touch_annex_d_entry() — trims text, blanks → null, rejects future birthdates, keeps the creator.
--   3. Access: admins only (read, add, edit, delete). No other role, and nothing for anon.
--
-- Privacy (PRIVACY.md §2): birthdate, civil status, ID number, beneficiary type (PWD / IP / former rebel …) and
-- income are sensitive personal information. They are collected because DOLE requires the ANNEX D profile for every
-- TUPAD beneficiary (lawful basis: the TUPAD program guidelines). Admin-only, never logged, exported only by admins.
-- =============================================================================

begin;

-- ─── 1. Table ───────────────────────────────────────────────────────────────

create table if not exists core.annex_d_entries (
  id                        uuid primary key default gen_random_uuid(),

  -- Name of Beneficiary
  lastname                  text not null check (char_length(lastname) between 1 and 100),
  firstname                 text not null check (char_length(firstname) between 1 and 100),
  middlename                text check (middlename is null or char_length(middlename) <= 100),
  extension_name            text check (extension_name is null or char_length(extension_name) <= 10),

  birthdate                 date not null check (birthdate >= date '1900-01-01'),

  -- Project Location
  barangay                  text not null check (char_length(barangay) between 1 and 100),
  municipality              text not null check (char_length(municipality) between 1 and 100),
  province                  text not null check (char_length(province) between 1 and 100),
  district                  text check (district is null or char_length(district) <= 30),

  id_type                   text check (id_type is null or char_length(id_type) <= 100),
  id_number                 text check (id_number is null or char_length(id_number) <= 50),
  -- Digits only, 11-digit mobile number (same rule as walk-in contact numbers)
  contact_number            text check (contact_number is null or contact_number ~ '^09[0-9]{9}$'),
  epayment_account          text check (epayment_account is null or char_length(epayment_account) <= 50),

  beneficiary_type          text not null check (beneficiary_type in (
                              'underemployed_self_employed', 'displaced', 'pwd', 'indigenous_people',
                              'former_rebel', 'former_violent_extremist', 'parent_malnourished_child',
                              'senior_citizen'
                            )),
  occupation                text check (occupation is null or char_length(occupation) <= 150),
  sex                       text not null check (sex in ('male', 'female')),
  civil_status              text check (civil_status is null or civil_status in (
                              'single', 'married', 'divorced', 'separated', 'widowed'
                            )),
  average_monthly_income    numeric(12, 2) check (average_monthly_income is null or average_monthly_income >= 0),
  -- Name of the beneficiary of the micro-insurance policy holder
  dependent                 text check (dependent is null or char_length(dependent) <= 150),
  interested_in_employment  boolean,
  skills_training_needed    text check (skills_training_needed is null or char_length(skills_training_needed) <= 200),

  created_by                uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_annex_d_entries_name on core.annex_d_entries (lastname, firstname);
create index if not exists idx_annex_d_entries_municipality on core.annex_d_entries (municipality);
create index if not exists idx_annex_d_entries_type on core.annex_d_entries (beneficiary_type);
create index if not exists idx_annex_d_entries_created_by on core.annex_d_entries (created_by);


-- ─── 2. Normalise + guard trigger ──────────────────────────────────────────

create or replace function core.touch_annex_d_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lastname := btrim(new.lastname);
  new.firstname := btrim(new.firstname);
  new.middlename := nullif(btrim(coalesce(new.middlename, '')), '');
  new.extension_name := nullif(btrim(coalesce(new.extension_name, '')), '');
  new.barangay := btrim(new.barangay);
  new.municipality := btrim(new.municipality);
  new.province := btrim(new.province);
  new.district := nullif(btrim(coalesce(new.district, '')), '');
  new.id_type := nullif(btrim(coalesce(new.id_type, '')), '');
  new.id_number := nullif(btrim(coalesce(new.id_number, '')), '');
  new.contact_number := nullif(regexp_replace(coalesce(new.contact_number, ''), '[^0-9]', '', 'g'), '');
  new.epayment_account := nullif(btrim(coalesce(new.epayment_account, '')), '');
  new.occupation := nullif(btrim(coalesce(new.occupation, '')), '');
  new.dependent := nullif(btrim(coalesce(new.dependent, '')), '');
  new.skills_training_needed := nullif(btrim(coalesce(new.skills_training_needed, '')), '');

  if new.birthdate > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Birthdate cannot be in the future.' using errcode = '22007';
  end if;

  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function core.touch_annex_d_entry() from public, anon, authenticated;

drop trigger if exists trg_touch_annex_d_entry on core.annex_d_entries;
create trigger trg_touch_annex_d_entry
  before insert or update on core.annex_d_entries
  for each row execute function core.touch_annex_d_entry();


-- ─── 3. Grants + RLS (admins only) ─────────────────────────────────────────

revoke all on core.annex_d_entries from public, anon;
grant select, insert, update, delete on core.annex_d_entries to authenticated;
grant all on core.annex_d_entries to service_role;

alter table core.annex_d_entries enable row level security;

drop policy if exists "annex_d_entries: admin all" on core.annex_d_entries;
create policy "annex_d_entries: admin all"
  on core.annex_d_entries for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

commit;
