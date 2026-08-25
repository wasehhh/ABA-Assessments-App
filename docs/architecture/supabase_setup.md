# Supabase setup (AIM Alpha — known working baseline)

## 1. Purpose

This document defines the **known working Supabase database setup** for the AIM Alpha test of the ABA Assessment Platform (Evalis SPA + `@supabase/supabase-js`). It exists so the Alpha environment is **reproducible** from repository artifacts—not dependent on undocumented SQL Editor edits or individual memory.

It aligns with project references:

- `docs/audits/current_state_audit_2026_05_02.md` (operational schema divergence / invite RPC gap)
- `docs/roadmap/aim_alpha_readiness_plan.md` (P0: stable, documented DB setup)
- `docs/roadmap/phase_0_cleanup_tracker.md` (P0-5 stabilization tasks)

---

## 2. Required environment variables (frontend)

Configure these in the Vite client environment (e.g. `frontend/.env` or hosting secrets). **Do not commit real keys.**

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) API key for browser client |

The app does not ship first-party REST APIs; the browser talks to Supabase directly using these values.

---

## 2.1 AIM Alpha validation — Supabase email confirmation

For **AIM Alpha validation** (including the fresh validation project **evalis-alpha-validation**), **Supabase Email Confirmation must be disabled** in the Supabase Auth settings **unless** the app ships a **post-confirmation bootstrap fix**.

**Reason:** The current signup path in `frontend/src/services/auth.ts` creates the **organization** and **admin** `user_profiles` row only when `signUp` returns an **active session immediately** (the “no session → check email” branch returns early and does not run org/profile creation). With **email confirmation enabled**, signup may still create the `auth.users` row but **not** complete org/admin setup until the user confirms email and a future deferred-bootstrap code path exists.

**Validated outcome:** **evalis-alpha-validation** passed **first-admin signup** after email confirmation was turned **off** in the Supabase project.

**Production / later hardening:** Email confirmation may be re-enabled **only after** implementing and verifying a **deferred bootstrap flow** (e.g. first authenticated session after confirmation creates org + profile, with idempotent guards and tests).

---

## 3. Required tables / objects

The application expects at minimum the following persistence layer (names as used in queries and policies):

| Object | Role |
|--------|------|
| `auth.users` | Supabase Auth identities (managed by Supabase; not created by app SQL). |
| `organizations` | Tenant org records. |
| `user_profiles` | Per-user profile row keyed to `auth.users`, including `org_id`, `role`, etc. |
| `user_invites` | Pending invites keyed by email for invite/join flows. |
| `clients` | Clients within an org. |
| `content_packs` | Uploaded/templated assessment frameworks (`pack_data`, snapshots). |
| `assessments` | Assessments linking client + pack snapshot + workflow status. |
| `assessment_cycles` | Per-assessment cycle rows (longitudinal scoring). |
| `assessment_scores` | Per-target (and cycle-aware) score rows. |
| `assessment_communication_reports` | Layer 2C clinician-authored communication report entity, versioned per assessment + cycle. |
| `audit_logs` | Append-only style audit trail for selected actions. |
| **`users` view** | `CREATE VIEW users AS SELECT * FROM user_profiles` (or equivalent). Referenced for compatibility with older policy/sql expectations (`frontend/supabase/migrations/20251211000000_add_users_view.sql`). |

RLS policies must allow org-scoped reads/writes consistent with the SPA’s queries (see snapshot and migration-derived policies).

---

## 4. Required RPC functions

These functions are **required**. Per-row notes record client call sites (`frontend/src/services/auth.ts`, `frontend/src/services/users.ts`) and database-internal status:

| Function | Purpose |
|----------|---------|
| `check_user_invite(lookup_email text)` | Looks up a pending invite by email (security definer pattern). The client expects a **set-returning** shape consumable as rows (see `authService.checkInvite`). |
| `claim_invite()` | As of `20260813` §8.2: returns the matching `user_invites` row as JSON for the current session email, or null; does not consume the invite. Not called from client code; retained as a database-internal function. |
| `complete_user_setup(p_full_name text, p_org_name text)` | `SECURITY DEFINER` with pinned `search_path` (`public, pg_temp`). Returns table `(ok boolean, mode text, org_id uuid, role text)`. Called from `authService.signUp` (after an immediate session) and `authService.signIn` (when no profile exists). |
| `cleanup_failed_signup()` | `SECURITY DEFINER` with pinned `search_path` (`public, pg_temp`). Returns table `(ok boolean, deleted_organizations integer)`. Called from `authService.signUp` after a `complete_user_setup` failure. |

