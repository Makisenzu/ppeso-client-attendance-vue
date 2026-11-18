-- =============================================================================
-- Migration: 20261118000100_accomplishment_reports_current_month.sql
-- Purpose:   Beneficiaries may only create accomplishment reports for dates in the current month (Asia/Manila).
--            Existing reports keep their dates: a Returned report from an earlier month can still be edited and
--            submitted again, but moving any report's dates puts them under the same current-month rule.
--
-- Replaces core.check_accomplishment_report() from 20261118000000 (same trigger); only the period check is new.
-- =============================================================================

begin;

create or replace function core.check_accomplishment_report()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'Asia/Manila'))::date;
  v_month_end date := (date_trunc('month', (now() at time zone 'Asia/Manila')) + interval '1 month - 1 day')::date;
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

  -- New reports (and reports whose dates change) must fall within the current month (PHT). An older report
  -- keeps its dates, so a Returned one from last month can still be fixed and submitted again.
  if (tg_op = 'INSERT'
      or new.period_start is distinct from old.period_start
      or new.period_end is distinct from old.period_end)
     and (new.period_start < v_month_start or new.period_end > v_month_end) then
    raise exception 'Reports can only cover dates in the current month (% to %)',
      to_char(v_month_start, 'MM/DD/YYYY'), to_char(v_month_end, 'MM/DD/YYYY')
      using errcode = '22023';
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

commit;
