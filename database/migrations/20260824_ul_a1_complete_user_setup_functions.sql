-- =============================================================================
-- UL-A1: Atomic signup healing for user identity + organization bootstrap
-- Adds SECURITY DEFINER functions:
--   - public.complete_user_setup(p_full_name text, p_org_name text)
--   - public.cleanup_failed_signup()
--
-- Contract: docs/architecture/user_lifecycle_contract.md (§5.3, §5.0)
-- Security: SECURITY DEFINER with pinned search_path (public, pg_temp)
-- Apply method: MANUAL via Supabase SQL editor (founder-run) — not auto-applied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- complete_user_setup(p_full_name, p_org_name)
-- -----------------------------------------------------------------------------
create or replace function public.complete_user_setup(
  p_full_name text,
  p_org_name text
)
returns table (
  ok boolean,
  mode text,
  org_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_email text;

  v_existing_org_id uuid;
  v_existing_role text;

  v_invite_count integer;
  v_invite_org_id uuid;
  v_invite_role text;

  v_empty_org_count integer;
  v_target_org_id uuid;
  v_target_role text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'complete_user_setup: missing auth.uid()';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null then
    raise exception 'complete_user_setup: missing auth.users.email for caller';
  end if;

  -- (2) Idempotency: if profile already exists, return success without changes.
  if exists (select 1 from public.user_profiles up where up.id = v_uid) then
    select up.org_id, up.role
      into v_existing_org_id, v_existing_role
    from public.user_profiles up
    where up.id = v_uid;

    return query
    select true, 'already_exists', v_existing_org_id, v_existing_role;
    return;
  end if;

  -- (3) Invited path: if matching user_invites row exists, insert profile
  -- using invite's org_id + role. user_profiles_consume_invite trigger
  -- consumes invites; this function must not delete invites itself.
  -- Fail closed on case-variant duplicate invites (email PK is case-sensitive).
  select count(*)
    into v_invite_count
  from public.user_invites ui
  where lower(ui.email) = lower(v_email);

  if v_invite_count > 1 then
    raise exception
      'complete_user_setup: multiple case-variant invites match caller email';
  end if;

  if v_invite_count = 1 then
    select ui.org_id, ui.role
      into v_invite_org_id, v_invite_role
    from public.user_invites ui
    where lower(ui.email) = lower(v_email);

    v_target_org_id := v_invite_org_id;
    v_target_role := v_invite_role;

    insert into public.user_profiles (id, org_id, role, full_name, email)
    values (v_uid, v_target_org_id, v_target_role, p_full_name, v_email);

    return query
    select true, 'invite', v_target_org_id, v_target_role;
    return;
  end if;

  -- (4) Bootstrap path: create/reuse an organization created by caller and
  -- with no members, then insert an admin profile for it.
  if p_org_name is null or btrim(p_org_name) = '' then
    raise exception 'complete_user_setup: org name required when no invite exists';
  end if;

  -- Count empty bootstrap orgs owned by the caller (no members).
  select count(*)
    into v_empty_org_count
  from public.organizations o
  where o.created_by = v_uid
    and not exists (
      select 1
      from public.user_profiles up
      where up.org_id = o.id
    );

  if v_empty_org_count > 1 then
    raise exception
      'complete_user_setup: multiple empty bootstrap organizations exist for caller';
  end if;

  if v_empty_org_count = 1 then
    select o.id
      into v_existing_org_id
    from public.organizations o
    where o.created_by = v_uid
      and not exists (
        select 1
        from public.user_profiles up
        where up.org_id = o.id
      );

    -- Reuse: update name to the caller-supplied org name (Defect 3).
    update public.organizations
    set name = p_org_name
    where id = v_existing_org_id;
  else
    insert into public.organizations (name, created_by)
    values (p_org_name, v_uid)
    returning id into v_existing_org_id;
  end if;

  v_target_org_id := v_existing_org_id;
  v_target_role := 'admin';

  -- Internal reproduction of M10 bootstrap authorization rule:
  -- M10 requires role='admin' AND exists(organizations where id=org_id and created_by=auth.uid()).
  if not exists (
    select 1
    from public.organizations o
    where o.id = v_target_org_id
      and o.created_by = v_uid
  ) then
    raise exception 'complete_user_setup: bootstrap org must be owned by caller';
  end if;

  -- Contract constraint: bootstrap org must have no members.
  if exists (
    select 1
    from public.user_profiles up
    where up.org_id = v_target_org_id
  ) then
    raise exception 'complete_user_setup: bootstrap org already has members';
  end if;

  insert into public.user_profiles (id, org_id, role, full_name, email)
  values (v_uid, v_target_org_id, v_target_role, p_full_name, v_email);

  return query
  select true, 'bootstrap', v_target_org_id, v_target_role;
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- cleanup_failed_signup()
-- Option (a): extend guards so any referencing row excludes the org from
-- candidates; never raise on FK; report zero deletions. Does not delete
-- audit_logs / user_invites (contract §2 — audit history not disposable).
-- -----------------------------------------------------------------------------
create or replace function public.cleanup_failed_signup()
returns table (
  ok boolean,
  deleted_organizations integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_deleted integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'cleanup_failed_signup: missing auth.uid()';
  end if;

  -- Delete empty organizations owned by the caller only when no referencing
  -- rows exist anywhere. Fail closed: leave the org behind rather than
  -- raising a foreign-key violation or deleting audit history.
  with candidates as (
    select o.id
    from public.organizations o
    where o.created_by = v_uid
      and not exists (
        select 1 from public.user_profiles up where up.org_id = o.id
      )
      and not exists (
        select 1 from public.user_invites ui where ui.org_id = o.id
      )
      and not exists (
        select 1 from public.audit_logs al where al.org_id = o.id
      )
      and not exists (
        select 1 from public.clients c where c.org_id = o.id
      )
      and not exists (
        select 1 from public.content_packs cp where cp.org_id = o.id
      )
      and not exists (
        select 1 from public.assessments a where a.org_id = o.id
      )
      and not exists (
        select 1 from public.assessment_cycles ac where ac.org_id = o.id
      )
      and not exists (
        select 1
        from public.assessment_scores ascore
        join public.assessments a on a.id = ascore.assessment_id
        where a.org_id = o.id
      )
      and not exists (
        select 1
        from public.assessment_communication_reports r
        where r.org_id = o.id
      )
  )
  delete from public.organizations o
  using candidates c
  where o.id = c.id;

  get diagnostics v_deleted = row_count;

  return query
  select true, v_deleted;
  return;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants (contract requirement): execute granted to authenticated only.
-- -----------------------------------------------------------------------------
revoke all on function public.complete_user_setup(text, text) from public, anon;
revoke all on function public.cleanup_failed_signup() from public, anon;

grant execute on function public.complete_user_setup(text, text) to authenticated;
grant execute on function public.cleanup_failed_signup() to authenticated;

-- -----------------------------------------------------------------------------
-- Verification block (commented out)
-- -----------------------------------------------------------------------------
-- 1) Functions exist + are SECURITY DEFINER
-- select p.proname,
--        p.prosecdef,
--        array_to_string(p.proconfig, ', ') as proconfig
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('complete_user_setup', 'cleanup_failed_signup');
--
-- 2) Grants are correct (authenticated has execute; public/anon do not)
-- select
--   has_function_privilege('authenticated', 'public.complete_user_setup(text, text)', 'execute') as authenticated_can_complete,
--   has_function_privilege('public',       'public.complete_user_setup(text, text)', 'execute') as public_can_complete,
--   has_function_privilege('anon',         'public.complete_user_setup(text, text)', 'execute') as anon_can_complete;
--
-- select
--   has_function_privilege('authenticated', 'public.cleanup_failed_signup()', 'execute') as authenticated_can_cleanup,
--   has_function_privilege('public',       'public.cleanup_failed_signup()', 'execute') as public_can_cleanup,
--   has_function_privilege('anon',         'public.cleanup_failed_signup()', 'execute') as anon_can_cleanup;
--
-- 3) Search path pinned check
-- (proconfig should include: search_path=public, pg_temp)
-- select p.proname,
--        array_to_string(p.proconfig, ', ') as proconfig
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('complete_user_setup', 'cleanup_failed_signup');