**Important:** The root snapshot defines early variants of these functions; `20260106_update_rpc.sql` updates `check_user_invite` to return **`org_name`** as well (join to `organizations`). For Alpha, apply the supplemental RPC patch after the baseline definitions so invite UX matches the current frontend expectations.

Authoritative contract for the signup/setup path: `docs/architecture/user_lifecycle_contract.md`. This document does not restate it.

---

## 5. Migration / SQL source inventory

### 5.1 `frontend/supabase/migrations` (apply in filename order)

| Order | File | One-line purpose |
|------:|------|-------------------|
| 1 | `20250101000000_create_base_schema.sql` | Recovery/base tables (`organizations`, `user_profiles`, clients, packs, assessments, scores, `audit_logs`) + enable RLS. |
| 2 | `20251126224039_002_fix_rls_policies.sql` | Adjust RLS policies on core tables. |
| 3 | `20251210000000_fill_missing_schema.sql` | Fill schema gaps vs evolving app needs. |
| 4 | `20251211000000_add_users_view.sql` | Create `users` view from `user_profiles` for compatibility. |
| 5 | `20251211120000_secure_packs.sql` | Harden / scope content pack access. |
| 6 | `20251212000000_add_cycles.sql` | Introduce `assessment_cycles` and related behavior. |
| 7 | `20251213000001_fix_all_rls.sql` | Broad RLS reconciliation pass. |
| 8 | `20251213000002_restore_auth_policies.sql` | Restore/fix auth-adjacent policies. |
| 9 | `20251213000003_create_test_env.sql` | Seed a deterministic test org/user (dev-oriented; optional for production Alpha). |
| 10 | `20251213000004_add_client_status.sql` | Client `status` column (e.g. active/archived). |
| 11 | `20251213000005_add_pack_status.sql` | Pack `status` column. |
| 12 | `20251214000001_add_delete_policies.sql` | DELETE-capable policies where needed. |
| 13 | `20251215000000_add_score_metadata.sql` | Additional columns/metadata on score rows. |
| 14 | `20260727120000_assessment_scores_score_numeric.sql` | Ensure `assessment_scores.score` is `numeric` (decimal-safe; idempotent). |

**Gap (documented):** None of the above migration files define **`check_user_invite`** or **`claim_invite`** (verified by repository search). Invite RPCs live in the **`database/migrations/`** snapshot and patches (see §5.2).

### 5.0 Two SQL locations in this repository

| Path | Role |
|------|------|
| **`database/migrations/`** | **Canonical SQL bundle** for snapshots, dated policy/RPC patches, and operational scripts. Use these paths in documentation and for **manual** “apply in order” setup in Supabase SQL Editor or psql. |
| **`frontend/supabase/migrations/`** | **Supabase CLI migration chain** (timestamp-prefixed files) for `supabase link` / `supabase db push` style workflows. This chain may not include every object defined in `database/migrations/` (e.g. invite RPCs)—see §6. |

Do not assume the two trees are identical; reconcile drift before treating either as the only source of truth.

### 5.2 `database/migrations` (canonical snapshot & patches)

