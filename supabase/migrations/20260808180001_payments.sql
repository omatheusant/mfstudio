-- ELEVO FIT — Fase 7: payments
--
-- Manual financial control — no payment gateway integration in the MVP
-- (see docs/architecture.md). `status` deliberately stores only
-- 'PENDING' | 'PAID' | 'CANCELLED': overdue is never written here, only
-- computed from `due_date < current_date` — see
-- 20260808180002_view_payments_with_status.sql and
-- docs/business-rules.md §"Inadimplência". Storing a fourth OVERDUE
-- value that some job would need to flip would let it drift out of sync
-- with `due_date`; computing it on read never can.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'CANCELLED')),
  payment_method text check (payment_method in ('PIX', 'CASH', 'CARD', 'TRANSFER', 'OTHER')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Manual payment record. status is only PENDING/PAID/CANCELLED — "overdue" is always computed from due_date, never stored. See payments_with_status.';

create index if not exists payments_org_idx on public.payments (organization_id);
create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists payments_subscription_idx on public.payments (subscription_id);
create index if not exists payments_due_date_idx on public.payments (due_date);

alter table public.payments enable row level security;

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

-- Defense in depth: subscription and student must agree with each other
-- and with the payment's own organization_id — same pattern as
-- validate_subscription (Fase 4) and validate_booking (Fase 5).
create or replace function public.validate_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.subscriptions;
begin
  select * into v_subscription from public.subscriptions where id = new.subscription_id;

  if v_subscription is null or v_subscription.organization_id <> new.organization_id then
    raise exception 'payments: subscription must belong to the same organization';
  end if;

  if v_subscription.student_id <> new.student_id then
    raise exception 'payments: student must match the subscription''s student';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_payment on public.payments;
create trigger validate_payment
  before insert or update on public.payments
  for each row
  execute function public.validate_payment();
