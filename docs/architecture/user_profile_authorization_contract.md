# User Profile Authorization Contract

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Database-layer enforcement of `user_profiles` identity and role assignment |
| **Milestone** | Pre–AIM Alpha hardening (M10 close) |
| **Status** | Authoritative product contract — Builder / SQL applier makes zero product decisions from this document |
| **Verified against** | `main` at `05a9db6` · `database/migrations/20260104_complete_database_definition.sql` · `database/migrations/20260107_allow_profile_update.sql` · `database/migrations/20260107_add_user_status.sql` · `frontend/src/services/auth.ts` · `frontend/src/services/users.ts` · `frontend/src/pages/Users.tsx` · `frontend/src/components/settings/ProfileForm.tsx` |
| **References** | [`security_and_roles.md`](./security_and_roles.md) · [`supabase_setup.md`](./supabase_setup.md) · [`data_access.md`](./data_access.md) · vault/runtime constraint: live DB, no backups, founder is sole dashboard admin |
| **Non-goals** | Scoring/lifecycle RLS · `check_user_invite` granted to `anon` · `audit_logs` SELECT duplication / unbound `user_id` · blocking inactive users from authenticating · CSV/print PHI acknowledgement · Privacy/Terms · authorization redesign · frontend rewrites unless this contract names a SQL behaviour the current client already performs |

This document is the authoritative product contract for closing self-promotion and self-assignment on `user_profiles` without breaking legitimate administration, invited signup, or first-admin bootstrap.

It resolves semantic ambiguities so the SQL in §8 can be applied as written; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes applying SQL to the live project.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns product meaning (which columns are privileged, who may change them, how INSERT is trusted, verification, rollback). It references canonical SQL and client modules for structure. It does not restate full table DDL, unrelated RLS policies, or the Users page UI.

**Live-database constraint (binding):** The project has no backups and no PITR. The founder is the only person with Supabase dashboard access and the only administrator. Any change that strips or blocks his `admin` role is unrecoverable through the application. The prescribed SQL must be reversible from the SQL Editor as the database owner (RLS does not apply to that session), must not rewrite existing profile rows, and must not alter `get_my_org_id()` in a way that could recurse or lock org-scoped reads.

---

# 1. Goals

## 1.1 What this solves

A signed-in user can `PATCH` their own `user_profiles` row and set `role = 'admin'`, or set `org_id` to any organization UUID they know. That is Critical finding **M10**. The INSERT policy is the same class of hole on the create path: the client, not the database, is trusted to write `role` and `org_id`.

After this contract is applied:

> A user cannot change `role`, `org_id`, `status`, `email`, or `id` on their own row. An org admin can still change a **colleague’s** `role` and `status`. Invited signup still receives the invite’s org and role. First-admin bootstrap still creates an organization and an admin profile. The founder’s existing admin row is not rewritten.

## 1.2 What this explicitly does NOT solve

| Out of scope | Interaction with this proposal |
|--------------|--------------------------------|
| RLS on assessments / scores (`Manage assessments` / `Manage scores` are org-match `FOR ALL`) | None. Those policies read `get_my_org_id()`; this contract does not change that function’s body. |
| `check_user_invite` executable by `anon` | Unchanged. Signup still prefetches invite UX via that RPC. |
| Duplicated `audit_logs` SELECT / unbound `user_id` | None. |
| Inactive users still authenticating (M11) | Admin deactivation remains a `status` write. This contract does **not** add a status check to the admin actor test, matching today’s admin UPDATE policy. |
| CSV / printable-report PHI acknowledgement | None. |
| Privacy page / Terms | None. |

---

# 2. Verified current state

## 2.1 Table (live shape from applied migrations)

From `20260104_complete_database_definition.sql` plus `20260107_add_user_status.sql`:

