-- Row Level Security. A user can only access their own rows.
-- Global exercises (user_id is null) are readable by every signed-in user and cannot be edited.

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.body_weight_logs enable row level security;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_settings_owner on public.user_settings;
create policy user_settings_owner on public.user_settings
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists exercises_read on public.exercises;
create policy exercises_read on public.exercises
for select to authenticated
using (user_id is null or user_id = auth.uid());

drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises
for insert to authenticated
with check (is_custom = true and user_id = auth.uid());

drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises
for update to authenticated
using (is_custom = true and user_id = auth.uid())
with check (is_custom = true and user_id = auth.uid());

drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises
for delete to authenticated
using (is_custom = true and user_id = auth.uid());

drop policy if exists routines_owner on public.routines;
create policy routines_owner on public.routines
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists routine_exercises_owner on public.routine_exercises;
create policy routine_exercises_owner on public.routine_exercises
for all to authenticated
using (
  exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists workouts_owner on public.workouts;
create policy workouts_owner on public.workouts
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists workout_exercises_owner on public.workout_exercises;
create policy workout_exercises_owner on public.workout_exercises
for all to authenticated
using (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_sets_owner on public.workout_sets;
create policy workout_sets_owner on public.workout_sets
for all to authenticated
using (
  exists (
    select 1
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_sets.workout_exercise_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists personal_records_owner on public.personal_records;
create policy personal_records_owner on public.personal_records
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists body_weight_logs_owner on public.body_weight_logs;
create policy body_weight_logs_owner on public.body_weight_logs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
