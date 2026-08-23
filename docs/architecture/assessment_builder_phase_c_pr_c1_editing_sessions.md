# Phase C — PR C1: Editing Session Foundation

| Field | Value |
|-------|--------|
| **Document type** | Implementation planning specification (Builder editing sessions) |
| **Phase / PR** | Phase C · PR C1 |
| **Status** | Authoritative plan for Builder session semantics — **planning only; no implementation in this document** |
| **Binding philosophy** | [`assessment_builder_canonical_product_architecture.md`](./assessment_builder_canonical_product_architecture.md) §Rule 5 (Persistence and editing sessions) |
| **Settled ground (do not revisit)** | Phase B canonical scoring — [`assessment_builder_phase_b_pr_b1_canonical_scoring_model.md`](./assessment_builder_phase_b_pr_b1_canonical_scoring_model.md), [`assessment_builder_phase_b_pr_b3_write_path.md`](./assessment_builder_phase_b_pr_b3_write_path.md); `scoring_mode` / `default_scoring` / sparse overrides / `normalizeCanonicalPackForSave` |
| **Out of scope** | Phase D Builder UX/chrome (sticky header, outline, search, large-pack navigation) · scoring model changes · autosave-as-durable-draft (Rule 5 Phase 2+) · presence/locking (Rule 5 Phase 3) |

This document formalizes **Rule 5** into a concrete, testable contract for the Assessment Builder editing session: baseline vs. working copy vs. dirty, Save/Cancel/Reload semantics, navigation guards, validation-failure UX, and concurrent-edit conflict detection.

It does **not** restate canonical scoring meaning or Phase B write-path transforms. Where this plan and B1/B3 conflict on scoring persistence, **B1/B3 win**.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate:** This document owns session lifecycle, dirty detection, guards, and conflict UX. It references B3 for open/save normalization (`seedBuilderWorkingPack`, `normalizeCanonicalPackForSave`, `validateBuilderPackAuthoring`) without redefining them.

---

## Founder decisions locked (inherited — do not re-open in C1)

| ID | Decision | Source |
|----|----------|--------|
| **FD-B3-1** | Sparse normalization (N1–N6) runs silently on Save | B3 §Founder decisions |
| **FD-B3-2** | Canonical migration (M1–M5) runs silently on pack open in Builder | B3 §Founder decisions |
| **FD-B3-3** | Custom → Uniform confirm before clearing overrides; Cancel = discard working copy / leave Builder | B3 §Founder decisions |

C1 adds session semantics **on top of** these; it does not change save normalization or migrate-on-open behaviour.

---

# 0. Code facts relied on (verified 2026-08-22)

