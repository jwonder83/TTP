alter table public.exercises
  add column if not exists movement_pattern text;

alter table public.exercises
  drop constraint if exists exercises_movement_pattern_check;

alter table public.exercises
  add constraint exercises_movement_pattern_check
  check (
    movement_pattern is null
    or movement_pattern in (
      'HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PULL',
      'SQUAT', 'HINGE', 'LUNGE', 'CARRY', 'ISOLATION'
    )
  );

update public.exercises set movement_pattern = 'HORIZONTAL_PUSH' where user_id is null and name in ('Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Chest Press');
update public.exercises set movement_pattern = 'HORIZONTAL_PUSH' where user_id is null and name = 'Weighted Dip';
update public.exercises set movement_pattern = 'ISOLATION' where user_id is null and name = 'Cable Fly';
update public.exercises set movement_pattern = 'HINGE' where user_id is null and name in ('Deadlift', 'Romanian Deadlift');
update public.exercises set movement_pattern = 'VERTICAL_PULL' where user_id is null and name in ('Pull Up', 'Weighted Pull Up', 'Lat Pulldown');
update public.exercises set movement_pattern = 'HORIZONTAL_PULL' where user_id is null and name in ('Barbell Row', 'Seated Cable Row');
update public.exercises set movement_pattern = 'SQUAT' where user_id is null and name in ('Squat', 'Front Squat', 'Leg Press');
update public.exercises set movement_pattern = 'ISOLATION' where user_id is null and name in ('Leg Extension', 'Leg Curl', 'Lateral Raise', 'Rear Delt Fly', 'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Triceps Extension', 'Skull Crusher');
update public.exercises set movement_pattern = 'VERTICAL_PUSH' where user_id is null and name in ('Overhead Press', 'Dumbbell Shoulder Press');

alter table public.training_programs
  add column if not exists planned_days integer;

create table if not exists public.training_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  primary_goal text not null check (primary_goal in ('STRENGTH', 'HYPERTROPHY', 'POWERBUILDING', 'GENERAL')),
  experience_level text not null check (experience_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  training_days_per_week integer not null check (training_days_per_week between 2 and 6),
  session_duration_minutes integer not null check (session_duration_minutes in (30, 45, 60, 75, 90)),
  preferred_split text,
  effort_scale text not null default 'rpe' check (effort_scale in ('rpe', 'rir')),
  schedule_mode text not null default 'FLEXIBLE' check (schedule_mode in ('FIXED', 'FLEXIBLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists training_profiles_touch on public.training_profiles;
create trigger training_profiles_touch before update on public.training_profiles
for each row execute function public.touch_updated_at();

alter table public.training_profiles enable row level security;
drop policy if exists training_profiles_owner on public.training_profiles;
create policy training_profiles_owner on public.training_profiles
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, update, delete on public.training_profiles to authenticated;

create table if not exists public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  equipment_type text not null check (equipment_type in (
    'BARBELL', 'DUMBBELLS', 'POWER_RACK', 'BENCH', 'CABLE', 'MACHINES',
    'PULLUP_BAR', 'DIP_STATION', 'LEG_PRESS', 'SMITH', 'BODYWEIGHT'
  )),
  created_at timestamptz not null default now(),
  unique (user_id, equipment_type)
);

alter table public.user_equipment enable row level security;
drop policy if exists user_equipment_owner on public.user_equipment;
create policy user_equipment_owner on public.user_equipment
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, update, delete on public.user_equipment to authenticated;

create table if not exists public.exercise_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  preference_type text not null check (preference_type in ('PREFERRED', 'AVOID')),
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

alter table public.exercise_preferences enable row level security;
drop policy if exists exercise_preferences_owner on public.exercise_preferences;
create policy exercise_preferences_owner on public.exercise_preferences
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, update, delete on public.exercise_preferences to authenticated;

create table if not exists public.program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  change_type text not null check (change_type in (
    'GENERATED', 'USER_EDIT', 'WEEKLY_ADJUSTMENT', 'DELOAD', 'EXERCISE_SUBSTITUTION', 'PROGRAM_REBUILD'
  )),
  change_summary text not null default '',
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (program_id, version_number)
);

alter table public.program_versions enable row level security;
drop policy if exists program_versions_owner on public.program_versions;
create policy program_versions_owner on public.program_versions
for all to authenticated
using (
  exists (
    select 1 from public.training_programs p
    where p.id = program_versions.program_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.training_programs p
    where p.id = program_versions.program_id and p.user_id = auth.uid()
  )
);
grant select, insert, update, delete on public.program_versions to authenticated;

create table if not exists public.exercise_training_max (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  value numeric not null check (value > 0),
  source text not null check (source in ('ACTUAL', 'ESTIMATED', 'MANUAL')),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

alter table public.exercise_training_max enable row level security;
drop policy if exists exercise_training_max_owner on public.exercise_training_max;
create policy exercise_training_max_owner on public.exercise_training_max
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, update, delete on public.exercise_training_max to authenticated;

create table if not exists public.substitution_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_exercise_id uuid not null references public.exercises (id) on delete cascade,
  to_exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.substitution_history enable row level security;
drop policy if exists substitution_history_owner on public.substitution_history;
create policy substitution_history_owner on public.substitution_history
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, delete on public.substitution_history to authenticated;

create table if not exists public.program_schedule_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  action text not null check (action in ('DO_TODAY', 'MOVE_TOMORROW', 'SKIP', 'RESCHEDULE')),
  target_date date,
  created_at timestamptz not null default now()
);

alter table public.program_schedule_actions enable row level security;
drop policy if exists program_schedule_actions_owner on public.program_schedule_actions;
create policy program_schedule_actions_owner on public.program_schedule_actions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
grant select, insert, delete on public.program_schedule_actions to authenticated;
