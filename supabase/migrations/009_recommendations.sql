create table if not exists public.training_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  recommended_weight numeric,
  recommended_reps integer,
  recommendation_type text not null
    check (recommendation_type in ('INCREASE', 'KEEP', 'DECREASE', 'DELOAD', 'RECOVERY', 'MANUAL')),
  reason text not null default '',
  confidence text not null check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  accepted boolean,
  created_at timestamptz not null default now()
);

create index if not exists training_recommendations_user_idx
  on public.training_recommendations (user_id, created_at desc);

alter table public.training_recommendations enable row level security;

drop policy if exists training_recommendations_owner on public.training_recommendations;
create policy training_recommendations_owner on public.training_recommendations
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.training_recommendations to authenticated;