| Fact | Where |
|------|--------|
| Rule 5 product contract | `docs/architecture/assessment_builder_canonical_product_architecture.md` lines 208–263 |
| Builder mount seeds working copy via `seedBuilderWorkingPack(initialData)` | `frontend/src/components/AssessmentBuilder.tsx` lines 106–138; `frontend/src/utils/assessmentPackCanonical.ts` lines 323–343 |
| Fragmented React state (not a single `useReducer` document) | `AssessmentBuilder.tsx` lines 107–138: `title`, `description`, `domains`, `scoringMode`, `defaultScoring`, `scoringScales`, `defaultScale`, `globalScaleLabels`, `targetScaleDrafts`, structure-label fields, `secondaryGroupingEnabled`, `authoringIssues`, `uniformConfirmOpen` |
| Derived `workingPack` `useMemo` (partial snapshot — omits uncommitted scale drafts) | `AssessmentBuilder.tsx` lines 146–179 |
| Save path: commit drafts → `validateBuilderPackAuthoring` → block on issues → `normalizeCanonicalPackForSave` → `onSave` | `AssessmentBuilder.tsx` lines 633–748 |
| Cancel: `onClick={onCancel}` only — no dirty check | `AssessmentBuilder.tsx` lines 1423–1428 |
| Validation UX: `authoringIssues` + `issueFor()` inline errors + bottom banner — **no scroll/navigation** | `AssessmentBuilder.tsx` lines 232–250, 1407–1412; `assessmentPackAuthoring.ts` lines 161–173 |
| Parent lifecycle: conditional render `{showBuilder && …}` unmounts Builder on close | `frontend/src/pages/ContentPacks.tsx` lines 227–245 |
| Edit open: `initialData={…editingPack.pack_data, title, description}` | `ContentPacks.tsx` lines 152–156, 229 |
| Edit save: `packService.update(editingPack.id, { title, description, pack_data })` — **no revision/conflict check** | `ContentPacks.tsx` lines 230–239; `frontend/src/services/packs.ts` lines 68–77 |
| New pack save: `packService.upload` then close Builder | `ContentPacks.tsx` lines 124–135, 240–242 |
| Cancel parent handler: `setShowBuilder(false); setEditingPack(null)` — unmount, no confirm | `ContentPacks.tsx` line 244 |
| Hash SPA routing — no React Router, no existing dirty guard | `frontend/src/App.tsx` lines 85–93, 226–234; `frontend/src/components/Layout.tsx` (nav sets `window.location.hash` directly) |
| **`content_packs` has no `updated_at` column** | `frontend/supabase/migrations/20251210000000_fill_missing_schema.sql` lines 38–49; `database/migrations/20260104_complete_database_definition.sql` lines 67–79 |
| **`ContentPack` TypeScript type has no `updated_at`** | `frontend/src/types/index.ts` lines 134–146 |
| B3 test precedent for Cancel (DB unchanged) | `frontend/src/components/AssessmentBuilder.test.ts` lines 90–102 |
| No prior Phase C architecture doc; git history shows B3/B2 Builder work only | `git log` — no `assessment_builder_phase_c_*` commits |

**Integrity gap (C1 must address):** Architecture Rule 5 assumes `updated_at` conflict detection, but **`content_packs` rows are not versioned on update today** (`packService.update` does not touch `uploaded_at`; no `updated_at` exists). Conflict detection requires a founder decision (see §11).

---

# 1. Goals

## 1.1 What PR C1 delivers

After C1, opening the Assessment Builder creates an explicit **editing session** with:

1. An immutable **baseline snapshot** captured at session start (post–migrate-on-open for edit flows).
2. A **working copy** represented by existing Builder React state plus uncommitted scale draft strings.
3. A reliable **`isDirty`** derived from baseline vs. working copy (not ad-hoc field counters).
4. **Save** unchanged in product meaning (B3 validate + normalize + persist) but updates baseline on success and clears dirty.
5. **Cancel** that warns when dirty; on confirm, discards working copy (close Builder / unmount — see §3).
6. **Reload** (explicit user action) that re-fetches server baseline; warns if dirty.
7. **Phase 1 guards:** `beforeunload` when dirty; **in-app** guarded hash navigation while a dirty Builder session is active.
8. **Validation failures:** save blocked; issues remain in working copy; summary supports **navigation to offending fields** (extends existing `authoringIssues` — see §5).
9. **Conflict detection on edit save:** detect concurrent modification vs. session-open baseline revision; warn and require reload or explicit overwrite (mechanism depends on §11 schema decision).

## 1.2 What PR C1 does not deliver

See §8 (explicit non-goals).

---

# 2. Session model — baseline, working copy, dirty

## 2.1 Definitions (binding)

| Term | Meaning in C1 |
|------|----------------|
| **Server truth** | The persisted `content_packs` row (`title`, `description`, `pack_data`, …) at last successful fetch/save. |
| **Baseline** | The **session’s reference document** — what the author would see immediately after opening the pack with zero further edits. For **edit**, this is the **post–`seedBuilderWorkingPack` / migrate-on-open** canonical working form plus row-level `title`/`description`, frozen at mount. For **new pack**, this is the blank seeded pack (Uniform + empty domains + default scale). Baseline is **not** the raw pre-migration DB JSON when M1–M5 changes the in-memory shape (aligns with FD-B3-2). |
| **Working copy** | All author-visible state under edit in `AssessmentBuilder` (see §2.2). |
| **Dirty** | Working copy ≠ baseline under the comparison contract in §2.3. |

Rule 5 reference: baseline / working copy / dirty — architecture doc lines 214–216.

## 2.2 Working copy — map to actual `AssessmentBuilder` state

