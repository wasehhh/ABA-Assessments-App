# EVALIS COMPLETE CODEBASE AUDIT — Pre-Alpha Continuation

**Date:** 2026-06-10  
**Audited commit:** `4a388b6` (`main` = `origin/main`)  
**Auditor role:** Cursor Overseer Agent (read-only audit)  
**Working tree:** Clean except untracked `docs/alpha/alpha_smoke_test_plan.md`

**Toolchain at audit time:**
- Build: ✅
- Tests: ✅ (1 file / 2 tests)
- Typecheck: ❌ (54 errors / 10 files)
- Lint: Not run in CI

---

## 1. Executive Summary

The core Alpha workflow (login → client → pack → assessment → score → submit → review → approve → report/export) is **code-complete and functional for numeric 0–4 packs**. The recent fix wave is **verified present**: request-id guards on score loads, `createScore` missing-row fallback with idempotency check, modal note reset + flush-on-navigate, empty-score domain rendering, and the clinical wording pass (no more "Mastered", "Submit Anyway", "Invitation sent", "Clinical Insights"; mastery is now scale-aware "At Maximum Score"; invite copy is honest).

The remaining risk concentrates in four areas:

1. **The printable report misrepresents data** — unscored targets render as `0/4` and max score is hardcoded to 4 (wrong for yes/no packs, which the runbook allows). This is the one finding that can put **incorrect clinical data in front of AIM leadership**.
2. **Authorization is app-level, not RLS-level** — RLS provides tenant isolation only; lifecycle/role rules are bypassable via devtools, including **self role-escalation** through the `user_profiles` update policy. Documented and acceptable for a trusted controlled Alpha; **not** for external pilots.
3. **Silent failure paths** — several list loaders have no `.catch()` (stuck "Loading..."), report load failures are console-only, ContentPacks builder errors are set but never rendered.
4. **Hygiene debt** — 54 typecheck errors, PHI-adjacent console logging (`analytics.ts` logs every target+score per recalc), real personal email/UUIDs in tracked one-off SQL, four stale Next.js-era architecture docs that will mislead future agents.

---

## 2. Overall Alpha Readiness Verdict

### **GO with constraints**

No finding prevents assessment completion through the happy path with numeric 0–4 packs in Chrome. But the verdict is conditional on:

