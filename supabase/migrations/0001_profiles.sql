-- Profiles: one row per signed-in user, with their role in the app.
create type public.app_role as enum ('director', 'regional_manager', 'assignee');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  title text not null,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);
