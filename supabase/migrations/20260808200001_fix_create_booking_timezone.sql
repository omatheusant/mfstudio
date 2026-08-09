-- ELEVO FIT — Fase 11: fix create_booking()'s "past date" check to use
-- the ORGANIZATION's timezone, not Postgres's server timezone (UTC).
--
-- Bug found while writing the cancellation-window test (Fase 11): the
-- guard `if p_date < current_date` used Postgres's default `current_date`,
-- which reads in UTC on Supabase. For MF Studio (America/Sao_Paulo,
-- UTC-3), Postgres's UTC "today" runs ahead of the organization's local
-- "today" for the first ~3 hours of the UTC day (UTC 00:00–03:00 =
-- São Paulo 21:00–23:59 the day before). A student trying to book one of
-- their studio's own LATER slots *today*, local time, during that
-- window would be wrongly rejected with "não é possível reservar uma
-- data no passado" — the exact kind of hardcoded-timezone bug seção 40
-- of the briefing warns about. Fixed by comparing against
-- `(now() at time zone organizations.timezone)::date` instead.
--
-- Same signature, re-created (not a new migration file per function) —
-- see 20260808160003_rpc_bookings.sql / 20260808180004 for the history.

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
  v_org_timezone text;
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

  select timezone into v_org_timezone from public.organizations where id = v_slot.organization_id;
  if p_date < (now() at time zone coalesce(v_org_timezone, 'America/Sao_Paulo'))::date then
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

comment on function public.create_booking(uuid, uuid, date) is 'The only supported way to create a booking. Enforces plan/category compatibility, session limits, active status, overdue block, conflicts and capacity (race-safe via row lock) in one place. "Past date" is evaluated in the organization''s own timezone.';
grant execute on function public.create_booking(uuid, uuid, date) to authenticated;
