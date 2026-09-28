-- IRON LOG initial schema. Run this in the Supabase SQL editor before the other files.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default '',
  height numeric,
  current_weight numeric,
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  compound_rest_seconds integer not null default 180 check (compound_rest_seconds between 15 and 900),
  accessory_rest_seconds integer not null default 90 check (accessory_rest_seconds between 15 and 900),
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  weekly_goal integer not null default 4 check (weekly_goal between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (category in ('chest', 'back', 'leg', 'shoulder', 'arms')),
  exercise_type text not null check (exercise_type in ('compound', 'accessory')),
  equipment text not null check (equipment in ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other')),
  default_rest_seconds integer not null default 90 check (default_rest_seconds between 15 and 900),
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (user_id is null and is_custom = false)
    or (user_id is not null and is_custom = true)
  )
);

create unique index if not exists exercises_global_name_idx
  on public.exercises (lower(name))
  where user_id is null;

create index if not exists exercises_user_id_idx
  on public.exercises (user_id)
  where user_id is not null;

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines (user_id, updated_at desc);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index integer not null check (order_index >= 0),
  default_sets integer not null default 3 check (default_sets between 1 and 20),
  default_reps integer not null default 8 check (default_reps between 1 and 50),
  rest_seconds integer not null default 90 check (rest_seconds between 15 and 900),
  created_at timestamptz not null default now()
);

create index if not exists routine_exercises_routine_id_idx
  on public.routine_exercises (routine_id, order_index);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  name text not null,
  status text not null check (status in ('active', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer,
  total_volume numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_user_started_idx
  on public.workouts (user_id, started_at desc);

create index if not exists workouts_user_status_idx
  on public.workouts (user_id, status);

create unique index if not exists workouts_one_active_idx
  on public.workouts (user_id)
  where status = 'active';

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index integer not null check (order_index >= 0),
  rest_seconds integer not null default 90 check (rest_seconds between 15 and 900),
  created_at timestamptz not null default now()
);

create index if not exists workout_exercises_workout_id_idx
  on public.workout_exercises (workout_id, order_index);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number > 0),
  set_type text not null check (set_type in ('warmup', 'normal', 'top', 'backoff', 'drop', 'amrap')),
  weight numeric not null default 0 check (weight >= 0),
  reps integer not null default 0 check (reps >= 0),
  completed boolean not null default false,
  estimated_1rm numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sets_exercise_idx
  on public.workout_sets (workout_exercise_id, set_number);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  record_type text not null check (record_type in ('e1rm', '1rm', '3rm', '5rm', 'volume', 'heaviest')),
  weight numeric,
  reps integer,
  estimated_1rm numeric,
  workout_id uuid references public.workouts (id) on delete set null,
  workout_set_id uuid references public.workout_sets (id) on delete set null,
  achieved_at timestamptz not null default now()
);

create index if not exists personal_records_user_exercise_idx
  on public.personal_records (user_id, exercise_id, achieved_at desc);

create unique index if not exists personal_records_set_type_idx
  on public.personal_records (workout_set_id, record_type)
  where workout_set_id is not null;

create unique index if not exists personal_records_volume_workout_idx
  on public.personal_records (workout_id, exercise_id, record_type)
  where record_type = 'volume' and workout_id is not null;

create table if not exists public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight numeric not null check (weight > 0),
  recorded_at date not null,
  created_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

create index if not exists body_weight_logs_user_idx
  on public.body_weight_logs (user_id, recorded_at desc);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before update on public.user_settings
for each row execute function public.touch_updated_at();

drop trigger if exists routines_touch on public.routines;
create trigger routines_touch before update on public.routines
for each row execute function public.touch_updated_at();

drop trigger if exists workouts_touch on public.workouts;
create trigger workouts_touch before update on public.workouts
for each row execute function public.touch_updated_at();

drop trigger if exists workout_sets_touch on public.workout_sets;
create trigger workout_sets_touch before update on public.workout_sets
for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.personal_records to authenticated;
grant select, insert, update, delete on public.body_weight_logs to authenticated;
