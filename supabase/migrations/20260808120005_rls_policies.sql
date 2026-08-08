-- ELEVO FIT — Fase 1: RLS policies for organizations, profiles and
-- organization_members.
--
-- Golden rule tested here: a member of organization A can never see or
-- touch rows belonging to organization B. See docs/database.md for the
-- validation queries used to prove this.

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------

drop policy if exists "org_select_members" on public.organizations;
create policy "org_select_members" on public.organizations
  for select
  using (public.is_org_member(id));

drop policy if exists "org_update_owner_admin" on public.organizations;
create policy "org_update_owner_admin" on public.organizations
  for update
  using (public.has_role_in_org(id, array['OWNER', 'ADMIN']))
  with check (public.has_role_in_org(id, array['OWNER', 'ADMIN']));

-- No INSERT/DELETE policy on purpose: organizations are only ever created
-- through the create_organization() RPC (20260808120006), which is
-- SECURITY DEFINER and derives the OWNER from auth.uid() itself — never
-- from a client-supplied value. Deleting an organization is out of scope
-- for the MVP.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

drop policy if exists "profiles_select_self_or_org_peers" on public.profiles;
create policy "profiles_select_self_or_org_peers" on public.profiles
  for select
  using (id = auth.uid() or public.shares_org_with(id));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------

drop policy if exists "members_select_same_org" on public.organization_members;
create policy "members_select_same_org" on public.organization_members
  for select
  using (public.is_org_member(organization_id));

-- OWNER/ADMIN can add members, but only an OWNER can grant the OWNER role
-- (an ADMIN cannot promote anyone — including themselves — to OWNER).
drop policy if exists "members_insert_owner_admin" on public.organization_members;
create policy "members_insert_owner_admin" on public.organization_members
  for insert
  with check (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN'])
    and (role <> 'OWNER' or public.has_role_in_org(organization_id, array['OWNER']))
  );

drop policy if exists "members_update_owner_admin" on public.organization_members;
create policy "members_update_owner_admin" on public.organization_members
  for update
  using (public.has_role_in_org(organization_id, array['OWNER', 'ADMIN']))
  with check (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN'])
    and (role <> 'OWNER' or public.has_role_in_org(organization_id, array['OWNER']))
  );

-- Same restriction on delete: an ADMIN cannot remove an OWNER.
drop policy if exists "members_delete_owner_admin" on public.organization_members;
create policy "members_delete_owner_admin" on public.organization_members
  for delete
  using (
    public.has_role_in_org(organization_id, array['OWNER', 'ADMIN'])
    and (role <> 'OWNER' or public.has_role_in_org(organization_id, array['OWNER']))
  );
