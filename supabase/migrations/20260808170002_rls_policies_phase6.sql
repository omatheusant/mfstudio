-- ELEVO FIT — Fase 6: RLS policies for checkins.
--
-- Same shape as bookings: staff (OWNER/ADMIN/PROFESSOR) see/manage every
-- checkin in the org; a STUDENT sees/manages only their own.

drop policy if exists "checkins_select_staff_or_self" on public.checkins;
create policy "checkins_select_staff_or_self" on public.checkins
  for select
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
    or public.student_belongs_to_current_user(student_id)
  );

drop policy if exists "checkins_insert_self_or_staff" on public.checkins;
create policy "checkins_insert_self_or_staff" on public.checkins
  for insert
  with check (
    public.is_org_member(organization_id)
    and (
      public.student_belongs_to_current_user(student_id)
      or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
    )
  );

drop policy if exists "checkins_update_self_or_staff" on public.checkins;
create policy "checkins_update_self_or_staff" on public.checkins
  for update
  using (
    public.student_belongs_to_current_user(student_id)
    or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
  )
  with check (
    public.student_belongs_to_current_user(student_id)
    or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
  );
