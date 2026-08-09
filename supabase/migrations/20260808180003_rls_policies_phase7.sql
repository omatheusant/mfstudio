-- ELEVO FIT — Fase 7: RLS policies for payments.
--
-- Financial data is more sensitive than the rest: unlike bookings/
-- checkins, PROFESSOR is deliberately excluded — the spec is explicit
-- that professors don't manage (or need to see) payments (seção 5).
-- Only OWNER/ADMIN and the payment's own student.

drop policy if exists "payments_select_owner_admin_or_self" on public.payments;
create policy "payments_select_owner_admin_or_self" on public.payments
  for select
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN'])
    or public.student_belongs_to_current_user(student_id)
  );

drop policy if exists "payments_write_owner_admin" on public.payments;
create policy "payments_write_owner_admin" on public.payments
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- Used by create_booking() to enforce block_booking_when_overdue
-- (20260808180004). SECURITY DEFINER: this needs to see a student's
-- payments regardless of who is asking (the booking student themself,
-- who has no payments SELECT policy match for rows they don't own by
-- the *staff* clause above, but always owns by the self clause anyway —
-- defined as DEFINER mainly for a stable, RLS-independent answer here).
create or replace function public.student_is_overdue(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.payments p
    where p.student_id = p_student_id
      and p.status = 'PENDING'
      and p.due_date < current_date
  );
$$;

comment on function public.student_is_overdue(uuid) is 'True if the student has at least one PENDING payment past its due_date. The single source of truth for "is this student overdue", reused by create_booking() and anywhere else that needs the same yes/no.';
grant execute on function public.student_is_overdue(uuid) to authenticated;
