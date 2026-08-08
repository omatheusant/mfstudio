-- ELEVO FIT — Fase 1: profiles
--
-- Application-level user data, separate from Supabase Auth (auth.users).
-- One profile per auth user. A user can belong to multiple organizations
-- (see organization_members), so org-specific data never lives here.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile for an auth.users row. Never store organization-specific data here — see organization_members.';

alter table public.profiles enable row level security;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row whenever a new Supabase Auth user is created
-- (self-signup, magic link, or an admin invite). SECURITY DEFINER lets this
-- run even though the inserting session has no profiles/organizations rows
-- of its own yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