| Column | Constraints | Notes |
|--------|-------------|--------|
| `id` | PK, FK → `auth.users(id)` | Equals `auth.uid()` for the row owner |
| `org_id` | NOT NULL, FK → `organizations(id)` | Tenant |
| `role` | NOT NULL, CHECK `admin` / `senior_therapist` / `therapist` / `viewer` | RBAC |
| `full_name` | text, nullable | Only field the Profile UI writes |
| `email` | text, nullable | Display copy of auth email; Profile UI is read-only |
| `created_at` | NOT NULL, default now() | |
| `status` | default `'active'`, CHECK `active` / `inactive` | Team UI activate/deactivate |

`docs/architecture/database_schema.md` lists `updated_at`; that column is **not** in the snapshot DDL. This contract does not assume it exists.

## 2.2 UPDATE policies (permissive; Postgres ORs them)

**Policy 1 — `"Allow update own profile"`** (`20260107_allow_profile_update.sql`):

```sql
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

No column restriction. Any authenticated user can update every column on their own row. This is M10.

**Policy 3 — `"Allow admins to update org members"`** (`20260107_add_user_status.sql`):

`USING` / `WITH CHECK`: exists a `user_profiles` row with `id = auth.uid()`, `role = 'admin'`, and `org_id` equal to the **target row’s** `org_id`.

This is the legitimate team-management path (`Users.tsx` → `userService.updateUser` for a colleague’s `role` or `status`). It must keep working.

The EXISTS subquery reads `user_profiles` from a `user_profiles` policy. It does **not** recurse in practice because it only needs the actor’s own row, which SELECT policy `"Allow view org members"` allows via `auth.uid() = id` without calling `get_my_org_id()`. Do not “simplify” this policy into a recursive subselect.

**Policy OR (question 5, verified):** For `UPDATE`, if **either** policy’s `USING` is true, the row may be updated; if **either** policy’s `WITH CHECK` is true, the new row is accepted.

| Actor / target | Policy 1 | Policy 3 | Combined today |
|----------------|----------|----------|----------------|
| Therapist updates own `role` | Pass | Fail (not admin) | **Pass — hole** |
| Therapist updates own `full_name` | Pass | Fail | Pass (intended) |
| Admin updates colleague `role` | Fail (`id` ≠ self) | Pass | Pass (intended) |
| Admin updates **own** `role` | Pass | Pass (admin of own org) | Pass — UI disables this (`Users.tsx` `isMe`); **API still allows self-demotion** |
| Admin sets colleague `org_id` to another org | Fail | Fail (`WITH CHECK` requires `admin.org_id = NEW.org_id`) | Fail (already) |

Tightening only policy 1’s `WITH CHECK` to freeze `role` **does not** stop an admin changing their own role: policy 3 still ORs true. Any proposal that ignores OR composition is incorrect.

## 2.3 INSERT policy

**`"Allow insert own profile"`** (`20260104_complete_database_definition.sql`):

```sql
for insert to authenticated
with check (auth.uid() = id);
```

Unguarded: the inserting user chooses `org_id` and `role`. This is the **same flaw** on create, not a different class. Nothing upstream constrains those values at the database.

## 2.4 How role and org reach a new profile (client is trusted today)

`claim_invite()` (`20260104_complete_database_definition.sql`) is `SECURITY DEFINER`. It:

1. Reads `auth.users.email` for `auth.uid()`
2. Finds `user_invites` by case-insensitive email
3. **Deletes** that invite
4. Returns the invite row as JSON
5. **Does not write `user_profiles`**

`authService.signUp` (`frontend/src/services/auth.ts`):

1. `signUp` → requires an immediate session (email confirmation off for Alpha — [`supabase_setup.md`](./supabase_setup.md) §2.1)
2. Calls `claim_invite()`
3. **If invite JSON present:** client `INSERT` into `user_profiles` with `org_id = invite.org_id`, `role = invite.role`
4. **Else (bootstrap):** client `INSERT` into `organizations` (`"Allow insert org for authenticated"` / `WITH CHECK (true)`), then `INSERT` into `user_profiles` with that `org.id` and `role = 'admin'`

`authService.signIn` late-claim: `claim_invite()` then **upsert** of `org_id` / `role`. Audit already notes this can silently move an existing user to the invited org. After this contract, that UPDATE path is **intentionally closed** (see §5.2).

**Consequence for INSERT hardening:** because `claim_invite` deletes the invite **before** the client inserts the profile, an INSERT `WITH CHECK` cannot validate against `user_invites` unless consume-on-claim is moved to after a successful profile insert.

## 2.5 `get_my_org_id()`

`SECURITY DEFINER` `STABLE` SQL: `select org_id from user_profiles where id = auth.uid()`. Exists to avoid RLS recursion on SELECT of org members. This contract must not replace it with an in-policy subselect on `user_profiles`. New helpers that read `user_profiles` from policies or triggers must also be `SECURITY DEFINER` with `SET search_path = public`.

## 2.6 What the application actually writes

| Path | Columns written | Must survive |
|------|-----------------|--------------|
| `ProfileForm.tsx` | `full_name` only, own row | Yes |
| `Users.tsx` | Colleague `role` or `status`; **self disabled** (`isMe`) | Yes |
| `auth.ts` signup insert | `id`, `full_name`, `email`, `org_id`, `role` | Yes |
| `auth.ts` late-claim upsert | Same, may overwrite existing `org_id`/`role` | No — silent org-move is not a product feature we must preserve |

---

# 3. Mechanism decision

## 3.1 Alternatives compared

| Approach | How it would work | Survives admin colleague updates? | Survives policy OR? | INSERT / bootstrap | Live-DB risk |
|----------|-------------------|-----------------------------------|---------------------|--------------------|--------------|
| **A. Own-row `WITH CHECK` freeze** via `SECURITY DEFINER` readers (`role = get_my_role()`, `org_id = get_my_org_id()`, …) | Policy 1 rejects privileged drift on self | Yes (policy 3 still ORs) | **No** — admin self-demotion/self-promotion-adjacent still passes policy 3 | INSERT untouched unless separately rewritten | Low for UPDATE-only; incomplete vs M10’s cousin (admin self-row) and INSERT |
| **B. Column privileges** (`REVOKE UPDATE` of `role` etc. from `authenticated`; `GRANT UPDATE (full_name)`) | Applies to the **database role**, not to a policy | **No** — admins also connect as `authenticated`; colleague role writes die | N/A | INSERT grants separate; still unguarded unless also revoked | High: one REVOKE bricks Team Members until an RPC exists |
| **C. Column privileges + admin RPC** | Direct UPDATE of privileged columns revoked; `SECURITY DEFINER` RPC for admin | Yes, if every client call site moves | Yes | Invite/bootstrap would also need RPCs | High: frontend change + new RPC on a DB with no backups |
| **D. `BEFORE UPDATE` trigger** `SECURITY DEFINER`, raise on privileged-column changes unless actor is admin of `OLD.org_id` acting on **another** row | Enforces after RLS allows the row; `OLD`/`NEW` do not re-enter RLS | Yes — colleague updates still use policy 3 + table UPDATE | **Yes** — trigger sees the row even when policy 3 ORs for self | INSERT still open unless separately constrained | Low: additive; no row rewrites; drop trigger to roll back |
| **E. `SECURITY DEFINER` RPC as only role-change path; revoke table UPDATE of privileged columns** | Same as C | Yes | Yes | Same as C | Rejected for Alpha blast radius |

### Column grants specifically

They cannot be the Alpha mechanism. `authenticated` is shared by staff and admins. Restricting `UPDATE (role)` blocks `"Allow admins to update org members"` unless admins stop using table UPDATE. That is an authorization redesign (approach C/E), not a hole close.

### Choice

**UPDATE: approach D (trigger).** Smallest change that closes M10 **and** the policy-OR self-row gap, keeps Team Members on `userService.updateUser`, does not touch `get_my_org_id()`, and rolls back with `DROP TRIGGER`.

**INSERT: replace the INSERT policy + stop deleting the invite inside `claim_invite` + consume the invite in an `AFTER INSERT` trigger.** Required because INSERT is the same flaw and `claim_invite` currently destroys the only trusted source of `org_id`/`role` before insert. This remains SQL-only; `auth.ts` already inserts the values `claim_invite` returns.

Rejected: leaving INSERT open (any signup can join a known org as admin). Rejected: moving profile creation into `claim_invite` (would double-insert / fail PK unless the frontend changed). Rejected: last-admin counting (see §5.1 — UI already forbids self-edit; matching that is simpler and protects the sole admin).

---

# 4. Privileged-column rules

| Column | Own row | Org admin on **another** member of the same org | Anyone else |
|--------|---------|--------------------------------------------------|-------------|
| `full_name` | **May change** | May change (unused by UI; not a privilege) | Denied by RLS |
| `role` | **Never** | **May change** | Never |
| `org_id` | **Never** | **Never** (no org-transfer product; policy 3 already rejects cross-org NEW) | Never |
| `status` | **Never** | **May change** (`active` / `inactive`) | Never |
| `email` | **Never** | **Never** (identity lives on `auth.users`; no UI writes this on UPDATE) | Never |
| `id` | **Never** | **Never** | Never |
| `created_at` | **Never** | **Never** | Never |

`INSERT` is not an own-row UPDATE. On INSERT, `role` and `org_id` may be set only as specified in §5.2.

---

# 5. Resolved questions 3–5

## 5.1 Can an admin change their own role? (Q3)

**Blocked.** An actor may not change `role`, `status`, or `email` on the row where `id = auth.uid()`, even if they are admin.

| Candidate | Implication | Why not for Alpha |
|-----------|-------------|-------------------|
| Permit self-demotion | Sole admin can lock themselves out of the app; recovery is dashboard-only | Violates the binding “founder cannot recover through the application” if they use Team Members or a crafted PATCH |
| Block only when it would leave zero admins | Protects sole-admin; needs a count; two-admin orgs can still self-demote | Extra complexity; UI already disables all self role/status edits (`Users.tsx` `isMe`) |
| **Block all self privileged writes** | Matches the UI; no last-admin query; API cannot do what the page forbids | **Chosen** |

Admins change colleagues’ roles. A second admin (when one exists) can change the first. The founder’s dashboard remains the break-glass for a true last-admin mistake made some other way.

## 5.2 The insert path (Q4)

**Yes, INSERT needs the same treatment.** Trusted sources:

| Path | Database rule |
|------|----------------|
| **Invited signup** | `WITH CHECK` succeeds only if a live `user_invites` row matches the actor’s `auth.users` email (case-insensitive), `NEW.org_id`, and `NEW.role`. After a successful insert, that invite is deleted. |
| **First-admin bootstrap** | `WITH CHECK` succeeds only if `NEW.role = 'admin'` and an `organizations` row exists with `id = NEW.org_id` and `created_by = auth.uid()`. No invite required. |
| **Anything else** | INSERT fails |

`claim_invite()` **stops deleting** the invite. It still returns the JSON the client uses to populate the insert. Deleting on claim is what made INSERT unverifiable; it also dropped invites if the subsequent insert failed.

**Late-claim upsert** (`signIn` when a profile already exists): UPDATE of `org_id`/`role` on own row will fail. That closes silent org-moves. Users **without** a profile still INSERT (invite still present). Leftover invites for users who already have a profile can be revoked in Team Members. This is an accepted behaviour change, not an underspecification.

**First-admin bootstrap** is preserved: create org (`created_by` defaults to `auth.uid()`), insert profile as `admin` of that org. Attack “insert `role=admin` into someone else’s org” fails because `created_by` will not be the attacker.

## 5.3 Multiple permissive policies (Q5)

Verified in §2.2. The trigger is the UPDATE enforcement that does not rely on one policy narrowing another. Policy 1 and policy 3 stay in place so existing `USING` paths (own name, admin colleague) keep working.

---

# 6. Recursion and `get_my_org_id()`

| Object | Recursion stance |
|--------|------------------|
| `get_my_org_id()` | **Unchanged.** Do not edit. |
| Invite match helper | `SECURITY DEFINER`, reads `user_invites` + `auth.users`, `SET search_path = public` |
| Admin test inside UPDATE trigger | `SECURITY DEFINER` read of actor’s `user_profiles` row (owner bypasses RLS) |
| Policy 3 EXISTS | Left as-is (own-row SELECT, no recursion today) |
| INSERT bootstrap EXISTS on `organizations` | Uses `created_by = auth.uid()`, which the org SELECT policy already allows **before** a profile exists (`id = get_my_org_id() OR created_by = auth.uid()`). `get_my_org_id()` is null at that moment; `created_by` is the working clause. |

---

# 7. Deployment order, sessions, blast radius

1. Apply §8 in the SQL Editor as the project owner (dashboard). **Do not** run `20260104_complete_database_definition.sql`.
2. The script does not `UPDATE` existing `user_profiles` rows. The founder’s `admin` role is not rewritten.
3. Safe to apply while the app is in use. In-flight `full_name` saves remain valid. In-flight colleague role/status saves remain valid. A crafted self-`role` PATCH starts failing immediately — that is the point.
4. JWTs do not store `user_profiles.role` (role is loaded from the table). Existing sessions stay valid. No sign-out required.
5. After apply, run §9 **before** treating the hole as closed.
6. If any §9 item fails, run §10 immediately. Do not attempt to “fix forward” on a live DB with no backups.

---

# 8. Exact SQL to apply

Run as a single script. Idempotent object names so a second apply does not stack triggers.

```sql
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
```

Postgres 14+ accepts `execute function`. If the live project is older and this statement errors, use `execute procedure` instead — same objects. That is a server-version syntax fork, not a product decision.

---

# 9. Founder verification checklist

Run **after** §8, **before** trusting the fix. The founder is currently the sole admin: create a **test therapist** (invite + signup) first. Do not test self-promotion using the founder account (that account must remain admin).

Use the browser as the named actor, or the SQL Editor **as that user** via `set request.jwt.claim.sub` only if comfortable; the intended proof is PostgREST from the app (devtools Network / console `supabase.from('user_profiles').update(...)`).

### Must fail

| # | Actor | Attempt | Expected |
|---|-------|---------|----------|
| F1 | Test therapist | `update({ role: 'admin' }).eq('id', self)` | Error; role unchanged |
| F2 | Test therapist | `update({ org_id: founder_org_or_other }).eq('id', self)` | Error; org unchanged |
| F3 | Test therapist | `update({ status: 'inactive' }).eq('id', self)` | Error |
| F4 | Test therapist | `update({ email: 'spoof@example.com' }).eq('id', self)` | Error |
| F5 | New signup (no invite) | Insert profile with founder `org_id` and `role: 'admin'` (skip creating an org, or create an org then insert into the **founder’s** org) | INSERT denied |
| F6 | Founder (admin) | `update({ role: 'therapist' }).eq('id', founder)` | Error — self-demotion blocked |

### Must succeed

| # | Actor | Attempt | Expected |
|---|-------|---------|----------|
| S1 | Founder | Profile form: change `full_name` | Saves |
| S2 | Founder | Team Members: change **test therapist** role (e.g. to `viewer` then back to `therapist`) | Saves |
| S3 | Founder | Team Members: deactivate then activate **test therapist** | Saves |
| S4 | New invited user | Invite as `therapist` → signup with that email → profile `org_id` and `role` match invite; invite row gone | Join works |
| S5 | First-admin bootstrap | On a **throwaway** auth user (or a second validation project), signup with a new org name and no invite | Org created; profile `role = 'admin'` of that org |

**S5 caution:** Do not perform first-admin bootstrap in a way that creates a second production org you cannot delete if that is operationally painful. If Alpha has only one org and no spare auth user, mark S5 as “verified by reading INSERT policy + org `created_by` rule” and run S5 on the validation project instead. Do **not** skip F5.

After F1–F6 and S1–S4 pass, M10 UPDATE and the INSERT cousin are closed.

---

# 10. Rollback SQL

Run from the SQL Editor as the project owner if anything in §9 is wrong. This restores prior **behaviour**; it does not require the application UI.

```sql
-- Rollback: user_profile_authorization_contract.md §10

