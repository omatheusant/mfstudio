-- ELEVO FIT — Fase 2: organization_settings
--
-- One row per organization (1:1), holding every knob the spec says must
-- be configurable per Studio instead of hardcoded: default slot capacity,
-- cancellation window, check-in window, and whether overdue students are
-- blocked from booking. See docs/business-rules.md.

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  -- Used to pre-fill new schedule_slots; each slot can still override it.
  default_capacity integer not null default 8 check (default_capacity > 0),
  -- Minutes of advance notice required to cancel without losing the session.
  -- See bookings.status ('CANCELLED' vs 'CANCELLED_LATE') in a later phase.
  cancellation_window_minutes integer not null default 120 check (cancellation_window_minutes >= 0),
  checkin_open_minutes_before integer not null default 60 check (checkin_open_minutes_before >= 0),
  checkin_close_minutes_after integer not null default 15 check (checkin_close_minutes_after >= 0),
  block_booking_when_overdue boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_settings is 'Per-organization configuration knobs. Never hardcode these values in application logic — always read them from here.';

alter table public.organization_settings enable row level security;

drop trigger if exists set_updated_at on public.organization_settings;
create trigger set_updated_at
  before update on public.organization_settings
  for each row
  execute function public.set_updated_at();
