alter table public.workouts
  add column if not exists notes text,
  add column if not exists program_id uuid references public.training_programs (id) on delete set null,
  add column if not exists program_day_id uuid references public.program_days (id) on delete set null;

create table if not exists public.exercise_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

drop trigger if exists exercise_notes_touch on public.exercise_notes;
create trigger exercise_notes_touch before update on public.exercise_notes
for each row execute function public.touch_updated_at();

alter table public.exercise_notes enable row level security;

drop policy if exists exercise_notes_owner on public.exercise_notes;
create policy exercise_notes_owner on public.exercise_notes
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.exercise_notes to authenticated;

create table if not exists public.workout_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  label text not null,
  remind_time text not null default '19:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, weekday, label)
);

alter table public.workout_schedules enable row level security;

drop policy if exists workout_schedules_owner on public.workout_schedules;
create policy workout_schedules_owner on public.workout_schedules
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.workout_schedules to authenticated;
