create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index integer not null default 0 check (order_index >= 0),
  sets integer not null default 3 check (sets between 1 and 20),
  min_reps integer not null default 5 check (min_reps > 0),
  max_reps integer not null default 5 check (max_reps >= min_reps),
  target_weight numeric check (target_weight is null or target_weight >= 0),
  target_rpe numeric check (target_rpe is null or target_rpe between 6 and 10),
  percentage_1rm numeric check (percentage_1rm is null or percentage_1rm between 1 and 100),
  set_type text not null default 'top' check (set_type in ('warmup', 'normal', 'top', 'backoff', 'drop', 'amrap')),
  rest_seconds integer not null default 180 check (rest_seconds between 15 and 900),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists program_exercises_day_idx
  on public.program_exercises (program_day_id, order_index);

alter table public.program_exercises enable row level security;

drop policy if exists program_exercises_owner on public.program_exercises;
create policy program_exercises_owner on public.program_exercises
for all to authenticated
using (
  exists (
    select 1
    from public.program_days d
    join public.training_programs p on p.id = d.program_id
    where d.id = program_exercises.program_day_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.program_days d
    join public.training_programs p on p.id = d.program_id
    where d.id = program_exercises.program_day_id and p.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.program_exercises to authenticated;
