-- ELEVO FIT — Fase 2: RLS policies for organization_settings,
-- schedule_categories and schedule_slots.
--
-- Read access: any ACTIVE member of the organization (students need to
-- see schedule categories/slots to book later; everyone benefits from
-- seeing the org's operating settings). Write access: OWNER/ADMIN only —
-- PROFESSOR and STUDENT never configure the Studio.

-- ---------------------------------------------------------------------
-- organization_settings
-- ---------------------------------------------------------------------

drop policy if exists "org_settings_select_members" on public.organization_settings;
create policy "org_settings_select_members" on public.organization_settings
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "org_settings_update_owner_admin" on public.organization_settings;
create policy "org_settings_update_owner_admin" on public.organization_settings
  for update
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- No INSERT policy: a settings row is created exclusively by
-- create_organization() (20260808130005) with sensible defaults. No
-- DELETE policy: settings live and die with the organization (cascade).

-- ---------------------------------------------------------------------
-- schedule_categories
-- ---------------------------------------------------------------------

drop policy if exists "schedule_categories_select_members" on public.schedule_categories;
create policy "schedule_categories_select_members" on public.schedule_categories
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "schedule_categories_write_owner_admin" on public.schedule_categories;
create policy "schedule_categories_write_owner_admin" on public.schedule_categories
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));

-- ---------------------------------------------------------------------
-- schedule_slots
-- ---------------------------------------------------------------------

drop policy if exists "schedule_slots_select_members" on public.schedule_slots;
create policy "schedule_slots_select_members" on public.schedule_slots
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "schedule_slots_write_owner_admin" on public.schedule_slots;
create policy "schedule_slots_write_owner_admin" on public.schedule_slots
  for all
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']));
