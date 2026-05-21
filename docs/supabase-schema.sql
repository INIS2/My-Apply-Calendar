create extension if not exists "pgcrypto";

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  url text,
  apply_url text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low', 'drop')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  event_type text not null check (event_type in ('announce', 'go')),
  event_date date,
  is_unknown boolean not null default false,
  is_done boolean not null default false,
  result text check (result in ('done', 'pass', 'fail', 'skip') or result is null),
  review text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_unknown = true and event_date is null) or is_unknown = false)
);

alter table public.applications enable row level security;
alter table public.application_events enable row level security;

create policy "applications select own"
on public.applications for select
using (auth.uid() = user_id);

create policy "applications insert own"
on public.applications for insert
with check (auth.uid() = user_id);

create policy "applications update own"
on public.applications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "applications delete own"
on public.applications for delete
using (auth.uid() = user_id);

create policy "events select own"
on public.application_events for select
using (auth.uid() = user_id);

create policy "events insert own"
on public.application_events for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.applications
    where applications.id = application_events.application_id
      and applications.user_id = auth.uid()
  )
);

create policy "events update own"
on public.application_events for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.applications
    where applications.id = application_events.application_id
      and applications.user_id = auth.uid()
  )
);

create policy "events delete own"
on public.application_events for delete
using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_touch_updated_at
before update on public.applications
for each row execute function public.touch_updated_at();

create trigger events_touch_updated_at
before update on public.application_events
for each row execute function public.touch_updated_at();
