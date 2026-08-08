-- ELEVO FIT — development seed data.
--
-- NEVER run this against a production project. It inserts directly into
-- `auth.users`/`auth.identities` (fake data only) so you get working
-- logins without going through the signup/confirmation flow.
--
-- Local dev (Supabase CLI): runs automatically on `supabase db reset`.
-- Hosted dev project: paste into the SQL Editor (it connects as
-- `postgres`, which has the privileges this script needs) — do this only
-- on a throwaway/dev Supabase project, never on anything real.
--
-- All seeded users share the password: elevofit123
--
-- Emails / roles for MF Studio (see docs/business-rules.md):
--   owner@mfstudio.dev      OWNER
--   admin@mfstudio.dev      ADMIN
--   professor@mfstudio.dev  PROFESSOR
--   aluno@mfstudio.dev      STUDENT
--
-- This file grows across phases: later phases append schedules, plans,
-- students, bookings and payments for the same MF Studio org created here.

do $$
declare
  v_owner_id uuid := '00000000-0000-0000-0000-000000000001';
  v_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_prof_id uuid := '00000000-0000-0000-0000-000000000003';
  v_student_id uuid := '00000000-0000-0000-0000-000000000004';
  v_org_id uuid;
  v_password text := 'elevofit123';
begin
  -- 1. Fake auth users (idempotent: safe to re-run).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated', 'owner@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcos Ferreira"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Paula"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_prof_id, 'authenticated', 'authenticated', 'professor@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Nogueira"}', now(), now(), '', ''),
    ('00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated', 'aluno@mfstudio.dev', crypt(v_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"João Aluno"}', now(), now(), '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_owner_id::text, v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_prof_id::text, v_prof_id, jsonb_build_object('sub', v_prof_id::text, 'email', 'professor@mfstudio.dev'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_student_id::text, v_student_id, jsonb_build_object('sub', v_student_id::text, 'email', 'aluno@mfstudio.dev'), 'email', now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  -- public.profiles rows are created automatically by the
  -- on_auth_user_created trigger (20260808120002_profiles.sql).

  -- 2. MF Studio organization. Inserted directly (not through the
  -- create_organization RPC) because this script needs to seed several
  -- specific memberships at once, run as `postgres` which bypasses RLS.
  insert into public.organizations (name, slug, timezone, phone, email)
  values ('MF Studio', 'mf-studio', 'America/Sao_Paulo', '(11) 90000-0000', 'contato@mfstudio.dev')
  on conflict (slug) do update set name = excluded.name
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role, status)
  values
    (v_org_id, v_owner_id, 'OWNER', 'ACTIVE'),
    (v_org_id, v_admin_id, 'ADMIN', 'ACTIVE'),
    (v_org_id, v_prof_id, 'PROFESSOR', 'ACTIVE'),
    (v_org_id, v_student_id, 'STUDENT', 'ACTIVE')
  on conflict (organization_id, user_id) do update set role = excluded.role, status = excluded.status;
end $$;
