create index if not exists workouts_user_started_idx
  on public.workouts (user_id, started_at desc);

create index if not exists workouts_program_day_idx
  on public.workouts (program_day_id)
  where program_day_id is not null;