| File | One-line purpose |
|------|------------------|
| `database/migrations/20260104_complete_database_definition.sql` | **Destructive** “clean slate” script: drops/recreates core tables, RLS policies, helper functions, and **`check_user_invite` / `claim_invite`** definitions. |
| `database/migrations/20260105_seed_test_pack.sql` | Optional seed data for a test content pack (development/demo). |
| `database/migrations/20260106_update_rpc.sql` | Replaces `check_user_invite` to return **`org_name`** (table-shaped result set). |
| `database/migrations/20260107_add_user_status.sql` | Adds `user_profiles.status`; adds admin-driven profile update policy. |
| `database/migrations/20260107_allow_profile_update.sql` | Policy for users updating their own profile fields. |
| `database/migrations/20260108_audit_view_policy.sql` | Admin SELECT policy on `audit_logs`. |
| `database/migrations/20260108_org_update_policy.sql` | Admin UPDATE policy on `organizations`. |
| `database/migrations/20260727_assessment_scores_score_numeric.sql` | Ensure `assessment_scores.score` is `numeric` (decimal-safe; idempotent). |
| `database/migrations/20260813_user_profile_authorization.sql` | M10 close: `user_profiles_guard_privileged_columns` trigger + hardened INSERT policy on `user_profiles`; **replaces** the snapshot’s delete-on-claim `claim_invite()` with a return-don’t-consume version. |
| `database/migrations/20260819_assessment_communication_reports.sql` | Creates `assessment_communication_reports` (Layer 2C clinician-authored report entity) + its RLS. |
| `database/migrations/20260823_content_packs_updated_at.sql` | Adds `content_packs.updated_at` + `set_updated_at()` BEFORE UPDATE trigger. |
| `database/migrations/20260824_ul_a1_complete_user_setup_functions.sql` | Adds `public.complete_user_setup(p_full_name, p_org_name)` and `public.cleanup_failed_signup()` (SECURITY DEFINER, pinned `search_path`). |

**Not canonical schema setup** (operational / one-off data fixes—do not use as standard Alpha provisioning):

- `database/migrations/20260106_fix_niazi_data.sql`
- `database/migrations/20260106_force_confirm_user.sql`
- `database/migrations/20260106_force_confirm_pending.sql`
- `database/migrations/20260106_restore_missing_profile.sql`
- `database/migrations/20260106_restore_both_profiles.sql`

---

## 6. Known schema drift / risk

Read this section before choosing an apply path.

1. **`frontend/supabase/migrations` and `database/migrations/` are not one unified story.** The audit notes *operational schema divergence*: migrate-only environments can lack invite RPCs unless supplemental SQL from **`database/migrations/`** is applied.
2. **Invite/RPC functionality depends on scripts under `database/migrations/`** (`check_user_invite`, `claim_invite` appear in the snapshot/patches there, not in every `frontend/supabase/migrations/*.sql` file).
3. **AIM Alpha must follow one documented sequence** per environment (snapshot-first **or** migrations-first **plus** explicit supplemental RPC/RLS patches). Ad hoc SQL Editor changes without updating this document defeat reproducibility.
4. The January 2026 snapshot (`database/migrations/20260104_complete_database_definition.sql`) **drops existing application tables** in its preamble—treat it as **destructive** and only on empty or deliberately reset databases.

---

## 7. Canonical AIM Alpha apply order (recommended)

**Chosen approach:** **Snapshot-first, then dated deltas.** This yields a single coherent baseline that includes invite RPCs, full table set, and RLS, then layers known January 2026 policy/RPC patches tracked under **`database/migrations/`**.

On an **empty** Supabase database (or one you intend to wipe—see script warnings):

1. Run **`database/migrations/20260104_complete_database_definition.sql`** end-to-end.  
   - Establishes tables, RLS, helper functions, and initial **`check_user_invite` / `claim_invite`**.
2. Run **`database/migrations/20260106_update_rpc.sql`**.  
   - Aligns `check_user_invite` with frontend expectations (includes **`org_name`**; table return shape).
3. Run **`database/migrations/20260107_add_user_status.sql`**.
4. Run **`database/migrations/20260107_allow_profile_update.sql`**.
5. Run **`database/migrations/20260108_audit_view_policy.sql`**.
6. Run **`database/migrations/20260108_org_update_policy.sql`**.
7. Run **`database/migrations/20260727_assessment_scores_score_numeric.sql`**.  
   - Ensures `assessment_scores.score` is `numeric` so decimal scores persist (idempotent).
