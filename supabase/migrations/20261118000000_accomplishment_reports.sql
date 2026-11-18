-- =============================================================================
-- Migration: 20261118000000_accomplishment_reports.sql
-- Purpose:   GIP / TUPAD beneficiaries write accomplishment reports for a date range, save them as a Draft or
--            submit them, and print them on their funding's form. Admins (all) and supervisors (their own office)
--            review them: Reviewed, or Returned with remarks. Ported from vue-agsurjobs (migrations 112 / 114 / 115).
--
--   1. public.profiles.funding — 'DOLE' or 'PGAS' (NULL until an admin sets it). It decides the report form:
--        DOLE — GIP Work Accomplishment Report: what was done on every weekday of the dates (Worked / Holiday / Leave)
--        PGAS — Accomplishment Report: Activities / Output / Remarks rows + Acknowledgement Receipt of Payment
--               (amount in figures and in words). Daily entries are optional.
--      Only admins may change it (trg_guard_profile_update).
--   2. core.accomplishment_reports — one row per report; reports of one person never overlap.
--   3. core.check_accomplishment_report() — BEFORE INSERT/UPDATE trigger (SECURITY INVOKER, no new DEFINER
--      function): the owner writes the report (funding copied from their profile, entries validated, submit rules);
--      a reviewer may only change status and remarks. Review stamps are set here.
--   4. RLS: owner reads / writes / deletes their own (not once Reviewed); admin all; supervisor reads and reviews
--      reports of people in their office.
--
-- Status flow: Draft --submit--> Submitted --review--> Reviewed
--                                Submitted --review--> Returned --edit + submit--> Submitted
--              (saving a Returned report keeps it Returned; a reviewer can undo a review back to Submitted)
--
-- daily_entries: JSONB array of { "date": "YYYY-MM-DD", "status": "Worked" | "Holiday" | "Leave", "entry": text|null }
-- activities:    JSONB array of { "activity": text, "output": text|null, "remarks": text|null }   (PGAS only)
--
-- Privacy (PRIVACY.md §2): the reports describe the beneficiary's work and pay; they cascade with the profile
-- (account deletion removes them) and are visible only as listed above.
-- =============================================================================

begin;

-- ─── 1. Funding on the profile ─────────────────────────────────────────────

alter table public.profiles add column if not exists funding text;

alter table public.profiles drop constraint if exists profiles_funding_check;
alter table public.profiles
  add constraint profiles_funding_check check (funding is null or funding in ('DOLE', 'PGAS'));

comment on column public.profiles.funding is
  'GIP / TUPAD funding (DOLE or PGAS); decides the accomplishment report form. Admin-only.';

-- Same guard as 20261113000100, with funding added to the admin-only columns.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only enforce for API requests made as a signed-in user. Backend roles
  -- (postgres, service_role, cron) have no auth.uid().
  if auth.uid() is null or private.is_admin() then
    if tg_op = 'UPDATE' then
      new.updated_at := now();
    end if;
    return new;
  end if;

  if new.id        is distinct from old.id
     or new.role      is distinct from old.role
     or new.status    is distinct from old.status
     or new.office_id is distinct from old.office_id
     or new.position  is distinct from old.position
     or new.passcode  is distinct from old.passcode
     or new.funding   is distinct from old.funding
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an administrator can change role, status, office, position, funding or passcode.'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_profile_update() from public, anon, authenticated;


-- ─── 2. core.accomplishment_reports ────────────────────────────────────────

create table if not exists core.accomplishment_reports (
  id                uuid          primary key default gen_random_uuid(),
  profile_id        uuid          not null references public.profiles(id) on delete cascade,
  funding           text          not null check (funding in ('DOLE', 'PGAS')),
  period_start      date          not null,
  period_end        date          not null,
  daily_entries     jsonb         not null default '[]'::jsonb check (jsonb_typeof(daily_entries) = 'array'),
  activities        jsonb         not null default '[]'::jsonb check (jsonb_typeof(activities) = 'array'),
  -- Printed on the form
  designation       text          check (designation is null or char_length(designation) <= 150),
  supervisor_name   text          check (supervisor_name is null or char_length(supervisor_name) <= 150),
  approver_name     text          check (approver_name is null or char_length(approver_name) <= 150),
  approver_position text          check (approver_position is null or char_length(approver_position) <= 150),
  -- PGAS Acknowledgement Receipt of Payment (days on duty × daily stipend, computed by the beneficiary)
  amount            numeric(12,2) check (amount is null or amount >= 0),
  amount_in_words   text          check (amount_in_words is null or char_length(amount_in_words) <= 300),
  status            text          not null default 'Draft'
                                  check (status in ('Draft', 'Submitted', 'Reviewed', 'Returned')),
  review_remarks    text          check (review_remarks is null or char_length(review_remarks) <= 1000),
  reviewed_by       uuid          references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  submitted_at      timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),

  constraint accomplishment_reports_period_check check (period_end >= period_start),
  -- Anything past Draft has been submitted at least once
  constraint accomplishment_reports_submitted_check check (status = 'Draft' or submitted_at is not null),
  -- Returning a report needs a reason the beneficiary can act on
  constraint accomplishment_reports_returned_remarks_check
    check (status <> 'Returned' or nullif(btrim(review_remarks), '') is not null)
);