The working copy is **not** only the `workingPack` `useMemo` at lines 146–179. It includes every author-mutable input that can diverge from baseline before Save:

| State variable | Role | Baseline must capture? |
|----------------|------|------------------------|
| `title`, `description` | Row + embedded pack fields | Yes |
| `domains` | Structure, targets, overrides | Yes |
| `scoringMode` | `PackScoringMode` | Yes |
| `defaultScoring` | Canonical default blob | Yes |
| `scoringScales` | Read-only in UI today; copied from seed | Yes (equality) |
| `defaultScale` | Uniform numeric CSV string (may diverge from `defaultScoring.scale` until Save commits) | Yes |
| `globalScaleLabels` | Uniform label map (may diverge until Save) | Yes |
| `targetScaleDrafts` | Custom-mode uncommitted per-target scale CSV strings | Yes — **critical for dirty** |
| `primaryGroupLabel`, `targetLabel`, `secondaryGroupLabel`, `secondaryGroupingEnabled` | Structure labels | Yes |
| `authoringIssues` | Validation cache | **No** — ephemeral, not part of document |
| `defaultScaleError` | Transient parse error | **No** |
| `uniformConfirmOpen` | Dialog chrome | **No** |

**Non-state session metadata (edit flows only):**

| Field | Purpose |
|-------|---------|
| `sessionPackId` | `editingPack.id` from parent |
| `sessionOpenedAtRevision` | Revision token captured at open for conflict check (see §6) — **requires schema or surrogate (OQ-C1-1)** |

Parent passes `initialData` via `ContentPacks.tsx` line 229; C1 should pass **`sessionPackId`** and **`sessionOpenedAtRevision`** as explicit props (or a single `EditingSessionContext` value) when `editingPack` is set.

## 2.3 Dirty detection — concrete mechanism

**Recommendation (binding for implementation unless founder overrides OQ-C1-2):** **canonical snapshot deep equality**, not per-field dirty flags and not a change counter.

### 2.3.1 Pure snapshot builder

Introduce a pure function (suggested location: `frontend/src/utils/assessmentBuilderSession.ts`):

```ts
buildBuilderSessionSnapshot(input: BuilderSessionSnapshotInput): BuilderSessionSnapshot
```

**Input** mirrors Builder state listed in §2.2 (including `targetScaleDrafts`, `defaultScale`, `globalScaleLabels`).

**Output** is a **comparison-normalized** snapshot struct (or `ContentPackData` + row title/description) defined so that:

1. **Custom mode:** uncommitted `targetScaleDrafts` are merged into target `scoring` **the same way** `commitAllTargetScaleDrafts` does inside `handleSubmit` (`AssessmentBuilder.tsx` lines 519–578, 680–694) — but **without mutating React state** and **without** running full save validation.
2. **Uniform mode:** `defaultScale` + `globalScaleLabels` are merged into `default_scoring` **the same way** the Uniform branch of `handleSubmit` does (lines 642–678) — again read-only simulation.
3. Structure labels use `buildPackStructureLabels` (`assessmentPackAuthoring.ts`) with the same toggle semantics as Save (`stripSecondaryGroupingIfDisabled` applies at save only — baseline and working snapshots should both apply the same strip for equality, or both omit strip until save; **pick one and test** — recommend strip in snapshot when `secondaryGroupingEnabled === false` to match persisted shape).
4. Identifiers: compare **authoring trim semantics** consistent with validation, not necessarily post–`normalizePackIdentifiers` (dirty should detect “user typed trailing space” as dirty). Save still normalizes on write (B3).

### 2.3.2 Baseline capture

On `AssessmentBuilder` mount (after `seedBuilderWorkingPack`):

```ts
const baselineSnapshotRef = useRef(buildBuilderSessionSnapshot(initialCapturedState));
```

`initialCapturedState` is derived from the same state initializers at lines 107–138 (post-seed), not from raw `initialData` alone.

### 2.3.3 `isDirty`

```ts
const isDirty = useMemo(
  () => !builderSessionSnapshotsEqual(baselineSnapshotRef.current, buildBuilderSessionSnapshot(currentState)),
  [/* all working-copy deps */]
);
```

