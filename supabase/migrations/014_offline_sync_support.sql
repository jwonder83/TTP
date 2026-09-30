-- Client sync uses stable UUIDs already stored on workouts and sets.
-- client_updated_at records the device write time for last-write conflict checks.

alter table public.workouts
  add column if not exists client_updated_at timestamptz;
