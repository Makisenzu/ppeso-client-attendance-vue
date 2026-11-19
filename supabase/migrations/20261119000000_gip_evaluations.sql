-- =============================================================================
-- GIP evaluations
--
-- * core.evaluation_questions — the questions admins write, grouped as Performance or Attitude.
-- * core.gip_evaluations      — a supervisor's monthly evaluation of an active GIP in their office:
--                               every active question rated 1 (Poor) to 5 (Outstanding) + optional remarks.
--
-- One evaluation per GIP per month (PHT). It stays editable as a Draft and is locked once Submitted.
-- Answers keep a copy of each question's text, so editing or deleting a question never changes a
-- submitted evaluation. The trigger rebuilds the answers from the questions table and computes the
-- averages — the client never decides the question text or the scores.
--
-- Access: admins manage questions and read / delete every evaluation; supervisors read the active
-- questions and write evaluations for GIPs in their own office; GIPs can't read evaluations.
-- =============================================================================

begin;

-- ─── 1. Questions ───────────────────────────────────────────────────────────

create table if not exists core.evaluation_questions (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('performance', 'attitude')),
  question    text not null check (length(btrim(question)) between 3 and 500),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_evaluation_questions_category_order
  on core.evaluation_questions (category, sort_order);

create or replace function core.touch_evaluation_question()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.question := btrim(new.question);
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function core.touch_evaluation_question() from public, anon, authenticated;

drop trigger if exists trg_touch_evaluation_question on core.evaluation_questions;
create trigger trg_touch_evaluation_question
  before insert or update on core.evaluation_questions
  for each row execute function core.touch_evaluation_question();

revoke all on core.evaluation_questions from public, anon;
grant select, insert, update, delete on core.evaluation_questions to authenticated;
grant all on core.evaluation_questions to service_role;

alter table core.evaluation_questions enable row level security;

drop policy if exists "evaluation_questions: admin all, supervisor active" on core.evaluation_questions;
create policy "evaluation_questions: admin all, supervisor active"
  on core.evaluation_questions for select
  to authenticated
  using ((select private.is_admin()) or ((select private.is_supervisor()) and is_active));

drop policy if exists "evaluation_questions: admin insert" on core.evaluation_questions;
create policy "evaluation_questions: admin insert"
  on core.evaluation_questions for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "evaluation_questions: admin update" on core.evaluation_questions;
create policy "evaluation_questions: admin update"
  on core.evaluation_questions for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "evaluation_questions: admin delete" on core.evaluation_questions;
create policy "evaluation_questions: admin delete"
  on core.evaluation_questions for delete
  to authenticated
  using ((select private.is_admin()));


-- ─── 2. Evaluations ─────────────────────────────────────────────────────────

create table if not exists core.gip_evaluations (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  evaluator_id      uuid references public.profiles (id) on delete set null,
  period_month      date not null check (extract(day from period_month) = 1),
  -- [{ question_id, category, question, rating }] — rebuilt by the trigger
  answers           jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  performance_score numeric(3, 2),
  attitude_score    numeric(3, 2),
  overall_score     numeric(3, 2),
  remarks           text check (remarks is null or length(remarks) <= 1000),
  status            text not null default 'Draft' check (status in ('Draft', 'Submitted')),
  submitted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint unique_monthly_gip_evaluation unique (profile_id, period_month)
);

create index if not exists idx_gip_evaluations_evaluator on core.gip_evaluations (evaluator_id);
create index if not exists idx_gip_evaluations_period on core.gip_evaluations (period_month);
create index if not exists idx_gip_evaluations_status_submitted on core.gip_evaluations (status, submitted_at desc);

create or replace function core.check_gip_evaluation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_month date := date_trunc('month', (now() at time zone 'Asia/Manila'))::date;
  v_target record;
  v_item jsonb;
  v_rating int;
  v_ratings jsonb := '{}'::jsonb;
  v_answers jsonb := '[]'::jsonb;
  v_question record;
  v_missing int := 0;