Use a dedicated equality helper (not raw `JSON.stringify` unless stabilized ordering is proven). Prefer structural compare on normalized snapshot objects; reuse patterns from `effectiveScoringEquals` only where comparing scoring blobs — **do not** use Effective Scoring equality for whole-pack dirty (author cares about sparse authored form, not resolved effective values).

### 2.3.4 Why not `workingPack` `useMemo` alone?

`workingPack` omits uncommitted `defaultScale` / `targetScaleDrafts` / `globalScaleLabels` sync. A author can edit the Uniform default scale CSV, remain “clean” under `workingPack` comparison, and lose edits on Cancel — violating Rule 5. Snapshot builder must include draft strings.

### 2.3.5 Performance

Recompute `isDirty` in `useMemo` on relevant state changes. Snapshot builder is pure and should be unit-tested without React. For very large packs, compare hash of stable serialization as an optimization **only if** proven equivalent to structural compare in tests.

## 2.4 Where session state lives

| Layer | Responsibility |
|-------|------------------|
| **`AssessmentBuilder.tsx`** | Owns working copy state (unchanged shape), computes `isDirty`, exposes `onSessionChange?.({ isDirty })`, runs `beforeunload` effect when dirty, implements Cancel/Reload confirm UI, validation navigation |
| **`ContentPacks.tsx`** | Owns session **identity** (`editingPack`, new vs edit), passes revision token, wires Save to conflict-aware update, registers global guard when `showBuilder && isDirty` |
| **`assessmentBuilderSession.ts`** | Pure snapshot + equality (testable without DOM) |
| **App / Layout guard** | Intercepts hash navigation app-wide when a dirty Builder session is registered (see §4) |

Do **not** persist working copy to `localStorage` in C1 (Rule 5 Phase 2+ autosave draft).

---

# 3. Cancel semantics

## 3.1 Rule 5 requirement

> Cancel: discards working copy; restores UI to baseline; never partially applies fields.

Architecture doc lines 226–230.

## 3.2 Current behaviour (verified)

| Flow | Behaviour | Compliant? |
|------|-----------|------------|
| **Edit — Cancel click** | Parent `onCancel` → unmount Builder (`ContentPacks.tsx` line 244); DB row untouched | **Discard:** yes. **Restore UI to baseline:** N/A while closing. **Warn if dirty:** **no** |
| **Edit — re-open after Cancel** | Fresh mount; `seedBuilderWorkingPack(initialData)` from list row (still server truth until someone saved) | Restores baseline on re-open |
| **New pack — Cancel** | Unmount without `upload`; nothing persisted | Compliant for discard |
| **Custom → Uniform dismiss** | `uniformConfirmOpen` closes; mode stays Custom (FD-B3-3) | Not Cancel — separate confirm |

## 3.3 C1 contract

1. **When `isDirty === false`:** Cancel immediately calls existing parent close (`onCancel`).
2. **When `isDirty === true`:** Show `ConfirmDialog` (reuse `frontend/src/components/ConfirmDialog.tsx` — already used for Uniform switch at lines 762–767): *“Discard unsaved changes?”*  
   - **Confirm discard:** call `onCancel()` (unmount). No partial field revert in-place — unmount **is** the discard mechanism given today’s architecture (Builder is not a persistent sub-route).  
   - **Dismiss:** remain in Builder with working copy intact.

**Formalization vs new behaviour:** Discard-without-save on unmount is already structurally correct for edit flows; C1’s job is **dirty-gated Cancel**, tests, and documentation — not a new revert reducer **unless** founder chooses in-place Reload without unmount (OQ-C1-3).

3. **Never** call `packService.update` on Cancel.

4. **B3 Cancel recovery test** (`AssessmentBuilder.test.ts` lines 90–102) remains valid; add UI-level dirty Cancel tests (§9).

---

# 4. Unsaved edits — `beforeunload` and route guard

## 4.1 Rule 5 Phase 1 minimum

> in-memory dirty + beforeunload + route guard

Architecture doc lines 237–241.

## 4.2 Routing reality

