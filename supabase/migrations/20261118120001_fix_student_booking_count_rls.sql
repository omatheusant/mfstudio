-- ELEVO FIT — fix: alunos não viam a ocupação real dos horários.
--
-- getSlotsForDate() (src/features/bookings/queries.ts) runs a raw select
-- against `bookings` to count RESERVED rows per slot/date, used to show
-- "Vagas: X de Y" both on the staff Agenda and on the student's
-- "Reservar aula" screen. For staff this works because
-- bookings_select_staff_or_self lets OWNER/ADMIN/PROFESSOR see every
-- booking row in the org. For a STUDENT caller, that same policy only
-- returns the caller's OWN bookings — so the count a student saw only
-- ever reflected their own reservation (0 or 1), never anyone else's.
-- Students saw every slot as far emptier than it really was, which is
-- exactly the owner's complaint: he's the only one who can see true
-- occupancy, so he has to manually warn the group chat when a slot is
-- actually full, and sometimes misses it in the rush of the day.
--
-- The server-side capacity check itself (count_reserved_bookings(),
-- added in 20261017120002) was already race-safe and correct — this bug
-- was purely in what students were shown while deciding whether to book.
--
-- Fix, same pattern as count_reserved_bookings(): a narrow SECURITY
-- DEFINER aggregate that returns only a count per slot, never row-level
-- booking data (who booked) a student isn't allowed to see directly.

create or replace function public.count_reserved_bookings_for_slots(
  p_organization_id uuid,
  p_date date,
  p_schedule_slot_ids uuid[]
)
returns table (schedule_slot_id uuid, reserved integer)
language sql
security definer
set search_path = public
stable
as $$
  select b.schedule_slot_id, count(*)::integer
  from public.bookings b
  where b.organization_id = p_organization_id
    and b.date = p_date
    and b.status = 'RESERVED'
    and b.schedule_slot_id = any(p_schedule_slot_ids)
  group by b.schedule_slot_id;
$$;

comment on function public.count_reserved_bookings_for_slots(uuid, date, uuid[]) is 'RLS-independent per-slot RESERVED booking counts, for the Agenda/Reservar aula occupancy display. Returns only aggregate counts, never row-level data — safe for a STUDENT caller, who would otherwise be scoped to their own bookings only by bookings_select_staff_or_self.';
grant execute on function public.count_reserved_bookings_for_slots(uuid, date, uuid[]) to authenticated;
