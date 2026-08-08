-- ELEVO FIT — Fase 2: schedule_slots
--
-- A recurring weekly time slot an organization offers (e.g. "Monday
-- 18:00–19:00, capacity 8, category Premium"). Capacity and category are
-- per-slot, never hardcoded — see docs/business-rules.md §"Regra de ouro".
--
-- `day_of_week` uses Postgres/JS convention: 0 = Sunday … 6 = Saturday
-- (matches `extract(dow from date)` and JS `Date.getDay()`), so matching a
-- slot against a calendar date in the booking logic (Fase 5) never needs
-- an off-by-one translation table.

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  schedule_category_id uuid not null references public.schedule_categories (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  capacity integer not null check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (organization_id, day_of_week, start_time, end_time)
);

comment on table public.schedule_slots is 'Recurring weekly time slot. capacity and schedule_category_id are configuration, never hardcoded in application logic.';
comment on column public.schedule_slots.day_of_week is '0 = Sunday … 6 = Saturday (Postgres extract(dow)/JS Date.getDay() convention).';

create index if not exists schedule_slots_org_idx on public.schedule_slots (organization_id);
create index if not exists schedule_slots_category_idx on public.schedule_slots (schedule_category_id);

alter table public.schedule_slots enable row level security;

drop trigger if exists set_updated_at on public.schedule_slots;
create trigger set_updated_at
  before update on public.schedule_slots
  for each row
  execute function public.set_updated_at();
