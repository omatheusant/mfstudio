-- ELEVO FIT — Fase 1: organizations
--
-- The `organizations` table is the tenant root. Every business table in the
-- product hangs off an `organization_id`. RLS policies for this table are
-- added later in 20260808120005_rls_policies.sql, once the helper functions
-- and organization_members table they depend on exist.

-- Generic trigger used by every table to keep `updated_at` fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  -- URL-friendly identifier, e.g. for /studio/display or future public URLs.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  phone text,
  email text,
  address text,
  -- Every organization can run in its own timezone; default matches the
  -- product's initial market (Brazil). Never hardcode this elsewhere —
  -- read it from here wherever a date/time needs to be interpreted.
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Tenant root. One row per Studio/customer of ELEVO FIT.';
comment on column public.organizations.timezone is 'IANA timezone name used to interpret this organization''s schedule slots, bookings and due dates.';

alter table public.organizations enable row level security;

drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();
