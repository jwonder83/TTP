create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_weeks integer not null default 8 check (duration_weeks between 1 and 52),
  current_week integer not null default 1 check (current_week >= 1),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_programs_user_status_idx
  on public.training_programs (user_id, status);

drop trigger if exists training_programs_touch on public.training_programs;
create trigger training_programs_touch before update on public.training_programs
for each row execute function public.touch_updated_at();

alter table public.training_programs enable row level security;

drop policy if exists training_programs_owner on public.training_programs;
create policy training_programs_owner on public.training_programs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.training_programs to authenticated;
