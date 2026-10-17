-- Hotfix: students/professors could never book a class.
--
-- create_booking() takes `select ... for update` on schedule_slots to
-- serialize concurrent booking attempts (see rpc_bookings.sql). Postgres
-- RLS checks FOR UPDATE row locks against the table's UPDATE policy, not
-- just its SELECT policy — even though the lock never modifies the row.
-- schedule_slots only had a single OWNER/ADMIN-only "for all" policy, so
-- that lock silently failed for every other role, and create_booking()
-- raised "Horário não encontrado." for a slot that plainly exists.
--
-- Fix: split the write policy into insert/update/delete. For update,
-- loosen USING to "any org member" (that's only what lets the row be
-- seen/locked) while keeping WITH CHECK at OWNER/ADMIN (that's what
-- actually gates real content changes) — students still cannot edit a
-- schedule_slot's capacity/time/etc, they can only lock the row long
-- enough for create_booking()'s own capacity check to run safely.

drop policy if exists "schedule_slots_write_owner_admin" on public.schedule_slots;

create policy "schedule_slots_insert_owner_admin" on public.schedule_slots
  for insert
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

create policy "schedule_slots_update_lockable" on public.schedule_slots
  for update
  using (public.is_org_member(organization_id))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

create policy "schedule_slots_delete_owner_admin" on public.schedule_slots
  for delete
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));
