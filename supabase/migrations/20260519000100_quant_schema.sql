create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  difficulty_level numeric(3, 2) not null default 1.00 check (difficulty_level >= 0.50 and difficulty_level <= 5.00),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.week_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  difficulty_target numeric(3, 2) not null check (difficulty_target >= 0.50 and difficulty_target <= 5.00),
  status text not null default 'ready' check (status in ('generating', 'ready', 'failed', 'archived')),
  generated_at timestamptz not null default now(),
  generation_rationale text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_pack_id uuid not null references public.week_packs(id) on delete cascade,
  day text not null check (day in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  kind text not null check (kind in ('weekday_drill', 'weekend_capstone')),
  difficulty numeric(3, 2) not null check (difficulty >= 0.50 and difficulty <= 5.00),
  difficulty_label text not null check (difficulty_label in ('beginner', 'developing', 'intermediate', 'advanced', 'expert')),
  concepts jsonb not null default '[]'::jsonb,
  title text not null,
  prompt text not null,
  stages jsonb not null,
  expected_reasoning jsonb not null default '[]'::jsonb,
  rubric jsonb not null,
  estimated_minutes int not null check (estimated_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_seconds int not null default 0 check (elapsed_seconds >= 0),
  hints_used int not null default 0 check (hints_used >= 0),
  self_confidence int not null default 3 check (self_confidence between 1 and 5),
  submitted_answer text not null default '',
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attempt_stage_progress (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  stage_id text not null,
  answer text not null default '',
  hints_used int not null default 0 check (hints_used >= 0),
  coach_turns jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, stage_id)
);

create table if not exists public.attempt_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  correctness numeric(4, 3) not null check (correctness >= 0 and correctness <= 1),
  reasoning_quality numeric(4, 3) not null check (reasoning_quality >= 0 and reasoning_quality <= 1),
  communication_quality numeric(4, 3) not null check (communication_quality >= 0 and communication_quality <= 1),
  calibration numeric(4, 3) not null check (calibration >= 0 and calibration <= 1),
  concept_scores jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  next_step_recommendation text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_bites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_problem_id uuid references public.problems(id) on delete set null,
  source_week_id uuid references public.week_packs(id) on delete set null,
  concept text not null,
  explanation text not null,
  example text not null,
  common_trap text not null,
  revisit_prompt text not null,
  mastery_status text not null default 'new' check (mastery_status in ('new', 'weak', 'practicing', 'mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  metrics jsonb not null,
  weak_concepts jsonb not null default '[]'::jsonb,
  mastered_concepts jsonb not null default '[]'::jsonb,
  difficulty_before numeric(3, 2) not null check (difficulty_before >= 0.50 and difficulty_before <= 5.00),
  difficulty_after numeric(3, 2) not null check (difficulty_after >= 0.50 and difficulty_after <= 5.00),
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_week_start_date date not null,
  status text not null check (status in ('started', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  unique (user_id, target_week_start_date)
);

create index if not exists idx_week_packs_user_week on public.week_packs(user_id, week_start_date);
create index if not exists idx_problems_week_pack on public.problems(week_pack_id);
create index if not exists idx_attempts_user_problem on public.attempts(user_id, problem_id);
create index if not exists idx_lesson_bites_user_concept on public.lesson_bites(user_id, concept);
create index if not exists idx_progress_snapshots_user_week on public.progress_snapshots(user_id, week_start_date);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists week_packs_set_updated_at on public.week_packs;
create trigger week_packs_set_updated_at before update on public.week_packs for each row execute function public.set_updated_at();
drop trigger if exists problems_set_updated_at on public.problems;
create trigger problems_set_updated_at before update on public.problems for each row execute function public.set_updated_at();
drop trigger if exists attempts_set_updated_at on public.attempts;
create trigger attempts_set_updated_at before update on public.attempts for each row execute function public.set_updated_at();
drop trigger if exists attempt_stage_progress_set_updated_at on public.attempt_stage_progress;
create trigger attempt_stage_progress_set_updated_at before update on public.attempt_stage_progress for each row execute function public.set_updated_at();
drop trigger if exists lesson_bites_set_updated_at on public.lesson_bites;
create trigger lesson_bites_set_updated_at before update on public.lesson_bites for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.week_packs enable row level security;
alter table public.problems enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_stage_progress enable row level security;
alter table public.attempt_scores enable row level security;
alter table public.lesson_bites enable row level security;
alter table public.progress_snapshots enable row level security;
alter table public.generation_runs enable row level security;

create policy "profiles owner select" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles owner delete" on public.profiles for delete using (auth.uid() = user_id);

create policy "week packs owner select" on public.week_packs for select using (auth.uid() = user_id);
create policy "week packs owner insert" on public.week_packs for insert with check (auth.uid() = user_id);
create policy "week packs owner update" on public.week_packs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "week packs owner delete" on public.week_packs for delete using (auth.uid() = user_id);

create policy "problems owner select" on public.problems for select using (auth.uid() = user_id);
create policy "problems owner insert" on public.problems for insert with check (auth.uid() = user_id);
create policy "problems owner update" on public.problems for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "problems owner delete" on public.problems for delete using (auth.uid() = user_id);

create policy "attempts owner select" on public.attempts for select using (auth.uid() = user_id);
create policy "attempts owner insert" on public.attempts for insert with check (auth.uid() = user_id);
create policy "attempts owner update" on public.attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempts owner delete" on public.attempts for delete using (auth.uid() = user_id);

create policy "attempt stages owner select" on public.attempt_stage_progress
  for select using (exists (select 1 from public.attempts where attempts.id = attempt_stage_progress.attempt_id and attempts.user_id = auth.uid()));
create policy "attempt stages owner insert" on public.attempt_stage_progress
  for insert with check (exists (select 1 from public.attempts where attempts.id = attempt_stage_progress.attempt_id and attempts.user_id = auth.uid()));
create policy "attempt stages owner update" on public.attempt_stage_progress
  for update using (exists (select 1 from public.attempts where attempts.id = attempt_stage_progress.attempt_id and attempts.user_id = auth.uid()))
  with check (exists (select 1 from public.attempts where attempts.id = attempt_stage_progress.attempt_id and attempts.user_id = auth.uid()));
create policy "attempt stages owner delete" on public.attempt_stage_progress
  for delete using (exists (select 1 from public.attempts where attempts.id = attempt_stage_progress.attempt_id and attempts.user_id = auth.uid()));

create policy "attempt scores owner select" on public.attempt_scores for select using (auth.uid() = user_id);
create policy "attempt scores owner insert" on public.attempt_scores for insert with check (auth.uid() = user_id);
create policy "attempt scores owner update" on public.attempt_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attempt scores owner delete" on public.attempt_scores for delete using (auth.uid() = user_id);

create policy "lesson bites owner select" on public.lesson_bites for select using (auth.uid() = user_id);
create policy "lesson bites owner insert" on public.lesson_bites for insert with check (auth.uid() = user_id);
create policy "lesson bites owner update" on public.lesson_bites for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lesson bites owner delete" on public.lesson_bites for delete using (auth.uid() = user_id);

create policy "progress snapshots owner select" on public.progress_snapshots for select using (auth.uid() = user_id);
create policy "progress snapshots owner insert" on public.progress_snapshots for insert with check (auth.uid() = user_id);
create policy "progress snapshots owner update" on public.progress_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress snapshots owner delete" on public.progress_snapshots for delete using (auth.uid() = user_id);

create policy "generation runs owner select" on public.generation_runs for select using (auth.uid() = user_id);
create policy "generation runs owner insert" on public.generation_runs for insert with check (auth.uid() = user_id);
create policy "generation runs owner update" on public.generation_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generation runs owner delete" on public.generation_runs for delete using (auth.uid() = user_id);

create or replace function public.ensure_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 'UTC')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_quant_profile on auth.users;
create trigger on_auth_user_created_quant_profile
after insert on auth.users
for each row execute function public.ensure_profile_for_new_user();

do $$
begin
  execute 'create extension if not exists pg_net with schema extensions';
exception when others then
  raise notice 'pg_net extension was not enabled: %', sqlerrm;
end;
$$;

do $$
begin
  execute 'create extension if not exists pg_cron with schema extensions';
exception when others then
  raise notice 'pg_cron extension was not enabled: %', sqlerrm;
end;
$$;

create or replace function public.invoke_quant_generate_week()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  edge_url text := current_setting('app.quant_generate_week_url', true);
  invoke_key text := current_setting('app.quant_generate_week_key', true);
begin
  if edge_url is null or edge_url = '' or invoke_key is null or invoke_key = '' then
    raise notice 'quant generate_week cron skipped because app.quant_generate_week_url or app.quant_generate_week_key is unset';
    return;
  end if;

  perform net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || invoke_key
    ),
    body := '{"scheduled":true}'::jsonb
  );
end;
$$;

do $$
begin
  if to_regnamespace('cron') is not null then
    if not exists (select 1 from cron.job where jobname = 'quant-generate-week-sunday-hourly') then
      perform cron.schedule(
        'quant-generate-week-sunday-hourly',
        '0 * * * 0',
        'select public.invoke_quant_generate_week();'
      );
    end if;
  end if;
exception when others then
  raise notice 'quant generate_week cron was not scheduled: %', sqlerrm;
end;
$$;
