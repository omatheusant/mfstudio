-- ELEVO FIT — Fase 2: schedule_categories
--
-- Configurable label for grouping schedule_slots (e.g. MF Studio's
-- "Premium"/"Alternativo"). Deliberately just a name + description +
-- active flag — any organization can define its own categories
-- ("Manhã"/"Tarde"/"Noite", etc.). Never hardcode category names in
-- application logic; plans (Fase 3) reference these rows, not strings.

create table if not exists public.schedule_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

comment on table public.schedule_categories is 'Organization-defined grouping for schedule slots (e.g. Premium/Alternativo). Never hardcode category names in app logic.';

create index if not exists schedule_categories_org_idx on public.schedule_categories (organization_id);

alter table public.schedule_categories enable row level security;

drop trigger if exists set_updated_at on public.schedule_categories;
create trigger set_updated_at
  before update on public.schedule_categories
  for each row
  execute function public.set_updated_at();