- App route state: `useState(window.location.hash)` + `hashchange` listener (`App.tsx` lines 87–93).
- Content Packs page: `#/packs` renders `<ContentPacks />` (`App.tsx` line 234).
- Builder is **not** its own hash route; it is inline UI inside `ContentPacks` when `showBuilder` (`ContentPacks.tsx` line 227).
- Layout navigation sets hash directly (`Layout.tsx` lines 30–58, 108–122) — **no central router API today**.

**Consequence:** Leaving `#/packs` via Layout unmounts `ContentPacks` and silently destroys an dirty working copy — **Rule 5 violation today**.

## 4.3 `beforeunload` (browser tab close / refresh)

**Where:** `AssessmentBuilder` `useEffect` (or parent when `showBuilder && isDirty`).

```ts
useEffect(() => {
  if (!isDirty) return;
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = ''; // required for legacy browsers
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```

Use standard browser generic warning copy (sites cannot customize `beforeunload` text reliably).

## 4.4 In-app route guard (hash SPA)

**Recommended mechanism:** a small **navigation guard module + React context** — do not add React Router solely for this PR.

### 4.4.1 `AssessmentBuilderNavigationGuard` context

Registered at **`App.tsx`** inside authenticated layout tree (wraps `Layout` children):

```ts
type NavigationGuard = {
  isBlocking: boolean;
  message: string;
  requestNavigation: (targetHash: string) => void;
  confirmDiscard: () => void;
  cancelNavigation: () => void;
};
```

- `ContentPacks` sets `isBlocking = showBuilder && isDirty` via context setter when Builder mounts/updates.
- Pending navigation stored in guard state when user attempts to leave.

### 4.4.2 Intercept hash changes

**A. Proactive (primary):** Replace direct `window.location.hash = …` assignments in `Layout.tsx` with `requestNavigation(targetHash)` from context. Same for any other nav buttons that leave the Builder context while dirty (audit all `window.location.hash` in `frontend/src`).

**B. Reactive (back/forward / external hash edits):** In `AppRouter`, wrap `handleHashChange`:

1. If guard `isBlocking` and new hash ≠ current hash, **revert** with `history.replaceState(null, '', currentHash)` (or restore previous hash).
2. Open the same discard confirm dialog as Cancel.
3. On confirm discard: clear blocking, apply pending hash, allow `ContentPacks` to unmount.

### 4.4.3 Scope of guarded navigation

| Navigation | Must guard when dirty? |
|------------|------------------------|
| Layout link to `#/dashboard`, `#/clients`, `#/assessments`, … | **Yes** |
| Stay on `#/packs` but close Builder via Cancel | Handled by Cancel confirm (§3) |
| `#/packs` list ↔ Builder (same route, toggle `showBuilder`) | **Yes** if closing Builder with dirty (treat as “leave session”) |
| Login redirect (`App.tsx` lines 99–101) | **Yes** when dirty (edge case) |
| Assessment report routes | N/A — Builder only on `#/packs` |

### 4.4.4 Non-goals for guard implementation

- Do not guard navigation **within** the Builder form (scroll, expand domain) — only session exit.
- Do not implement Phase D outline/search navigation.

---

# 5. Validation-failure UX

## 5.1 Rule 5 requirement

> Save blocked; validation summary lists errors with **navigation to the offending domain/target/field**; partial invalid edits remain in working copy.

Architecture doc lines 243–247.

## 5.2 Current behaviour (verified)

| Capability | Status |
|------------|--------|
| Save blocked when issues | Yes — `handleSubmit` returns early after `setAuthoringIssues(mergedIssues)` (`AssessmentBuilder.tsx` lines 738–740) |
| Issues preserved in working copy | Yes — state not reset on validation failure |
| Inline field errors via `issueFor()` | Yes — domain/target/scale/title fields |
| Bottom summary banner | Yes — lines 1407–1412 (count only) |
| Click/issue → scroll to field | **No** |
| Domain/target indices in issues | Yes — `BuilderAuthoringIssue` (`assessmentPackAuthoring.ts` lines 168–173) |

## 5.3 C1 contract — extend, do not replace

Keep `validateBuilderPackAuthoring` and `BuilderAuthoringIssue` as the single validation source. C1 adds **navigation affordances**:

