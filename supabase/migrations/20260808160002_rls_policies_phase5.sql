-- ELEVO FIT — Fase 5: RLS policies for bookings.
--
-- Staff (OWNER/ADMIN/PROFESSOR) see and manage every booking in the org
-- (PROFESSOR needs this to see who's coming to their classes). A STUDENT
-- sees and manages only their own bookings. There is deliberately no
-- DELETE policy — a booking is never removed, only status-transitioned
-- (cancelled) — and no UPDATE path outside cancel_booking() changes
-- status in practice, even though the policy itself allows any update a
-- self/staff actor could legitimately make.

drop policy if exists "bookings_select_staff_or_self" on public.bookings;
create policy "bookings_select_staff_or_self" on public.bookings
  for select
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
    or public.student_belongs_to_current_user(student_id)
  );

drop policy if exists "bookings_insert_self_or_staff" on public.bookings;
create policy "bookings_insert_self_or_staff" on public.bookings
  for insert
  with check (
    public.is_org_member(organization_id)
    and (
      public.student_belongs_to_current_user(student_id)
      or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN'])
    )
  );

drop policy if exists "bookings_update_self_or_staff" on public.bookings;
create policy "bookings_update_self_or_staff" on public.bookings
  for update
  using (
    public.student_belongs_to_current_user(student_id)
    or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
  )
  with check (
    public.student_belongs_to_current_user(student_id)
    or public.has_role_in_org(organization_id, array['OWNER', 'ADMIN', 'PROFESSOR'])
  );
