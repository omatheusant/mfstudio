-- ELEVO FIT — Fase 2: create_organization now also seeds default settings.
--
-- Every organization must have exactly one organization_settings row from
-- the moment it exists — nothing in the app should have to handle "an org
-- with no settings row". Re-creating the function (same signature) keeps
-- this the single entry point for tenant creation.

create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_timezone text default 'America/Sao_Paulo'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (name, slug, timezone)
  values (p_name, p_slug, coalesce(p_timezone, 'America/Sao_Paulo'))
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'OWNER', 'ACTIVE');

  insert into public.organization_settings (organization_id)
  values (v_org.id);

  return v_org;
end;
$$;

comment on function public.create_organization(text, text, text) is 'Creates a new organization, makes the calling user its OWNER, and seeds default organization_settings. The only supported way to create a tenant.';
grant execute on function public.create_organization(text, text, text) to authenticated;