1. **Stable DOM anchors** on offending controls, e.g.  
   `id="builder-issue-{field}-{domainIndex}-{targetIndex}"`  
   (omit indices when undefined — match `issueFor` keying).

2. **Validation summary panel** (replace or augment banner at lines 1407–1412):  
   - List each `authoringIssues` entry as a button/link.  
   - `onClick` → `document.getElementById(…)?.scrollIntoView({ behavior: 'smooth', block: 'center' })` + focus first focusable input in section.

3. **Optional:** on Save with issues, auto-scroll to **first** issue (respect `reduce motion` preference).

4. **Do not** clear invalid edits silently; **do not** fork a parallel validation model.

## 5.4 Fields requiring anchors (minimum)

From `BuilderAuthoringIssueField` (`assessmentPackAuthoring.ts` lines 161–166):

- `title`
- `default_scale` (Uniform default CSV input)
- `domain_id`, `target_id`, `scale` (per domain/target editors — coordinate with `AssessmentBuilderTargetEditor`)

---

# 6. Save, baseline refresh, and conflict detection

## 6.1 Save (inherits B3)

Successful Save path remains:

1. Commit scale drafts / Uniform CSV (existing `handleSubmit` prologue).
2. `validateBuilderPackAuthoring` — block if issues.
3. `normalizeCanonicalPackForSave` + `normalizePackIdentifiers` + `stripSecondaryGroupingIfDisabled`.
4. `onSave(normalized)` → parent persists.

On **success**:

- Update `baselineSnapshotRef` to snapshot of current state (post-commit state matches saved payload).
- Clear dirty.
- Clear `authoringIssues`.
- Parent closes Builder today (`ContentPacks.tsx` lines 237–239) — **acceptable for C1**; baseline update matters if close is deferred later (OQ-C1-4).

## 6.2 Reload (explicit)

Rule 5 lines 232–234. **Not implemented today.**

**C1 minimum:** Provide **Reload from server** action when editing an existing pack (`editingPack != null`):

1. If `!isDirty`: fetch fresh row (`packService.getById`), re-seed Builder (remount via key change or internal reset function).
2. If `isDirty`: confirm — *“Reload discards unsaved changes”* — same copy pattern as Cancel.

Reload updates both server truth and baseline snapshot to fetched row (post–`seedBuilderWorkingPack`).

Placement: Builder header actions area (functional button only — **not** Phase D chrome redesign).

## 6.3 Conflict detection — schema investigation result

| Expected by Rule 5 | Actual in repo |
|--------------------|----------------|
| `updated_at` on pack row | **`content_packs` has `uploaded_at`, `created_at` only** — no `updated_at` in SQL migrations or `ContentPack` type |
| Update bumps revision | `packService.update` generic `.update(updates)` — **no conditional check** |

**Therefore:** C1 **cannot** implement Rule 5 conflict detection as written without a **founder-approved revision field** (see OQ-C1-1).

### 6.3.1 Recommended implementation *after* revision field exists

At edit session open:

```ts
sessionOpenedAtRevision = editingPack.updated_at // or chosen field
```

At save:

```ts
const result = await packService.updateIfRevisionMatches(id, updates, sessionOpenedAtRevision);
// SQL: UPDATE … WHERE id = ? AND updated_at = ?
// if 0 rows: conflict
```

**Conflict UX:**

- Block silent last-write-wins.
- Show dialog: *“This pack was changed by someone else.”*  
  - **Reload** — discard working copy, fetch latest (§6.2).  
  - **Overwrite** — force save with latest revision re-read + second confirm (true last-write-wins) — **only if founder approves overwrite path (OQ-C1-5)**.

New-pack `upload` flows have no conflict in C1 (insert-only).

---

# 7. Parent integration (`ContentPacks.tsx`)

Minimal wiring changes (spec only):

| Concern | Change |
|---------|--------|
| Session identity | Pass `packId={editingPack?.id}` and `openedRevision={…}` when editing |
| Save | Route through conflict-aware service method once schema exists |
| Cancel / close | Unchanged structurally; Builder handles dirty confirm before calling `onCancel` |
| List “Edit” while dirty session open | If same pack re-edit or switching packs while dirty — guard with confirm (OQ-C1-6) |
| `loadPacks()` after save | Keeps list fresh; does not replace Reload inside Builder |

