-- ELEVO FIT — Fase 6: checkins
--
-- One attendance record per booking: PRESENT (via self check-in within
-- the configured window, or a staff override) or ABSENT (staff marks a
-- no-show). Like bookings, this table is never written directly by
-- application code — always through student_checkin()/mark_attendance()
-- (20260808170003), which also flip the booking's own status to
-- COMPLETED/NO_SHOW so bookings.status stays the single source of truth
-- for "what actually happened", and checkins stays the audit log of
-- who/when.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null check (status in ('PRESENT', 'ABSENT')),
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id)
);

comment on table public.checkins is 'Attendance record for a booking. Insert/update only through student_checkin()/mark_attendance() — see 20260808170003_rpc_checkins.sql.';

create index if not exists checkins_org_idx on public.checkins (organization_id);
create index if not exists checkins_student_idx on public.checkins (student_id);

alter table public.checkins enable row level security;

drop trigger if exists set_updated_at on public.checkins;
create trigger set_updated_at
  before update on public.checkins
  for each row
  execute function public.set_updated_at();

-- Defense in depth: booking and student must agree with each other and
-- with the checkin's own organization_id.
create or replace function public.validate_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = new.booking_id;

  if v_booking is null or v_booking.organization_id <> new.organization_id then
    raise exception 'checkins: booking must belong to the same organization';
  end if;

  if v_booking.student_id <> new.student_id then
    raise exception 'checkins: student must match the booking''s student';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_checkin on public.checkins;
create trigger validate_checkin
  before insert or update on public.checkins
  for each row
  execute function public.validate_checkin();