1. Fixing the **report unscored/max-score misrepresentation** (or restricting Alpha to numeric-only packs *and* fully-scored-before-print, which weakens the runbook's yes/no allowance).
2. Removing **console logging of target titles + scores** before any session on shared machines.
3. Running the **human smoke test** (§14) on the actual Alpha Supabase project — several behaviors (RLS deployment state, invite RPC shape, duplicate-row timing) are environment-dependent and cannot be code-verified.

---

## 3. Critical Blockers

Only one finding meets the strict blocker definition ("expose data incorrectly / corrupt trust").

### B1 — Printable report renders unscored targets as `0/4` and hardcodes max = 4

| Field | Detail |
|-------|--------|
| **Files** | `frontend/src/pages/AssessmentReport.tsx` (~L185–207) |
| **Evidence** | `const val = score?.score ?? 0;` and `const max = 4;` — unscored targets display as `0/4` with an empty bar, indistinguishable from a true score of 0 ("no skill"). Yes/no targets (max 1, explicitly **in scope** per `alpha_runbook.md`) display as `/4`. |
| **Risk** | A printed clinical document shown to AIM leadership conflates "not assessed" with "no skill" and shows wrong denominators. This is exactly the "data summary" the report disclaimer promises is accurate. |
| **Recommended fix** | Distinguish unscored (e.g. "—" / "Not scored") from 0; derive per-target max from `scoring` using the same logic as `analytics.ts` (a shared helper already effectively exists there). Narrow, low-risk change confined to the report. |
| **Owner** | **Builder**, then **QA** (print verification in Chrome) |

---

## 4. Major Issues

| # | Issue | File(s) | Evidence / Risk | Recommended fix | Owner |
|---|-------|---------|------------------|------------------|-------|
| M1 | **Concurrent score-update rollback race** — each `updateScore` snapshots `priorScores` at call start; a failing later call rolls back a succeeded earlier one (UI only; DB intact until reload) | `AssessmentMatrix.tsx` ~L267–354 | Rapid multi-target scoring is normal clinician behavior; UI can show wrong scores | Functional rollback (`setScores(prev => …)` reverting only the affected target), or per-target in-flight queue | Builder |
| M2 | **No DB unique constraint on `assessment_scores (assessment_id, cycle_id, target_id)`** + check-then-insert fallback race | `database/migrations/*`, `assessments.ts` `createScore` | Duplicate rows possible (legacy/orphan rows + double-click); `scores.find()` by target_id becomes ambiguous | Add `UNIQUE` constraint via a new migration (post-smoke, pre-Alpha if DB is fresh) | Builder + QA |
| M3 | **Submit does not lock cycle; UI says it will** | `assessments.ts` `submit` (TODO at ~L505), submit dialog copy | Copy/behavior mismatch; therapists are still blocked by assessment status, so functional impact is limited — but it's a stated-behavior lie | Either lock cycle on submit or soften dialog copy to "submits for review" | Builder (copy fix is cheapest) |
| M4 | **State not reset on assessment/cycle navigation** — `activeDomainId`, `showTargetInfo`, `activeTargetIndex`, `compareCycleId` survive `assessmentId` changes | `AssessmentMatrix.tsx` | Wrong domain/modal/compare context if navigating directly between assessments. Low real-world exposure (navigation usually passes through the list page, which unmounts the matrix) | Reset view state in the `assessmentId` effect, or key the component by `assessmentId` in `App.tsx` (one-line fix) | Builder |
| M5 | **Stuck loading states** — `Assessments.loadAssessments` and `Clients.loadClients` / `ContentPacks.loadPacks` have no `.catch()`; failure leaves permanent "Loading..." | `Assessments.tsx` ~L117, `Clients.tsx` ~L37, `ContentPacks.tsx` ~L30 | A transient Supabase error mid-session bricks the page until refresh | Add catch → error banner + clear loading | Builder |
| M6 | **Report/cycle-score load failures are console-only** | `AssessmentReport.tsx` ~L46, `AssessmentMatrix.tsx` `loadCycleScores` ~L181 | Clinician sees empty/partial data with no explanation — trust damage | Surface error states | Builder |
| M7 | **ContentPacks error state never rendered for builder save / archive** — `setError` only displays inside the upload form | `ContentPacks.tsx` ~L80–100, L185 | Failed pack edit/archive looks like success | Render error banner at page level | Builder |
| M8 | **PHI-adjacent console logging** — `analytics.ts` logs every target title + score on every stats recalc (~200 lines/click on a 100-target pack); `audit.ts` logs full row on failure | `analytics.ts` L54–55, L71; `audit.ts` ~L114 | Devtools on shared clinical machines exposes scores; also real perf drag | Delete/guard the logs | Builder |
| M9 | **54 TypeScript errors** — incl. `Users.tsx` using `status` not on `UserProfile`, `exportUtils.ts` using `s.cycle` not on `AssessmentScore`, `yes_no` vs `ScoringType` non-overlap warnings | 10 files (top: `AssessmentBuilder.tsx` 21, `Users.tsx` 9, `exportUtils.*` 12) | Type system no longer guards refactors; the `status`/`cycle` gaps are real type-model drift, masking future bugs | Fix types (`UserProfile.status?`, score `cycle?` join type); chore-level | Builder |
| M10 | **Self role-escalation via `user_profiles` UPDATE RLS** — `20260107_allow_profile_update.sql` permits `auth.uid() = id` with no column restriction; devtools call can set `role='admin'` | `database/migrations/20260107_allow_profile_update.sql` | Worst of the RLS gaps. Acceptable only because Alpha users are trusted + test data | Column-restricted policy or trigger guard; track as pre-external-pilot hard gate | Security/Compliance |
| M11 | **Inactive user status is cosmetic** — no auth/RLS check blocks `status='inactive'` users | `auth.ts`, `20260107_add_user_status.sql` | Admin "deactivates" someone who can still log in — misleading admin UI | Either check status on profile load (app-level, cheap) or document clearly | Builder + Documentation |
| M12 | **Tracked one-off SQL contains real email + UUIDs and auth-bypass scripts** | `database/migrations/20260106_fix_niazi_data.sql`, `20260106_force_confirm_*.sql` | Public GitHub repo; accidental-execution risk; unprofessional if AIM reviews the repo | Move to gitignored `database/ops/` or delete; strip PII | Builder + Security/Compliance |
| M13 | **Builder edit roundtrip data loss** — editing a pack with `useGlobalScale` default `true` overwrites all per-target `scale_labels` with `{}`; per-target scoring UI hidden by default | `AssessmentBuilder.tsx` L44, L146–156 | Admin "fixes a typo" in a pack and silently wipes score definitions | On edit, hydrate global labels from pack or default `useGlobalScale=false` for edits | Builder |
| M14 | **No JSON upload validation** — `JSON.parse` straight to storage; legacy `name` vs `title` packs (e.g. `dummy_pack.json`) upload fine and render blank | `ContentPacks.tsx` ~L52, `frontend/src/data/dummy_pack.json` | Garbage-in during pack setup creates confusing blank assessments | Minimal shape check (domains/targets/title present) | Builder |

---

## 5. Minor Issues

| # | Issue | File(s) | Recommendation |
|---|-------|---------|-----------------|
| m1 | Compare dropdown filters by `currentCycle` not `selectedCycleId`; `loadCycleScores` closes over possibly-stale `cycles` | `AssessmentMatrix.tsx` | Tidy when touching matrix |
| m2 | "New Cycle" button visible when assessment not approved; error only after confirm | `AssessmentMatrix.tsx` ~L544 | Hide unless `approved` |
| m3 | Modal note can double-save (blur + flush-on-navigate) | `TargetDetailModal.tsx` | Debounce/guard |
| m4 | `window.location.reload()` after approve/new-cycle | `AssessmentMatrix.tsx` | Acceptable; replace with reload-in-place post-Alpha |
| m5 | Dead state: `showFinalizeConfirm`, `activeTab` | `AssessmentMatrix.tsx` | Delete |
| m6 | Dashboard/ClientDetail fetch full tables for counts/filtering | `Dashboard.tsx`, `ClientDetail.tsx` | Server-side counts post-Alpha |
| m7 | Audit log fixed 100-row cap, no paging | `AuditLog.tsx` | Post-Alpha |
| m8 | Export clamps scores silently (`Math.min`); checkbox max-score branch missing | `exportUtils.ts` | Align with shared max helper when fixing B1 |
| m9 | StrictMode double-fires the matrix VIEW audit log in dev | `AssessmentMatrix.tsx` | Ignore (dev only) |
| m10 | `check_user_invite` granted to `anon` → email/org enumeration | `20260104…sql`, `20260106_update_rpc.sql` | Pre-external-pilots |
| m11 | Raw Supabase `err.message` surfaced to users in several banners | multiple pages | Sanitize pre-external-pilots |
| m12 | Bolt OG image + Vite favicon in `index.html`; `frontend/README.md` is one line; `DEPLOYMENT.md` wrong migration path + Node 18 vs 20 | `index.html`, `frontend/README.md`, `frontend/DEPLOYMENT.md` | Quick cleanup |
| m13 | CSV parser: multi-line quoted fields break; `materials` not enforced | `packs.ts` | Document constraint in template note |
| m14 | `alpha_smoke_test_plan.md` untracked in git | `docs/alpha/` | Commit it |
| m15 | Mobile nav missing Org/Audit links for admin | `Layout.tsx` | Pre-pilots |

---

## 6. Accepted Alpha Limitations

These are fine for a controlled Alpha **because they are documented** (runbook/lifecycle docs) and the test group is small and trusted:

1. **App-level (not RLS) lifecycle/role enforcement** — explicitly stated in `assessment_lifecycle.md` and the runbook §8.
2. **Chrome-only printing**; Safari blank print preview.
3. **Numeric + yes/no packs only**; checkbox/task-analysis and text scoring are authorable but not implemented end-to-end (matrix shows 0–4 buttons, server clamps to 4, analytics max diverges) — **must stay excluded**.
4. **Manual invite delivery** (copy link / mailto); copy is now honest.
5. **No return-to-therapist revision workflow** after submit.
6. **Email confirmation off** in Supabase Auth (per `supabase_setup.md` §2.1) until deferred bootstrap exists.
7. **Mobile**: submit/approve/new-cycle hidden below `sm` breakpoint; full mobile out of scope.
8. **No pagination** anywhere; fine at Alpha data volumes.
9. **Audit logging is best-effort app-level**, failures swallowed.
10. **Supabase session in localStorage** (supabase-js default) — acceptable for Alpha devices, flag for shared workstations.

---

## 7. Deferred Post-Alpha Items

- RLS hardening program (role+lifecycle policies or SECURITY DEFINER RPC layer) — top of post-Alpha queue
- Checkbox/task-analysis end-to-end scoring (UI, metadata writes, max-score unification)
- Cycle selector for viewing historical cycles as primary
- Pagination, server-side counts, list virtualization
- Error-message sanitization, export filename de-identification
- Session storage policy for shared workstations; inactive-user enforcement at auth layer
- Pack versioning semantics (currently frozen on edit)
- E2E test suite; CSV-parser unit tests
- SSO/billing/analytics/mobile — out of scope, keep out

---

## 8. Architecture / Data Model Findings

**The model is sound and consistent**: `pack_snapshot` (frozen structure) → `assessment_scores` (state, cycle-linked) → `assessment_cycles` (time layer) → reports/exports (derived). Code-confirmed:

- `calculateDomainStats` derives structure from the **pack**, not from scores — empty-score rendering fixed correctly.
- Score rows are bulk-created at assessment creation and cycle start; `createScore` fallback handles orphans with an idempotency pre-check (race window remains, M2).
- `getScores` includes the cycle join (`cycle:assessment_cycles(cycle_number, status)`) — `exportUtils`' `s.cycle` references are valid at runtime (though **not typed** — M9).
- `canEditAssessmentScores` is the single rules source, applied in UI **and** re-checked server-side in `updateScore`/`createScore` — good pattern.
- Weaknesses: no DB uniqueness on score rows (M2), submit doesn't lock cycles (M3), `ensureActiveCycle` doesn't backfill rows (acceptable given the fallback), `pack_snapshot_id` type inconsistency (TEXT vs UUID) between migration trees.

---

## 9. Security / Compliance Findings

- **No secrets tracked**: no `.env`, no JWT-like strings, `.env.example` placeholders only; `frontend/supabase/.temp` ignored. ✅
- **Tenant isolation is real** (org-scoped RLS via `get_my_org_id()`), but **authorization is not**: any org member can mutate scores/assessments/clients regardless of role or lifecycle via direct API; viewers can write; delete policies are org-wide.
- **Worst single gap:** self role-escalation via profile UPDATE policy (M10).
- **Audit trail**: insert policy doesn't bind `user_id = auth.uid()` (forgeable); the broad org-read policy from the snapshot is **not dropped** by `20260108_audit_view_policy.sql`, so all org members can read audit logs despite admin-only UI.
- **Compliance language is now appropriately cautious** ("considerations", not "compliant") — but `Privacy.tsx` still claims *"We do not share data with third parties"* (false: Supabase is a processor) and lists a **personal Gmail** as the privacy contact. Fix before external pilots, ideally before Alpha for credibility.
- **Stale docs over-claim**: `auth_and_security.md` / `system_overview.md` describe trigger-based audit logging (zero `CREATE TRIGGER` in any SQL) and `ca-central-1` as fact.

---

## 10. Clinical UX / Trust Findings

The wording stabilization pass is verified **in place**: "At Maximum Score" (scale-aware, including yes/no = 1), "Targets with Score Gains", "Compare With Another Cycle", "Submit with Unscored Targets", "Invite created… send it manually", no motivational filler. Remaining:

- **"Overall Proficiency" / "Total proficiency"** labels for what is a points ratio — minor overclaim, fix opportunistically.
- **Report unscored-as-0/4** (B1) — the single biggest trust risk.
- Submit dialog claims cycle locking that doesn't happen (M3).
- "New Cycle" visible pre-approval invites a confusing error (m2).

---

## 11. Supabase / RLS Findings

- **Dual migration trees remain** and the CLI chain alone is **broken** for this app: no `user_invites`, no invite RPCs, `user_profiles` SELECT own-row-only (breaks team list), missing `details` column on `audit_logs`, missing role/status CHECK constraints. `supabase_setup.md` documents this honestly with the snapshot-first canonical order — **the Alpha project must be provisioned snapshot-first.**
- RPC shape drift: `20260106_update_rpc.sql` (table-returning, with `org_name`) is **required** for `authService.checkInvite`'s `.length` handling.
- `claim_invite` correctly binds to session email (good); late-claim upsert can silently move an existing user to a new org (low Alpha risk).
- Missing: score-row uniqueness, audit `user_id` binding, role-restricted delete policies, inactive-status enforcement.
- Role naming is consistent end-to-end (no mismatches found).

---

## 12. Testing / Tooling Findings

- **Scripts complete**: `dev/build/preview/lint/typecheck/test/test:watch`. Vitest config minimal and sane.
- **Coverage is one file** (`exportUtils.test.ts`, 2 tests) — no tests for the CSV parser (recently rewritten), score edit rules, or analytics max-score logic. These three are cheap, high-value unit targets.
- **Typecheck failing (54 errors)** while build passes — type drift is accumulating silently (M9). No CI to enforce any of it.
- `scripts/` generators are path-correct (`tests/data/`); fixtures: `large_test_pack.json` canonical, `dummy_pack.json` intentionally(?) legacy-shaped — label it or remove it.

---

## 13. Documentation Drift Findings

- **Accurate**: `README.md`, `setup_guide.md`, `supabase_setup.md` (best doc in repo), `alpha_runbook.md`, `assessment_lifecycle.md`, `phase_1_tracker.md`, `alpha_smoke_test_plan.md` (but **untracked**).
- **Must be banner-marked Historical** (they will mislead future agents): `system_overview.md`, `frontend_architecture.md`, `api_architecture.md`, `auth_and_security.md`, `master_app_specification.md`, `getting_started.md`, `project_handoff.md`, `api_reference.md` — all still describe Next.js/Vercel/learners/trigger-audit/XLSX.
- **Mark historical or add errata**: `current_state_audit_2026_05_02.md` — lists as current at least five bugs that are now fixed (route, footer links, therapist visibility, debug spoof, title).
- **Reconcile**: `aim_alpha_readiness_plan.md` P0 items still phrased as open although `phase_0_cleanup_tracker.md` closes them; tracker still has Pack-deletion and Checkbox-scope boxes `[ ]`.
- **Fix**: `DEPLOYMENT.md` (migration path, Node version), `frontend/README.md` (one line).

---

## 14. Manual Smoke Test Requirements

Human-run tests required before AIM Alpha (on the actual Alpha Supabase project):

1. **Provisioning check:** run the `supabase_setup.md` §8 checklist end-to-end (first-admin signup with email confirmation off, invite lookup, claim).
2. **Full clinical loop:** create client → create assessment (numeric pack) → score all targets across 2+ domains → submit → senior edits one score during review → approve → start new cycle → score again → compare cycles.
3. **Report:** print/Save-as-PDF in Chrome for (a) fully scored, (b) **partially scored** assessment — confirm what unscored targets show (validates B1 fix).
4. **Yes/no pack:** score, submit, view report — verify display (B1).
5. **Race probe:** rapidly click scores across 4–5 targets in <2s; reload; confirm DB scores match UI (M1/M2).
6. **Navigation probe:** open assessment A → enter a domain → open modal → navigate to assessment B via the list → confirm clean state (M4).
7. **Role probe:** as therapist, confirm read-only on submitted; as viewer, confirm no edit affordances; therapist deep-link `#/assessments?client=<id>` create attempt.
8. **Failure visibility:** kill network mid-list-load — confirm whether pages hang on "Loading..." (M5).
9. **Invite loop:** create invite → copy link → claim in incognito → verify role and org.
10. **Pack edit roundtrip:** edit an uploaded pack with scale labels in the builder, save, reopen — check labels survive (M13).

---

## 15. Recommended Agent Task List

### Builder (priority order)

1. B1 — report unscored/max fix (shared max-score helper with `analytics.ts`)
2. M8 — strip `analytics.ts` / `audit.ts` console logging
3. M5/M6/M7 — error visibility: list-loader catches, report load error, ContentPacks page-level error banner
4. M3 — submit dialog copy (or cycle lock)
5. M4 — key `AssessmentMatrix` by `assessmentId` (one-liner) + reset compare state
6. M1 — functional rollback in `updateScore`
7. M9 — typecheck to zero (types for `status`, score `cycle` join; builder file cleanup)
8. M13/M14 — builder edit hydration; minimal JSON upload shape check
9. m2, m12 — New Cycle visibility; index.html OG/favicon

### QA

- Execute §14 smoke plan on the Alpha project; commit results against `alpha_smoke_test_plan.md`
- Verify snapshot-first DB provisioning matches `supabase_setup.md` §7
- Regression-check the five "fixed" items from the May audit

### Documentation

- Commit `alpha_smoke_test_plan.md`; banner the 8 historical docs; errata on the May audit; reconcile readiness plan ↔ phase-0 tracker; fix `DEPLOYMENT.md` / `frontend/README.md`

### Security/Compliance

- M10 — profile-update policy column restriction (small SQL patch; apply if DB touch is already planned, else top of post-Alpha)
- M12 — purge PII one-off SQL from tracked tree
- Privacy.tsx third-party clause + contact email
- Define and record the Alpha data classification (test data only) with AIM

### Overseer/SPM

- Decide: fix B1 vs restrict runbook to numeric-only packs (recommend fixing — it's small)
- Approve M2 unique-constraint migration timing (cleanest **before** Alpha data exists)
- Hold scope: no checkbox packs, no new features until smoke passes

---

## 16. Final Recommendation

**Proceed — fix B1 + M8 first, then run the human smoke test before any AIM session.**

Specifically:

1. Builder fixes the report misrepresentation and console logging (both small, isolated)
2. Optionally apply the score-uniqueness migration while the Alpha DB is still fresh
3. QA runs the §14 smoke plan on the real Alpha environment
4. Documentation banners the stale architecture docs so future agent work isn't poisoned

Everything else on the Major list improves trust but has workarounds and should not delay the Alpha timeline. The RLS hardening program is the first post-Alpha engineering priority and the hard gate for any external pilot.

---

## Severity Definitions (Reference)

| Level | Definition |
|-------|------------|
| **Blocker Before Alpha** | Will likely break core Alpha workflow, corrupt trust, expose data incorrectly, or prevent assessment completion. |
| **Major Before Alpha** | Could significantly confuse users, cause workflow friction, or create serious trust issues, but has a workaround. |
| **Minor Before Alpha** | Should be cleaned up if easy, but does not threaten Alpha. |
| **Accepted Alpha Limitation** | Known limitation that is documented and acceptable for controlled Alpha. |
| **Post-Alpha** | Do not address before Alpha unless easy and low-risk. |

---

## Audit Scope Reference

Areas covered across 14 audit dimensions:

1. Product Workflow Integrity
2. Assessment Data Model Integrity
3. React State / Async / Race Condition Audit
4. Role / Permission / Lifecycle Integrity
5. Supabase / Database / RLS Audit
6. Security / Privacy / Compliance Trajectory
7. Clinical UX / Trust / Wording Audit
8. Assessment Pack System Audit
9. Report / Export Audit
10. Error Handling / User Feedback Audit
11. Performance / Scalability / Maintainability Audit
12. Testing / Tooling / Repo Hygiene Audit
13. Documentation Audit
14. Alpha Readiness Assessment

---

*Generated by Cursor Overseer Agent — read-only audit. No code changes were made during this audit.*