begin
  -- Backend roles (postgres, service_role) have no auth.uid(): trusted as they are.
  if v_uid is null then
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'Submitted' then
      raise exception 'A submitted evaluation can no longer be changed.' using errcode = '42501';
    end if;
    if new.profile_id is distinct from old.profile_id
       or new.period_month is distinct from old.period_month
       or new.created_at is distinct from old.created_at then
      raise exception 'The GIP and month of an evaluation cannot be changed.' using errcode = '42501';
    end if;
  end if;

  -- Only the supervisor of the GIP's office writes evaluations (RLS checks this too).
  if not private.supervises(new.profile_id) then
    raise exception 'You can only evaluate GIPs in your own office.' using errcode = '42501';
  end if;

  select p.position, p.status, p.role into v_target from public.profiles p where p.id = new.profile_id;
  if not found or v_target.position <> 'gip' or v_target.status <> 'active' or v_target.role <> 'beneficiary' then
    raise exception 'Only active GIPs can be evaluated.' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    new.period_month := v_month;
    new.created_at := now();
  elsif new.period_month <> v_month then
    raise exception 'Evaluations from a past month can no longer be changed.' using errcode = '42501';
  end if;

  new.evaluator_id := v_uid;

  -- ─ Ratings: { question_id → 1..5 } from what the client sent ─
  if jsonb_typeof(new.answers) <> 'array' or jsonb_array_length(new.answers) > 200 then
    raise exception 'The answers are not valid.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(new.answers) loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'rating') <> 'number' then
      raise exception 'Every answer needs a rating from 1 to 5.' using errcode = '22023';
    end if;
    v_rating := (v_item ->> 'rating')::numeric::int;
    if v_rating < 1 or v_rating > 5 or (v_item ->> 'rating')::numeric <> v_rating then
      raise exception 'Ratings must be whole numbers from 1 to 5.' using errcode = '22023';
    end if;
    v_ratings := v_ratings || jsonb_build_object(coalesce(v_item ->> 'question_id', ''), v_rating);
  end loop;

  -- ─ Rebuild the answers from the active questions (text and category come from the table) ─
  for v_question in
    select q.id, q.category, q.question
    from core.evaluation_questions q
    where q.is_active
    order by case q.category when 'performance' then 0 else 1 end, q.sort_order, q.created_at
  loop
    if v_ratings ? v_question.id::text then
      v_answers := v_answers || jsonb_build_array(jsonb_build_object(
        'question_id', v_question.id,
        'category', v_question.category,
        'question', v_question.question,
        'rating', (v_ratings ->> v_question.id::text)::int
      ));
    else
      v_missing := v_missing + 1;
    end if;
  end loop;

  new.answers := v_answers;
  new.remarks := nullif(btrim(coalesce(new.remarks, '')), '');

  if new.status = 'Submitted' then
    if jsonb_array_length(v_answers) = 0 then
      raise exception 'There are no evaluation questions to answer yet.' using errcode = '22023';
    end if;
    if v_missing > 0 then
      raise exception 'Rate every question before submitting.' using errcode = '22023';
    end if;
    new.submitted_at := now();
  else
    new.submitted_at := null;
  end if;

  select
    round(avg((a ->> 'rating')::numeric) filter (where a ->> 'category' = 'performance'), 2),
    round(avg((a ->> 'rating')::numeric) filter (where a ->> 'category' = 'attitude'), 2),
    round(avg((a ->> 'rating')::numeric), 2)
  into new.performance_score, new.attitude_score, new.overall_score
  from jsonb_array_elements(v_answers) a;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function core.check_gip_evaluation() from public, anon, authenticated;

drop trigger if exists trg_check_gip_evaluation on core.gip_evaluations;
create trigger trg_check_gip_evaluation
  before insert or update on core.gip_evaluations
  for each row execute function core.check_gip_evaluation();

revoke all on core.gip_evaluations from public, anon;
grant select, insert, update, delete on core.gip_evaluations to authenticated;
grant all on core.gip_evaluations to service_role;

alter table core.gip_evaluations enable row level security;

drop policy if exists "gip_evaluations: admin all, supervisor own office" on core.gip_evaluations;
create policy "gip_evaluations: admin all, supervisor own office"
  on core.gip_evaluations for select
  to authenticated
  using ((select private.is_admin()) or private.supervises(profile_id));

drop policy if exists "gip_evaluations: supervisor insert" on core.gip_evaluations;
create policy "gip_evaluations: supervisor insert"
  on core.gip_evaluations for insert
  to authenticated
  with check (private.supervises(profile_id));

drop policy if exists "gip_evaluations: supervisor update draft" on core.gip_evaluations;
create policy "gip_evaluations: supervisor update draft"
  on core.gip_evaluations for update
  to authenticated
  using (private.supervises(profile_id) and status = 'Draft')
  with check (private.supervises(profile_id));

drop policy if exists "gip_evaluations: admin all, supervisor own draft" on core.gip_evaluations;
create policy "gip_evaluations: admin all, supervisor own draft"
  on core.gip_evaluations for delete
  to authenticated
  using ((select private.is_admin()) or (private.supervises(profile_id) and status = 'Draft'));

commit;
