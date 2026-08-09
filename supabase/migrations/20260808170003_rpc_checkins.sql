-- ELEVO FIT — Fase 6: student_checkin / mark_attendance RPCs
--
-- Mirrors the create_booking()/cancel_booking() pattern from Fase 5: all
-- the rules live here, in the database, not scattered across Server
-- Actions. Both SECURITY INVOKER — RLS on bookings/checkins still
-- applies to every statement.

create or replace function public.student_checkin(p_booking_id uuid)
returns public.checkins
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_student public.students;
  v_slot public.schedule_slots;
  v_org public.organizations;
  v_settings public.organization_settings;
  v_start_at timestamptz;
  v_open_at timestamptz;
  v_close_at timestamptz;
  v_checkin public.checkins;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'Reserva não encontrada.';
  end if;

  select * into v_student from public.students where id = v_booking.student_id;
  if v_student.profile_id <> auth.uid() then
    raise exception 'Sem permissão para fazer check-in nesta reserva.';
  end if;

  if v_booking.status <> 'RESERVED' then
    raise exception 'Esta reserva não está disponível para check-in.';
  end if;

  select * into v_slot from public.schedule_slots where id = v_booking.schedule_slot_id;
  select * into v_org from public.organizations where id = v_booking.organization_id;
  select * into v_settings from public.organization_settings where organization_id = v_booking.organization_id;

  -- Same timezone-aware approach as cancel_booking(): the class "starts"
  -- at booking.date + slot.start_time, read in the ORGANIZATION's zone.
  v_start_at := (v_booking.date::text || ' ' || v_slot.start_time::text)::timestamp at time zone v_org.timezone;
  v_open_at := v_start_at - make_interval(mins => v_settings.checkin_open_minutes_before);
  v_close_at := v_start_at + make_interval(mins => v_settings.checkin_close_minutes_after);

  if now() < v_open_at then
    raise exception 'O check-in para esta aula ainda não está disponível.';
  end if;
  if now() > v_close_at then
    raise exception 'A janela de check-in para esta aula já encerrou.';
  end if;

  insert into public.checkins (organization_id, booking_id, student_id, status, checked_in_by)
  values (v_booking.organization_id, p_booking_id, v_booking.student_id, 'PRESENT', auth.uid())
  on conflict (booking_id) do update
    set status = 'PRESENT', checked_in_at = now(), checked_in_by = auth.uid()
  returning * into v_checkin;

  update public.bookings set status = 'COMPLETED' where id = p_booking_id;

  return v_checkin;
end;
$$;

comment on function public.student_checkin(uuid) is 'Self check-in for the booking''s own student, only inside organization_settings''s checkin window (evaluated in the organization''s timezone). Marks the booking COMPLETED.';
grant execute on function public.student_checkin(uuid) to authenticated;

create or replace function public.mark_attendance(p_booking_id uuid, p_status text)
returns public.checkins
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_checkin public.checkins;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('PRESENT', 'ABSENT') then
    raise exception 'Status de presença inválido.';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'Reserva não encontrada.';
  end if;

  if not public.has_role_in_org(v_booking.organization_id, array['OWNER', 'ADMIN', 'PROFESSOR']) then
    raise exception 'Sem permissão para marcar presença.';
  end if;

  if v_booking.status in ('CANCELLED', 'CANCELLED_LATE') then
    raise exception 'Não é possível marcar presença em uma reserva cancelada.';
  end if;

  insert into public.checkins (organization_id, booking_id, student_id, status, checked_in_by)
  values (v_booking.organization_id, p_booking_id, v_booking.student_id, p_status, auth.uid())
  on conflict (booking_id) do update
    set status = excluded.status, checked_in_at = now(), checked_in_by = auth.uid()
  returning * into v_checkin;

  update public.bookings
  set status = case when p_status = 'PRESENT' then 'COMPLETED' else 'NO_SHOW' end
  where id = p_booking_id;

  return v_checkin;
end;
$$;

comment on function public.mark_attendance(uuid, text) is 'Staff (OWNER/ADMIN/PROFESSOR) marks a booking PRESENT or ABSENT, e.g. from the Agenda roster. Also settable multiple times to correct a mistake.';
grant execute on function public.mark_attendance(uuid, text) to authenticated;
