-- ELEVO FIT — Fase 1: create_organization RPC
--
-- Bootstraps a brand-new tenant: inserts the organization AND the calling
-- user's OWNER membership in a single atomic call. This sidesteps the
-- chicken-and-egg RLS problem (a bare INSERT into organization_members
-- would be rejected because, before this call, the user is not yet a
-- member of anything). SECURITY DEFINER bypasses RLS for these two
-- inserts specifically; auth.uid() — never a client-supplied id — decides
-- who becomes the OWNER.

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

  return v_org;
end;
$$;

comment on function public.create_organization(text, text, text) is 'Creates a new organization and makes the calling user its OWNER. The only supported way to create a tenant.';
grant execute on function public.create_organization(text, text, text) to authenticated;