drop trigger if exists user_profiles_guard_privileged_columns on public.user_profiles;
drop function if exists public.user_profiles_guard_privileged_columns();

drop trigger if exists user_profiles_consume_invite on public.user_profiles;
drop function if exists public.user_profiles_consume_invite();

drop policy if exists "Allow insert own profile" on public.user_profiles;

create policy "Allow insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.claim_invite()
returns json
language plpgsql
security definer
as $$
declare
  current_email text;
  invite_record record;
begin
  select email into current_email from auth.users where id = auth.uid();
  if current_email is null then return null; end if;
  select * into invite_record from user_invites where lower(email) = lower(current_email);
  if found then
    delete from user_invites where lower(email) = lower(current_email);
    return row_to_json(invite_record);
  else
    return null;
  end if;
end;
$$;

grant execute on function public.claim_invite() to authenticated;

drop function if exists public.invite_matches_profile_insert(uuid, text);
drop function if exists public.actor_is_org_admin(uuid);
```

`"Allow update own profile"` and `"Allow admins to update org members"` are **not** dropped; rollback does not recreate them. After §10 they again permit unguarded own-row UPDATEs (pre-fix M10).

If a test insert was consumed an invite and you roll back mid-signup, re-create that invite from Team Members.

---

# 11. Product invariants (QA-testable)

- [ ] **INV-UP1** A non-admin `UPDATE` of own `role` does not change the stored role.
- [ ] **INV-UP2** A non-admin `UPDATE` of own `org_id` does not change the stored org.
- [ ] **INV-UP3** An admin `UPDATE` of own `role` or `status` does not change those columns.
- [ ] **INV-UP4** An admin `UPDATE` of a colleague in the same org may change `role` and `status`.
- [ ] **INV-UP5** Own-row `UPDATE` of `full_name` succeeds for any authenticated member with a profile.
- [ ] **INV-UP6** `INSERT` into `user_profiles` with `role = 'admin'` and `org_id` of an org the actor did not create fails.
- [ ] **INV-UP7** Invited signup inserts a profile whose `org_id` and `role` match the invite; the invite row is absent afterwards.
- [ ] **INV-UP8** First-admin bootstrap (no invite) still inserts `role = 'admin'` for an org with `created_by = auth.uid()`.
- [ ] **INV-UP9** `get_my_org_id()` body is unchanged; org-member SELECT still works (no RLS recursion).
- [ ] **INV-UP10** Existing sessions remain valid after apply (no forced sign-out).

---

# 12. UNDERSPECIFIED — needs decision

None that block applying §8. Decisions that could have been invented and were not:

| Topic | How it was resolved |
|-------|---------------------|
| Last-admin counting vs block-self | Derived from `Users.tsx` `isMe` and the sole-admin recovery constraint |
| Exact INSERT trust source | Derived from `claim_invite` deleting before insert + `auth.ts` client insert |
| Whether late-claim may move existing users | Closed as a consequence of freezing own `org_id`/`role`; not a shipped UI feature |

If the live Postgres version rejects `execute function` on `CREATE TRIGGER`, use `execute procedure` — syntax only.

---

# 13. Closing contract statement

1. **UPDATE:** a `BEFORE UPDATE` trigger freezes privileged columns on self and allows `role`/`status` changes only when an org admin edits **another** member. Column grants are rejected because `authenticated` is shared.
2. **INSERT:** the unguarded own-row insert is the same hole; invite rows stay until a matching profile insert, then are consumed. Bootstrap remains “create org you own → insert admin of that org.”
3. Permissive policy OR is why tightening policy 1 alone is insufficient for admin self-row writes.
4. Apply §8, prove §9, keep §10 in the SQL Editor history. Do not treat the hole as closed until F1–F6 and S1–S4 pass.

_Document steward: Architecture Agent. Commit is a separate task after founder approval. Applying §8 to the live project is a founder SQL-Editor action, not an app deploy._
