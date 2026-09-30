-- Per-exercise progression settings. Does not change earlier migrations.

alter table public.user_settings
  add column if not exists effort_scale text not null default 'rpe'
  check (effort_scale in ('rpe', 'rir'));

create table if not exists public.exercise_training_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  progression_type text not null default 'DOUBLE_PROGRESSION'
    check (progression_type in ('DOUBLE_PROGRESSION', 'LINEAR', 'TOP_SET_BACKOFF', 'MANUAL')),
  min_reps integer not null default 5 check (min_reps > 0),
  max_reps integer not null default 8 check (max_reps >= min_reps),
  weight_increment numeric not null default 2.5 check (weight_increment > 0),
  target_rpe numeric not null default 8 check (target_rpe between 6 and 10),
  top_set_enabled boolean not null default false,
  backoff_enabled boolean not null default false,
  backoff_percentage numeric not null default 90 check (backoff_percentage between 50 and 100),
  backoff_sets integer not null default 2 check (backoff_sets between 0 and 8),
  backoff_min_reps integer not null default 6 check (backoff_min_reps > 0),
  backoff_max_reps integer not null default 8 check (backoff_max_reps >= backoff_min_reps),
  deload_percentage numeric not null default 10 check (deload_percentage in (5, 7.5, 10, 15)),
  pending_deload boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

drop trigger if exists exercise_training_config_touch on public.exercise_training_config;
create trigger exercise_training_config_touch before update on public.exercise_training_config
for each row execute function public.touch_updated_at();

alter table public.exercise_training_config enable row level security;

drop policy if exists exercise_training_config_owner on public.exercise_training_config;
create policy exercise_training_config_owner on public.exercise_training_config
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.exercise_training_config to authenticated;
