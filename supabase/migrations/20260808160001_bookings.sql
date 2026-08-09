-- ELEVO FIT — Fase 5: bookings
--
-- A student's reservation for one occurrence (a specific calendar date)
-- of a recurring schedule_slot. All the business rules that decide
-- whether a booking is ALLOWED live in the create_booking() /
-- cancel_booking() RPCs (20260808160003) — this table only stores the
-- result. Never insert into this table directly from application code;
-- always go through those functions, exactly like organizations only
-- ever get created through create_organization().

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  schedule_slot_id uuid not null references public.schedule_slots (id) on delete restrict,
  date date not null,
  status text not null default 'RESERVED'
    check (status in ('RESERVED', 'CANCELLED', 'CANCELLED_LATE', 'COMPLETED', 'NO_SHOW')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on table public.bookings is 'A student''s reservation for one date of a recurring schedule_slot. Insert/cancel only through create_booking()/cancel_booking() — see 20260808160003_rpc_bookings.sql.';

create index if not exists bookings_org_idx on public.bookings (organization_id);
create index if not exists bookings_student_idx on public.bookings (student_id);
create index if not exists bookings_slot_date_idx on public.bookings (schedule_slot_id, date);

-- A student can only hold one RESERVED booking for a given slot on a
-- given date (prevents accidental double-click double-booking of the
-- exact same class). This is separate from the capacity guard, which
-- protects against *different* students overfilling the slot — see
-- create_booking()'s `FOR UPDATE` lock on schedule_slots.
create unique index if not exists bookings_one_reserved_per_slot_date
  on public.bookings (student_id, schedule_slot_id, date)
  where (status = 'RESERVED');

alter table public.bookings enable row level security;

drop trigger if exists set_updated_at on public.bookings;
create trigger set_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();

-- Defense in depth: schedule_slot and student must belong to the same
-- organization as the booking, and the date must actually fall on the
-- slot's day_of_week (Monday slot booked for a Tuesday date is a bug,
-- not a valid reservation).
create or replace function public.validate_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_org uuid;
  v_slot_dow smallint;
  v_student_org uuid;
begin
  select organization_id, day_of_week into v_slot_org, v_slot_dow
  from public.schedule_slots where id = new.schedule_slot_id;

  select organization_id into v_student_org
  from public.students where id = new.student_id;

  if v_slot_org is null or v_slot_org <> new.organization_id then
    raise exception 'bookings: schedule_slot must belong to the same organization';
  end if;

  if v_student_org is null or v_student_org <> new.organization_id then
    raise exception 'bookings: student must belong to the same organization';
  end if;

  if v_slot_dow <> extract(dow from new.date)::smallint then
    raise exception 'bookings: date does not match the schedule_slot''s day_of_week';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_booking on public.bookings;
create trigger validate_booking
  before insert or update on public.bookings
  for each row
  execute function public.validate_booking();
