-- ELEVO FIT — Fase 4: RLS policies for students and subscriptions, plus a
-- cross-tenant validation trigger for subscriptions (same reasoning as
-- validate_plan_schedule_category in Fase 3).

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------

-- Staff (OWNER/ADMIN/PROFESSOR) see every student in the org. A STUDENT
-- sees only their own record — never another student's.
drop policy if exists "students_select_staff_or_self" on public.students;
create policy "students_select_staff_or_self" on public.students
  for select
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
    or profile_id = auth.uid()
  );

drop policy if exists "students_write_owner_admin" on public.students;
create policy "students_write_owner_admin" on public.students
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- ---------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------

create or replace function public.student_belongs_to_current_user(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student_id
      and s.profile_id = auth.uid()
  );
$$;

comment on function public.student_belongs_to_current_user(uuid) is 'True if the given student row belongs to the currently authenticated user (used so a STUDENT can read their own subscriptions/bookings/payments).';
grant execute on function public.student_belongs_to_current_user(uuid) to authenticated;

drop policy if exists "subscriptions_select_staff_or_self" on public.subscriptions;
create policy "subscriptions_select_staff_or_self" on public.subscriptions
  for select
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
    or public.student_belongs_to_current_user(student_id)
  );

drop policy if exists "subscriptions_write_owner_admin" on public.subscriptions;
create policy "subscriptions_write_owner_admin" on public.subscriptions
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- Defense in depth: plan_id and student_id must belong to the same
-- organization as the subscription row itself.
create or replace function public.validate_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_org uuid;
  v_student_org uuid;
begin
  select organization_id into v_plan_org from public.plans where id = new.plan_id;
  select organization_id into v_student_org from public.students where id = new.student_id;

  if v_plan_org is null or v_plan_org <> new.organization_id then
    raise exception 'subscriptions: plan must belong to the same organization';
  end if;

  if v_student_org is null or v_student_org <> new.organization_id then
    raise exception 'subscriptions: student must belong to the same organization';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_subscription on public.subscriptions;
create trigger validate_subscription
  before insert or update on public.subscriptions
  for each row
  execute function public.validate_subscription();
