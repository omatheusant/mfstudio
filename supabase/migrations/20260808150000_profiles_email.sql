-- ELEVO FIT — Fase 4: profiles.email
--
-- `auth.users` is a separate schema not exposed through PostgREST/RLS, so
-- anything the app needs to show or search by (a student's e-mail, in
-- particular) has to be denormalized onto `profiles`. Populated by
-- triggers on `auth.users` insert/update — the application never writes
-- this column directly.

alter table public.profiles add column if not exists email text;

-- Also (still Fase 4): pick up `phone` from raw_user_meta_data if present.
-- This lets features/students/actions.ts#createStudent set the new
-- student's phone through `auth.admin.inviteUserByEmail({ data: { phone }})`
-- instead of needing a separate write to `profiles` that Fase 1's
-- profiles_update_self RLS policy (self-only) would reject for an
-- OWNER/ADMIN acting on someone else's profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.handle_user_email_change();

-- Backfill for rows created before this migration (a no-op on a fresh DB).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
