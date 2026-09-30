create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs (id) on delete cascade,
  week_number integer not null check (week_number >= 1),
  day_number integer not null check (day_number >= 1),
  name text not null,
  scheduled_day integer check (scheduled_day is null or scheduled_day between 0 and 6),
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now()
);

create index if not exists program_days_program_week_idx
  on public.program_days (program_id, week_number, order_index);

alter table public.program_days enable row level security;

drop policy if exists program_days_owner on public.program_days;
create policy program_days_owner on public.program_days
for all to authenticated
using (
  exists (
    select 1 from public.training_programs p
    where p.id = program_days.program_id and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.training_programs p
    where p.id = program_days.program_id and p.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.program_days to authenticated;
