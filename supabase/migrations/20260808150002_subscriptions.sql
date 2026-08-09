-- ELEVO FIT — Fase 4: subscriptions
--
-- A student's enrollment in a plan. `price` is copied from `plans.price`
-- at creation time and never changes retroactively when the plan's price
-- changes later — see docs/business-rules.md §"Planos".

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'CANCELLED', 'SUSPENDED')),
  -- Frozen at creation time — see comment above. Never re-read plans.price
  -- to determine what an existing subscription costs.
  price numeric(10, 2) not null check (price >= 0),
  billing_day smallint check (billing_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

comment on table public.subscriptions is 'A student''s enrollment in a plan. price is frozen at creation time, independent of plans.price.';

create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);
create index if not exists subscriptions_student_idx on public.subscriptions (student_id);
create index if not exists subscriptions_plan_idx on public.subscriptions (plan_id);

-- A student has at most one ACTIVE subscription at a time — Fase 5's
-- session-limit calculation needs a single, unambiguous "current plan" to
-- check bookings against.
create unique index if not exists subscriptions_one_active_per_student
  on public.subscriptions (student_id)
  where (status = 'ACTIVE');

alter table public.subscriptions enable row level security;

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();