comment on table core.accomplishment_reports is
  'Accomplishment reports of GIP / TUPAD beneficiaries over a date range, on their funding''s form (DOLE daily entries, or PGAS activities with the payment receipt); reviewed by admins and office supervisors.';

create index if not exists idx_accomplishment_reports_profile_period
  on core.accomplishment_reports (profile_id, period_start);
create index if not exists idx_accomplishment_reports_status_submitted
  on core.accomplishment_reports (status, submitted_at desc);
create index if not exists idx_accomplishment_reports_reviewed_by
  on core.accomplishment_reports (reviewed_by);


-- ─── 3. Validation & review stamps ─────────────────────────────────────────
-- SECURITY INVOKER: it reads only what the caller may read (their own profile and reports).

create or replace function core.check_accomplishment_report()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_is_reviewer boolean;
  v_is_dole boolean;
  v_funding text;
  v_submit boolean;
  v_entries jsonb := '[]'::jsonb;
  v_activities jsonb := '[]'::jsonb;
  v_item jsonb;
  v_date date;
  v_day_status text;
  v_text text;
  v_output text;
  v_remarks text;
  v_missing int;
  v_overlap record;
begin
  -- Backend roles (postgres, service_role) have no auth.uid(): trusted as they are.
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  -- ─ Reviewer: someone else's report — only status and remarks may change ─
  if tg_op = 'UPDATE' and old.profile_id <> v_uid then
    v_is_reviewer := private.is_admin() or private.supervises(old.profile_id);
    if not v_is_reviewer then
      raise exception 'You can only review reports of your own office' using errcode = '42501';
    end if;

    if new.profile_id is distinct from old.profile_id
       or new.funding is distinct from old.funding
       or new.period_start is distinct from old.period_start
       or new.period_end is distinct from old.period_end
       or new.daily_entries is distinct from old.daily_entries
       or new.activities is distinct from old.activities
       or new.designation is distinct from old.designation
       or new.supervisor_name is distinct from old.supervisor_name
       or new.approver_name is distinct from old.approver_name
       or new.approver_position is distinct from old.approver_position
       or new.amount is distinct from old.amount
       or new.amount_in_words is distinct from old.amount_in_words
       or new.submitted_at is distinct from old.submitted_at
       or new.created_at is distinct from old.created_at then
      raise exception 'A reviewer can only change the status and remarks of a report' using errcode = '42501';
    end if;

    if new.status is distinct from old.status then
      if old.status = 'Draft' or new.status = 'Draft' then
        raise exception 'This report has not been submitted yet' using errcode = '22023';
      end if;
      if not (
        (old.status = 'Submitted' and new.status in ('Reviewed', 'Returned'))
        or (old.status in ('Reviewed', 'Returned') and new.status = 'Submitted')
      ) then
        raise exception 'This review step is not allowed' using errcode = '22023';
      end if;
    end if;

    new.review_remarks := nullif(btrim(new.review_remarks), '');
    if new.status in ('Reviewed', 'Returned') then
      if new.status is distinct from old.status then
        new.reviewed_by := v_uid;
        new.reviewed_at := now();
      end if;
    else
      -- Undo: back to Submitted, waiting for review again
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.review_remarks := null;
    end if;

    new.updated_at := now();
    return new;
  end if;

  -- ─ Owner: writing their own report ─
  if new.profile_id is distinct from v_uid then
    raise exception 'You can only write your own accomplishment reports' using errcode = '42501';
  end if;
  if private.user_role() is distinct from 'beneficiary'::public.profile_roles then
    raise exception 'Only GIP / TUPAD beneficiaries can write accomplishment reports' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'Reviewed' then
      raise exception 'This report was already reviewed and can no longer be changed' using errcode = '22023';
    end if;
    new.funding := old.funding; -- a report keeps the form it was written on
    new.created_at := old.created_at;
  else
    select p.funding into v_funding from public.profiles p where p.id = v_uid;
    if v_funding is null then
      raise exception 'Ask PESO to set your funding (DOLE or PGAS) before writing a report' using errcode = '22023';
    end if;
    new.funding := v_funding;
  end if;
  v_is_dole := new.funding = 'DOLE';

  -- Status the owner may send: Draft (save) or Submitted (submit)
  if new.status not in ('Draft', 'Submitted')
     and not (tg_op = 'UPDATE' and new.status = 'Returned' and old.status = 'Returned') then
    raise exception 'You can only save or submit your report' using errcode = '22023';
  end if;
  v_submit := new.status = 'Submitted';

  if tg_op = 'UPDATE' and not v_submit then
    if old.status = 'Submitted' then
      raise exception 'This report is already submitted; submit it again to save your changes' using errcode = '22023';
    end if;
    if old.status = 'Returned' then
      new.status := 'Returned'; -- saving keeps the remarks visible until it is submitted again
    end if;
  end if;

  -- ─ The period: started, and not overlapping another report of this person ─
  if new.period_start > v_today then
    raise exception 'The start date cannot be after today' using errcode = '22023';
  end if;

  -- One save at a time per person, so two overlapping reports can't slip in together
  perform pg_advisory_xact_lock(hashtextextended('accomplishment_reports:' || new.profile_id::text, 0));

  select r.period_start, r.period_end into v_overlap
  from core.accomplishment_reports r
  where r.profile_id = new.profile_id
    and r.id <> new.id
    and r.period_start <= new.period_end
    and r.period_end >= new.period_start
  order by r.period_start
  limit 1;
  if found then
    raise exception 'You already have a report covering % to %',
      to_char(v_overlap.period_start, 'MM/DD/YYYY'), to_char(v_overlap.period_end, 'MM/DD/YYYY')
      using errcode = '22023';
  end if;

  -- ─ Daily entries: weekdays of the period up to today, one per day ─
  for v_item in select value from jsonb_array_elements(new.daily_entries) loop
    begin
      v_date := (v_item ->> 'date')::date;
    exception when others then
      raise exception 'A daily entry has an invalid date' using errcode = '22023';
    end;
    v_day_status := coalesce(v_item ->> 'status', 'Worked');
    v_text := nullif(btrim(v_item ->> 'entry'), '');

    if v_date is null or v_date < new.period_start or v_date > least(new.period_end, v_today) then
      raise exception 'Daily entries must fall within the report''s dates and not after today' using errcode = '22023';
    end if;
    if extract(isodow from v_date) > 5 then
      raise exception 'Daily entries are for weekdays only' using errcode = '22023';
    end if;
    if v_day_status not in ('Worked', 'Holiday', 'Leave') then
      raise exception 'A daily entry has an invalid status' using errcode = '22023';
    end if;
    if v_day_status = 'Worked' and v_text is null then
      raise exception 'Write what you did on %', to_char(v_date, 'MM/DD/YYYY') using errcode = '22023';
    end if;
    if char_length(coalesce(v_text, '')) > 1000 then
      raise exception 'Keep each daily entry under 1000 characters' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(v_entries) e where (e ->> 'date')::date = v_date) then
      raise exception 'There are two entries for %', to_char(v_date, 'MM/DD/YYYY') using errcode = '22023';
    end if;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'date', to_char(v_date, 'YYYY-MM-DD'), 'status', v_day_status, 'entry', v_text
    ));
  end loop;
  select coalesce(jsonb_agg(e order by e ->> 'date'), '[]'::jsonb) into v_entries from jsonb_array_elements(v_entries) e;
  new.daily_entries := v_entries;

  -- ─ PGAS activities (DOLE's form has none) ─
  if not v_is_dole then
    if jsonb_array_length(new.activities) > 50 then
      raise exception 'List up to 50 activities' using errcode = '22023';
    end if;
    for v_item in select value from jsonb_array_elements(new.activities) loop
      v_text := nullif(btrim(v_item ->> 'activity'), '');
      v_output := nullif(btrim(v_item ->> 'output'), '');
      v_remarks := nullif(btrim(v_item ->> 'remarks'), '');
      continue when v_text is null and v_output is null;
      if v_text is null then
        raise exception 'Every row needs the activity you accomplished' using errcode = '22023';
      end if;
      if char_length(v_text) > 1000 or char_length(coalesce(v_output, '')) > 500 or char_length(coalesce(v_remarks, '')) > 150 then
        raise exception 'An activity row is too long' using errcode = '22023';
      end if;
      v_activities := v_activities || jsonb_build_array(jsonb_build_object(
        'activity', v_text, 'output', v_output, 'remarks', v_remarks
      ));
    end loop;
  end if;
  new.activities := v_activities;

  -- ─ Form details ─
  new.designation := nullif(btrim(new.designation), '');
  new.supervisor_name := nullif(btrim(new.supervisor_name), '');
  new.approver_name := nullif(btrim(new.approver_name), '');
  new.approver_position := nullif(btrim(new.approver_position), '');
  if v_is_dole then
    new.designation := null;
    new.amount := null;
    new.amount_in_words := null;
  else
    new.amount_in_words := nullif(btrim(new.amount_in_words), '');
  end if;

  -- ─ Submit: the form is complete for the days so far (a report may go in before its last day) ─
  if v_submit then
    if v_is_dole then
      select count(*) into v_missing
      from generate_series(new.period_start, least(new.period_end, v_today), interval '1 day') as d(day)
      where extract(isodow from d.day) <= 5
        and not exists (select 1 from jsonb_array_elements(v_entries) e where (e ->> 'date')::date = d.day::date);
      if v_missing > 0 then
        raise exception 'Write what you did on every weekday of the report so far (% missing)', v_missing
          using errcode = '22023';
      end if;
    else
      if jsonb_array_length(v_activities) = 0 then
        raise exception 'List at least one activity you accomplished' using errcode = '22023';
      end if;
      if new.amount is null or new.amount <= 0 or new.amount_in_words is null then
        raise exception 'Enter the amount of your pay for these dates, in figures and in words' using errcode = '22023';
      end if;
    end if;
  end if;

  -- ─ Review fields belong to the reviewer; submitting clears the last review ─
  if tg_op = 'INSERT' then
    new.review_remarks := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.submitted_at := case when v_submit then now() end;
  elsif v_submit then
    new.review_remarks := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.submitted_at := now();
  else
    new.review_remarks := old.review_remarks;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.submitted_at := old.submitted_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function core.check_accomplishment_report() from public, anon, authenticated;

drop trigger if exists trg_check_accomplishment_report on core.accomplishment_reports;
create trigger trg_check_accomplishment_report
  before insert or update on core.accomplishment_reports
  for each row execute function core.check_accomplishment_report();


-- ─── 4. Grants & Row Level Security ────────────────────────────────────────

revoke all on core.accomplishment_reports from public, anon;
grant select, insert, update, delete on core.accomplishment_reports to authenticated;
grant all on core.accomplishment_reports to service_role;

alter table core.accomplishment_reports enable row level security;

drop policy if exists "accomplishment_reports: read own, admin all, supervisor own office" on core.accomplishment_reports;
create policy "accomplishment_reports: read own, admin all, supervisor own office"
  on core.accomplishment_reports for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.is_admin())
    or private.supervises(profile_id)
  );

drop policy if exists "accomplishment_reports: insert own" on core.accomplishment_reports;
create policy "accomplishment_reports: insert own"
  on core.accomplishment_reports for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

-- Owner edits until reviewed; admin / office supervisor reviews (the trigger limits what each may change)
drop policy if exists "accomplishment_reports: update own or review" on core.accomplishment_reports;
create policy "accomplishment_reports: update own or review"
  on core.accomplishment_reports for update
  to authenticated
  using (
    (profile_id = (select auth.uid()) and status <> 'Reviewed')
    or (select private.is_admin())
    or private.supervises(profile_id)
  )
  with check (
    profile_id = (select auth.uid())
    or (select private.is_admin())
    or private.supervises(profile_id)
  );

drop policy if exists "accomplishment_reports: delete own unreviewed, admin all" on core.accomplishment_reports;
create policy "accomplishment_reports: delete own unreviewed, admin all"
  on core.accomplishment_reports for delete
  to authenticated
  using (
    (profile_id = (select auth.uid()) and status <> 'Reviewed')
    or (select private.is_admin())
  );

commit;
