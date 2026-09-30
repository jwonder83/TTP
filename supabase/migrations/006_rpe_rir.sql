-- Optional effort and recommendation fields on existing sets.

alter table public.workout_sets
  add column if not exists rpe numeric check (rpe is null or rpe between 6 and 10),
  add column if not exists rir integer check (rir is null or rir between 0 and 4),
  add column if not exists target_reps integer check (target_reps is null or target_reps >= 0),
  add column if not exists recommendation_weight numeric check (recommendation_weight is null or recommendation_weight >= 0),
  add column if not exists recommendation_applied boolean not null default false;
