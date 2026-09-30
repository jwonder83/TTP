create table if not exists public.training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  goal_type text not null check (goal_type in ('ONE_RM', 'WEIGHT_REPS')),
  target_weight numeric check (target_weight is null or target_weight >= 0),
  target_reps integer check (target_reps is null or target_reps >= 0),
  target_estimated_1rm numeric check (target_estimated_1rm is null or target_estimated_1rm >= 0),
  target_date date,
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_goals_user_idx on public.training_goals (user_id, exercise_id);

drop trigger if exists training_goals_touch on public.training_goals;
create trigger training_goals_touch before update on public.training_goals
for each row execute function public.touch_updated_at();

alter table public.training_goals enable row level security;

drop policy if exists training_goals_owner on public.training_goals;
create policy training_goals_owner on public.training_goals
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.training_goals to authenticated;