**New pack:** baseline is empty seed; dirty if any authoring occurred; Cancel discard = no row created — already true.

---

# 8. Explicit non-goals (Phase C1)

| Non-goal | Notes |
|----------|--------|
| **Undo/redo stack** | Cancel is the sole “revert session” mechanism (FD-B3-3). |
| **Presence / locking / real-time collaboration** | Rule 5 Phase 3. |
| **Autosave as durable draft** | Rule 5 Phase 2+; no `localStorage`/server draft table in C1. |
| **Phase D Builder UX** | Sticky header, outline, search, large-pack nav — gated on C1 completion. |
| **Scoring model changes** | Phase B settled. |
| **Chunked / partial server persistence** | Save remains whole-document (Rule 5 large packs). |
| **Merge/conflict UI beyond reload/overwrite** | No three-way merge of `pack_data`. |
| **Version bump policy** | `ContentPacks.tsx` line 235 comment (“Keep version or bump?”) — not C1 unless founder links versioning to conflict (OQ-C1-7). |
| **Report authoring session** | Out of scope — separate surfaces. |

---

# 9. Test and acceptance obligations

Follow B3 style: pure fixtures first, then integration/source contracts.

## 9.1 Pure session snapshot tests (`assessmentBuilderSession.test.ts`)

| Scenario | Assert |
|----------|--------|
| Mount snapshot equals itself | `isDirty` false |
| Change `title` only | dirty true |
| Uniform: change `defaultScale` CSV only (before commit) | dirty true |
| Custom: change `targetScaleDrafts` only | dirty true |
| Toggle `secondaryGroupingEnabled` | dirty true |
| Revert edit to original | dirty false |
| Snapshot includes stripSecondaryGrouping semantics | Matches save shape contract |

## 9.2 Builder integration / source contracts

| Scenario | Assert |
|----------|--------|
| Edit then Cancel **without** edits | Immediate unmount; no confirm |
| Edit then change domain title then Cancel | Confirm shown; on confirm unmount; `packService.update` not called |
| Edit then Save success | `update` called once; dirty cleared; Builder closes (current behaviour) |
| Save with invalid `target_id` | Save not called; `authoringIssues.length > 0`; working copy retains invalid value |
| Click summary issue | Scroll target receives focus / element in viewport (jsdom: anchor `id` exists + handler invoked) |
| `beforeunload` listener | Registered iff dirty (mock `addEventListener`) |
| Guarded navigation | With dirty session, `requestNavigation('#/clients')` opens confirm; abort leaves hash at `#/packs` |
| Confirm discard navigation | After confirm, hash changes and Builder unmounts |

## 9.3 Conflict tests (blocked on OQ-C1-1)

| Scenario | Assert |
|----------|--------|
| Open pack revision `T1`; save succeeds | Baseline revision updates to `T2` |
| Open at `T1`; concurrent save elsewhere to `T2`; save at `T1` | Conflict signal; no silent overwrite unless overwrite path confirmed |
| Overwrite path | Explicit second confirm; then persist |

Use mocked `packService` — no live Supabase in unit tests.

## 9.4 Regression guards

| Guard | Assert |
|-------|--------|
| B3 save normalization | Still calls `normalizeCanonicalPackForSave` on successful save |
| B3 migrate-on-open | Still uses `seedBuilderWorkingPack` at mount |
| Effective scoring tests | Unchanged — dirty compare ≠ effective compare |

---

# 10. Sequencing

## 10.1 Recommendation — **one shippable PR C1**, ordered internal slices

