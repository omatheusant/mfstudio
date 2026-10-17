-- Hotfix: capacity was never actually enforced across different students.
--
-- create_booking() is SECURITY INVOKER (intentional — see architecture.md),
-- so its internal "how many RESERVED bookings exist for this slot/date"
-- count ran under the CALLING student's own RLS on `bookings`
-- (bookings_select_staff_or_self: staff see everything, a student sees
-- only their OWN bookings). That count was therefore always scoped to the
-- caller's own rows — a student could never see another student's
-- booking on the same slot, so the capacity check silently undercounted
-- and let the slot fill past its capacity (reproduced: 3 students booked
-- a capacity-2 slot, sequentially, with each call individually reporting
-- itself as the 1st reservation).
--
-- Fix, matching the existing student_is_overdue() precedent (a narrow
-- SECURITY DEFINER aggregate, never exposing row-level data a student
-- shouldn't see — only a count): add count_reserved_bookings() and use it
-- in place of the raw RLS-scoped query. Students still cannot read each
-- other's booking rows directly; this only lets the capacity check see
-- the true total.

create or replace function public.count_reserved_bookings(p_schedule_slot_id uuid, p_date date)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.bookings
  where schedule_slot_id = p_schedule_slot_id
    and date = p_date
    and status = 'RESERVED';
$$;

comment on function public.count_reserved_bookings(uuid, date) is 'RLS-independent count of RESERVED bookings for a slot/date — used by create_booking() to enforce capacity. Returns only a count, never row-level data, so it does not leak other students'' bookings.';
grant execute on function public.count_reserved_bookings(uuid, date) to authenticated;

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
  v_org_settings public.organization_settings;
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

  select * into v_org_settings from public.organization_settings where organization_id = v_slot.organization_id;

  if v_org_settings.block_booking_when_overdue and public.student_is_overdue(p_student_id) then
    raise exception 'Aluno está inadimplente e reservas estão bloqueadas para esta organização.';
  end if;

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

  -- Was a raw query against `bookings` here — RLS-scoped to the caller
  -- (see migration header), so it never saw other students' rows. Now an
  -- RLS-independent aggregate.
  select public.count_reserved_bookings(p_schedule_slot_id, p_date) into v_current_count;

  if v_current_count >= v_slot.capacity then
    raise exception 'Este horário está lotado.';
  end if;

  insert into public.bookings (organization_id, student_id, schedule_slot_id, date, status)
  values (v_slot.organization_id, p_student_id, p_schedule_slot_id, p_date, 'RESERVED')
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function public.create_booking(uuid, uuid, date) is 'The only supported way to create a booking. Enforces plan/category compatibility, session limits, overdue block, conflicts and capacity (race-safe via row lock + RLS-independent count) in one place.';
grant execute on function public.create_booking(uuid, uuid, date) to authenticated;
