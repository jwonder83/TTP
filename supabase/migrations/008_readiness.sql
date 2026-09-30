create table if not exists public.workout_readiness (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  energy text not null check (energy in ('LOW', 'NORMAL', 'HIGH')),
  sleep text not null check (sleep in ('POOR', 'OK', 'GOOD')),
  soreness text not null check (soreness in ('LOW', 'MODERATE', 'HIGH')),
  created_at timestamptz not null default now(),
  unique (workout_id)
);

alter table public.workout_readiness enable row level security;

drop policy if exists workout_readiness_owner on public.workout_readiness;
create policy workout_readiness_owner on public.workout_readiness
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.workout_readiness to authenticated;