| Slice | Contents | Depends on | Why this order |
|-------|----------|------------|----------------|
| **C1.1** | `buildBuilderSessionSnapshot` + equality + §9.1 tests | — | Pure, testable; defines dirty truth |
| **C1.2** | Baseline ref on mount; `isDirty` in Builder; expose to parent | C1.1 | Core session model |
| **C1.3** | Dirty-gated Cancel + Reload (fetch) + baseline refresh on successful Save | C1.2 | Rule 5 Cancel/Reload/Save baseline |
| **C1.4** | `beforeunload` + navigation guard context + Layout hash interception | C1.2 | Rule 5 Phase 1 guards |
| **C1.5** | Validation summary navigation (anchors + clickable issues) | — | Can parallel after C1.1; ship before merge |
| **C1.6** | Conflict detection at save | **OQ-C1-1 schema** + C1.2 | Cannot ship honest conflict UX without revision field |

**Do not ship C1.4 without C1.2** — guards require accurate `isDirty`.

**Do not ship C1.6 before revision field decision** — optional split to **C1a** (session + guards + validation nav) and **C1b** (conflict + migration) if founder wants faster guard delivery.

## 10.2 Alternative split (if PR size or schema latency forces)

| PR | Scope | Risk if split |
|----|--------|----------------|
| **C1a** | C1.1–C1.5 | No concurrent-edit protection until C1b |
| **C1b** | DB migration + `updateIfRevisionMatches` + conflict UX + §9.3 | Must not regress C1a dirty model |

## 10.3 Relationship to Phase D

Phase D (Builder shell UX) **must not** start until C1 **`isDirty` + guard contract** is merged — otherwise Phase D nav will bypass session semantics.

---

# 11. Open questions (founder — unresolved)

Do **not** treat silence as approval.

| ID | Question |
|----|----------|
| **OQ-C1-1** | **Revision field:** Add `content_packs.updated_at` (trigger-maintained) as Rule 5 assumes, or use another monotonic version column? *Without this, conflict detection in §6.3 is blocked.* |
| **OQ-C1-2** | **Dirty compare:** Approve canonical snapshot deep equality (§2.3) vs another strategy? |
| **OQ-C1-3** | **Cancel UX:** Is unmount-on-confirm sufficient for “restore UI to baseline,” or require in-place revert without closing Builder? |
| **OQ-C1-4** | **Post-save close:** Keep closing Builder on successful Save (`ContentPacks.tsx` today), or stay open with refreshed baseline? |
| **OQ-C1-5** | **Conflict overwrite:** Offer explicit “Overwrite anyway” after conflict, or force Reload only? |
| **OQ-C1-6** | **Switch packs while dirty:** Opening a different pack from the list while editing — block with confirm, or disable list actions? |
| **OQ-C1-7** | **Pack `version` string:** Tie conflict/versioning to `pack_data.version` / row `version`, or keep “keep version on update” behaviour? |
| **OQ-C1-8** | **Reload affordance:** Required for C1 merge, or defer if Cancel + re-open is acceptable interim? |
| **OQ-C1-9** | **Navigation guard scope:** Guard all hash changes globally while dirty, or only top-level Layout links? |
| **OQ-C1-10** | **Migration ownership:** Does C1b include Supabase migration in-repo, or ops-applied DDL separately? |

---

# 12. Acceptance checklist (Overseer)

- [ ] `assessmentBuilderSession.ts` (or equivalent) implements snapshot + equality per §2.3 with tests §9.1.
- [ ] `AssessmentBuilder` captures baseline at mount post–`seedBuilderWorkingPack`; `isDirty` matches snapshot compare.
- [ ] Cancel prompts when dirty; never persists on Cancel.
- [ ] Reload re-fetches edit pack; prompts when dirty.
- [ ] Successful Save clears dirty and updates baseline snapshot.
- [ ] `beforeunload` registered when dirty.
- [ ] Layout navigation uses guarded hash API; dirty external navigation shows discard confirm.
- [ ] Validation summary navigates to anchored fields; save still blocked on issues.
- [ ] Conflict path implemented per founder answer to OQ-C1-1 (or explicitly deferred with C1b split approved).
- [ ] No Phase D chrome changes; no scoring model changes.
- [ ] B3 tests remain green.

---

# Document history

| Date | Change |
|------|--------|
| 2026-08-22 | Initial PR C1 editing session contract (planning agent). Verified against `AssessmentBuilder.tsx`, `ContentPacks.tsx`, `App.tsx`, `Layout.tsx`, `packs.ts`, `types/index.ts`, and `content_packs` migrations. |