8. Run **`database/migrations/20260813_user_profile_authorization.sql`**.  
   - Establishes M10 close: `user_profiles_guard_privileged_columns` trigger + hardened INSERT policy on `user_profiles`; **replaces** the snapshot’s delete-on-claim `claim_invite()` with a return-don’t-consume version.
   - **Warning:** Skipping this step leaves self-role-escalation open with no RLS fallback. The trigger is the sole UPDATE boundary — `Allow update own profile` remains `(auth.uid() = id)` with no column restriction.
   - Postgres 14+ syntax fork: if `execute function` errors on an older server, use `execute procedure`.
   - The trigger fires for every writer including the Supabase SQL Editor and `service_role` where `auth.uid()` is NULL, so dashboard edits to any user’s `role`/`status` will fail. Read this file’s OPERATIONAL NOTE for the break-glass path.
9. Run **`database/migrations/20260819_assessment_communication_reports.sql`**.  
   - Establishes `assessment_communication_reports` (Layer 2C clinician-authored report entity) and its RLS.
10. Run **`database/migrations/20260823_content_packs_updated_at.sql`**.  
    - Establishes `content_packs.updated_at` and the `set_updated_at()` BEFORE UPDATE trigger.
11. Run **`database/migrations/20260824_ul_a1_complete_user_setup_functions.sql`**.  
    - Establishes `public.complete_user_setup(p_full_name, p_org_name)` and `public.cleanup_failed_signup()` (SECURITY DEFINER, pinned `search_path`).

Optional after baseline:

- **`database/migrations/20260105_seed_test_pack.sql`** — only if you need seeded pack content in non-production.

**Do not** run the **`frontend/supabase/migrations/`** CLI chain **and** the full **`database/migrations/`** snapshot on the same database without a deliberate merge plan—they overlap in intent and will conflict.

**Alternative (CLI migrations path):** If you provision exclusively via `frontend/supabase/migrations` in order, you **must** still apply invite/RPC definitions equivalent to the snapshot function section **plus** `database/migrations/20260106_update_rpc.sql`, then reconcile whether remaining patches (`20260107*`, `20260108*`) from **`database/migrations/`** are already represented in your merged state. You **must** also apply these required supplemental SQL files, which are not present in `frontend/supabase/migrations/`: **`database/migrations/20260813_user_profile_authorization.sql`**, **`database/migrations/20260819_assessment_communication_reports.sql`**, **`database/migrations/20260823_content_packs_updated_at.sql`**, and **`database/migrations/20260824_ul_a1_complete_user_setup_functions.sql`**. This path is **higher risk** of drift unless diffed carefully against the snapshot.

---

## 8. Verification checklist

Use this after applying the canonical sequence (or an explicitly reviewed equivalent). Unchecked items require a human/QA pass in a real project.

| Check | Description |
|-------|-------------|
| ☐ | App loads without Supabase config errors (`VITE_*` present and valid). |
| ☐ | Login works (`signInWithPassword`). |
| ☐ | **First-admin signup (new org, no invite):** First signup creates **organization** and **admin** profile (`user_profiles`). (Requires immediate session at signup; see §2.1 — disable email confirmation for Alpha unless a post-confirmation bootstrap is implemented.) |
| ☐ | Invite lookup works (`check_user_invite` / UI prefetch). |
| ☐ | **Invite-based signup:** Completes via `complete_user_setup` and results in a profile row bound to the inviting organization, with no empty bootstrap organization left behind. |
| ☐ | Authenticated non-admin user cannot change their own `user_profiles.role` or `status` (rejects with `42501`). |
| ☐ | Create client works. |
| ☐ | Create assessment works. |
| ☐ | Score target works (scores persist). |
| ☐ | Submit assessment works. |
| ☐ | Approve assessment works (approver role). |
| ☐ | Start new cycle works after approval constraints. |
| ☐ | Audit log writes rows for instrumented actions and admin can view where policies allow. |

---

## 9. Known gaps / future cleanup

- **Future work:** Consolidate toward **one authoritative migration path** (single ordered migration chain or generated schema from snapshot) so `supabase db push` / CI reflects production without manual patches.
- **Phase 0 scope:** No schema redesign—this document records **stability and reproducibility** for AIM Alpha, not a new data model.

---

_Document version aligns with repository layout as of 2026-08-24 (canonical SQL inventory through `database/migrations/20260824_ul_a1_complete_user_setup_functions.sql`). Update this file when SQL inventory or canonical order changes._
