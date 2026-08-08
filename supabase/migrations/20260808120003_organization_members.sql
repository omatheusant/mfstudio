-- ELEVO FIT — Fase 1: organization_members
--
-- Join table between users and organizations. This is the ONLY source of
-- truth for "which organization(s) does this user belong to, and with
-- which role". Every tenant-isolation policy in the whole product is
-- ultimately derived from this table via the helper functions in
-- 20260808120004_rls_helper_functions.sql — never from a client-supplied
-- organization_id.

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('OWNER', 'ADMIN', 'PROFESSOR', 'STUDENT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is 'Membership + role of a user within an organization. A user may belong to more than one organization.';

create index if not exists organization_members_org_idx on public.organization_members (organization_id);
create index if not exists organization_members_user_idx on public.organization_members (user_id);

alter table public.organization_members enable row level security;

drop trigger if exists set_updated_at on public.organization_members;
create trigger set_updated_at
  before update on public.organization_members
  for each row
  execute function public.set_updated_at();
