-- =============================================================================
-- user_profile_authorization — M10 close (privileged columns on user_profiles)
-- =============================================================================
--
-- Applied directly to the live Supabase project on 2026-08-13, ahead of this
-- commit. Pre-Alpha authorization hardening on a Free-plan project with no
-- backups: the hole was closed in production before the repo caught up.
--
-- This migration REPLACES the delete-on-claim claim_invite() defined in
-- 20260104_complete_database_definition.sql — it does not supplement it.
-- Anyone applying migrations in order must land on this version of claim_invite.
--
-- 20260104_complete_database_definition.sql must NOT be re-run against a live
-- project — it is destructive (drop table ... cascade).
--
-- Postgres 14+ accepts `execute function` on CREATE TRIGGER. If the live
-- project is older and that statement errors, use `execute procedure` instead
-- — same objects; server-version syntax fork only (see contract §8).
--
-- ---------------------------------------------------------------------------
-- OPERATIONAL NOTE — break-glass path for dashboard / service_role writes
-- ---------------------------------------------------------------------------
-- The user_profiles_guard_privileged_columns trigger fires for every writer,
-- including the Supabase SQL Editor and service_role, where auth.uid() is NULL.
-- A dashboard UPDATE of any user's role or status will therefore fail. To make
-- an administrative correction by hand, either set the JWT claims for the
-- session, or:
--
--   alter table public.user_profiles disable trigger user_profiles_guard_privileged_columns;
--
-- make the change, then re-enable immediately:
--
--   alter table public.user_profiles enable trigger user_profiles_guard_privileged_columns;
--
-- Leaving the trigger disabled reopens the vulnerability this migration exists
-- to close.
-- =============================================================================

-- user_profile_authorization_contract.md §8
-- M10 close: privileged columns on user_profiles
-- Does not rewrite existing rows. Does not alter get_my_org_id().

-- ---------------------------------------------------------------------------
-- 8.1 Helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

create or replace function public.invite_matches_profile_insert(
  check_org uuid,
  check_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_invites ui
    join auth.users u on u.id = auth.uid()
    where lower(ui.email) = lower(u.email)
      and ui.org_id = check_org
      and ui.role = check_role
  );
$$;

revoke all on function public.invite_matches_profile_insert(uuid, text) from public;
grant execute on function public.invite_matches_profile_insert(uuid, text) to authenticated;

create or replace function public.actor_is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and org_id = p_org_id
      and role = 'admin'
  );
$$;

revoke all on function public.actor_is_org_admin(uuid) from public;
-- trigger/owner only; authenticated need not call this directly
grant execute on function public.actor_is_org_admin(uuid) to postgres;

-- ---------------------------------------------------------------------------
-- 8.2 claim_invite: return invite, do not consume yet
-- ---------------------------------------------------------------------------

create or replace function public.claim_invite()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  invite_record record;
begin
  select email into current_email from auth.users where id = auth.uid();
  if current_email is null then
    return null;
  end if;
  select * into invite_record
  from public.user_invites
  where lower(email) = lower(current_email);
  if found then
    return row_to_json(invite_record);
  else
    return null;
  end if;
end;
$$;

grant execute on function public.claim_invite() to authenticated;

-- ---------------------------------------------------------------------------
-- 8.3 INSERT policy: invite match OR first-admin bootstrap
-- ---------------------------------------------------------------------------

drop policy if exists "Allow insert own profile" on public.user_profiles;

create policy "Allow insert own profile"
on public.user_profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and (
    public.invite_matches_profile_insert(org_id, role)
    or (
      role = 'admin'
      and exists (
        select 1
        from public.organizations o
        where o.id = org_id
          and o.created_by = auth.uid()
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 8.4 Consume invite after a successful invited INSERT
-- ---------------------------------------------------------------------------

create or replace function public.user_profiles_consume_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_invites
  where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists user_profiles_consume_invite on public.user_profiles;

create trigger user_profiles_consume_invite
after insert on public.user_profiles
for each row
execute function public.user_profiles_consume_invite();

-- ---------------------------------------------------------------------------
-- 8.5 BEFORE UPDATE: privileged columns
-- ---------------------------------------------------------------------------

create or replace function public.user_profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.org_id is distinct from old.org_id
     or new.created_at is distinct from old.created_at
     or new.email is distinct from old.email then
    raise exception 'user_profiles: id, org_id, email, and created_at cannot be changed'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status then
    if new.id = auth.uid() then
      raise exception 'user_profiles: cannot change own role or status'
        using errcode = '42501';
    end if;
    if not public.actor_is_org_admin(old.org_id) then
      raise exception 'user_profiles: only an org admin may change role or status'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists user_profiles_guard_privileged_columns on public.user_profiles;

create trigger user_profiles_guard_privileged_columns
before update on public.user_profiles
for each row
execute function public.user_profiles_guard_privileged_columns();
