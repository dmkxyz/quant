create table if not exists public.week_prep_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_pack_id uuid not null references public.week_packs(id) on delete cascade,
  viewed_at timestamptz,
  completed_check_ids jsonb not null default '[]'::jsonb,
  readiness text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_pack_id)
);

create index if not exists idx_week_prep_progress_user_week on public.week_prep_progress(user_id, week_pack_id);

drop trigger if exists week_prep_progress_set_updated_at on public.week_prep_progress;
create trigger week_prep_progress_set_updated_at
before update on public.week_prep_progress
for each row execute function public.set_updated_at();

alter table public.week_prep_progress enable row level security;

create policy "week prep progress owner select" on public.week_prep_progress
  for select using (auth.uid() = user_id);

create policy "week prep progress owner insert" on public.week_prep_progress
  for insert with check (auth.uid() = user_id);

create policy "week prep progress owner update" on public.week_prep_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "week prep progress owner delete" on public.week_prep_progress
  for delete using (auth.uid() = user_id);
