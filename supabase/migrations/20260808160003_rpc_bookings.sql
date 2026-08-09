-- ELEVO FIT — Fase 5: create_booking / cancel_booking RPCs
--
-- Every rule from docs/business-rules.md §"Regra central de reservas"
-- lives here, in one place, enforced by the database itself — not
-- scattered across Server Actions that a future change could bypass.
-- Both functions are SECURITY INVOKER (the default): they run as the
-- calling user, so RLS on schedule_slots/students/subscriptions/bookings
-- still applies to every statement inside them. That gives us two
-- independent layers for authorization (the explicit checks below, AND
-- RLS silently hiding rows the caller shouldn't see/touch) without
-- duplicating the *business* rules (capacity, session limits, plan
-- compatibility) anywhere else.

create or replace function public.create_booking(
  p_student_id uuid,
  p_schedule_slot_id uuid,
  p_date date
)
returns public.bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_slot public.schedule_slots;
  v_student public.students;
  v_subscription record;
  v_period_start date;
  v_period_end date;
  v_sessions_used integer;
  v_current_count integer;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Lock the slot row first: this serializes every concurrent booking
  -- attempt against the SAME schedule_slot (across all dates), which is
  -- what makes the capacity check below race-safe. Without this lock,
  -- two simultaneous requests for the last vacancy could both pass the
  -- COUNT check before either INSERT commits — the classic overbooking
  -- bug the spec explicitly calls out.
  select * into v_slot from public.schedule_slots where id = p_schedule_slot_id for update;
  if v_slot is null then
    raise exception 'Horário não encontrado.';
  end if;
  if not v_slot.active then
    raise exception 'Este horário não está mais disponível.';
  end if;
  if extract(dow from p_date)::smallint <> v_slot.day_of_week then
    raise exception 'A data informada não corresponde ao dia da semana deste horário.';
  end if;
  if p_date < current_date then
    raise exception 'Não é possível reservar uma data no passado.';
  end if;

  select * into v_student from public.students
  where id = p_student_id and organization_id = v_slot.organization_id;
  if v_student is null then
    raise exception 'Aluno não encontrado.';
  end if;

  if v_student.profile_id <> auth.uid()
     and not public.has_role_in_org(v_slot.organization_id, array['OWNER', 'ADMIN']) then
    raise exception 'Sem permissão para reservar em nome deste aluno.';
  end if;

  if v_student.status <> 'ACTIVE' then
    raise exception 'Aluno inativo não pode reservar aulas.';
  end if;

  -- Fase 7 will add: if organization_settings.block_booking_when_overdue
  -- and the student has an overdue payment, raise exception here too.
  -- No payments exist yet, so there is nothing to check.

  select s.id, s.plan_id, p.session_limit, p.session_period
  into v_subscription
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.student_id = p_student_id and s.status = 'ACTIVE'
  limit 1;

  if v_subscription is null then
    raise exception 'Aluno não possui assinatura ativa.';
  end if;

  if not exists (
    select 1 from public.plan_schedule_categories pc
    where pc.plan_id = v_subscription.plan_id
      and pc.schedule_category_id = v_slot.schedule_category_id
  ) then
    raise exception 'Este horário não está disponível para o plano do aluno.';
  end if;

  -- Session limit for the plan's period. WEEK = ISO week (Monday–Sunday).
  if v_subscription.session_period = 'WEEK' then
    v_period_start := p_date - ((extract(dow from p_date)::int + 6) % 7);
    v_period_end := v_period_start + 6;
  else
    v_period_start := date_trunc('month', p_date)::date;
    v_period_end := (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date;
  end if;

  select count(*) into v_sessions_used
  from public.bookings b
  where b.student_id = p_student_id
    and b.status in ('RESERVED', 'COMPLETED')
    and b.date between v_period_start and v_period_end;

  if v_sessions_used >= v_subscription.session_limit then
    raise exception 'O aluno já atingiu o limite de sessões do plano neste período.';
  end if;

  -- Conflicting reservation: any other RESERVED booking for this student
  -- on the same date whose time range overlaps this slot's.
  if exists (
    select 1
    from public.bookings b
    join public.schedule_slots ss on ss.id = b.schedule_slot_id
    where b.student_id = p_student_id
      and b.date = p_date
      and b.status = 'RESERVED'
      and ss.start_time < v_slot.end_time
      and ss.end_time > v_slot.start_time
  ) then
    raise exception 'O aluno já possui uma reserva conflitante neste horário.';
  end if;

  -- Capacity — safe from races because of the `FOR UPDATE` lock above.
  select count(*) into v_current_count
  from public.bookings b
  where b.schedule_slot_id = p_schedule_slot_id
    and b.date = p_date
    and b.status = 'RESERVED';

  if v_current_count >= v_slot.capacity then
    raise exception 'Este horário está lotado.';
  end if;

  insert into public.bookings (organization_id, student_id, schedule_slot_id, date, status)
  values (v_slot.organization_id, p_student_id, p_schedule_slot_id, p_date, 'RESERVED')
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function public.create_booking(uuid, uuid, date) is 'The only supported way to create a booking. Enforces plan/category compatibility, session limits, active status, conflicts and capacity (race-safe via row lock) in one place.';
grant execute on function public.create_booking(uuid, uuid, date) to authenticated;

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_slot public.schedule_slots;
  v_org public.organizations;
  v_settings public.organization_settings;
  v_student public.students;
  v_start_at timestamptz;
  v_is_late boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking is null then
    raise exception 'Reserva não encontrada.';
  end if;
  if v_booking.status <> 'RESERVED' then
    raise exception 'Esta reserva já foi cancelada ou concluída.';
  end if;

  select * into v_student from public.students where id = v_booking.student_id;

  if v_student.profile_id <> auth.uid()
     and not public.has_role_in_org(v_booking.organization_id, array['OWNER', 'ADMIN', 'PROFESSOR']) then
    raise exception 'Sem permissão para cancelar esta reserva.';
  end if;

  select * into v_slot from public.schedule_slots where id = v_booking.schedule_slot_id;
  select * into v_org from public.organizations where id = v_booking.organization_id;
  select * into v_settings from public.organization_settings where organization_id = v_booking.organization_id;

  -- Interpret the booking's date + slot start_time as a wall-clock moment
  -- in the ORGANIZATION's timezone (never the server's or the browser's)
  -- to decide whether we're still inside the cancellation window.
  v_start_at := (v_booking.date::text || ' ' || v_slot.start_time::text)::timestamp at time zone v_org.timezone;
  v_is_late := now() > (v_start_at - make_interval(mins => v_settings.cancellation_window_minutes));

  update public.bookings
  set
    status = case when v_is_late then 'CANCELLED_LATE' else 'CANCELLED' end,
    cancelled_at = now(),
    cancelled_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function public.cancel_booking(uuid) is 'The only supported way to cancel a booking. Decides CANCELLED vs CANCELLED_LATE from organization_settings.cancellation_window_minutes, evaluated in the organization''s own timezone.';
grant execute on function public.cancel_booking(uuid) to authenticated;
