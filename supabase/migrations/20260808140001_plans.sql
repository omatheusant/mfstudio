-- ELEVO FIT — Fase 3: plans
--
-- Plans are entirely organization-defined data — there is no
-- Bronze/Prata/Ouro/Diamante in application logic anywhere. MF Studio's
-- plan names/prices are seed data only (see supabase/seed.sql). Any
-- organization defines whatever plans it wants.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  -- MONTHLY is the only cycle MF Studio uses today; the others are
  -- allowed now so the column never needs a migration to "unlock" them
  -- once an organization actually needs weekly/quarterly/yearly/custom
  -- billing. See docs/business-rules.md.
  billing_cycle text not null default 'MONTHLY'
    check (billing_cycle in ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY', 'CUSTOM')),
  -- How many sessions the plan grants per `session_period`. Never
  -- hardcode "5 sessions" anywhere in app logic — always read this.
  session_limit integer not null check (session_limit > 0),
  session_period text not null check (session_period in ('WEEK', 'MONTH')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

comment on table public.plans is 'Organization-defined membership plans. Names/prices/session limits are configuration, never hardcoded in application logic.';

create index if not exists plans_org_idx on public.plans (organization_id);

alter table public.plans enable row level security;

drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at
  before update on public.plans
  for each row
  execute function public.set_updated_at();
