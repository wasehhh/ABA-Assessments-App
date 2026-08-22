# Phase B — PR B3: Builder Write-Path Plan

| Field | Value |
|-------|--------|
| **Document type** | Implementation planning specification (Builder write path) |
| **Phase / PR** | Phase B · PR B3 |
| **Status** | Authoritative plan for Builder implementation — product scoring meaning remains owned by PR B1 |
| **Binding model** | [`assessment_builder_phase_b_pr_b1_canonical_scoring_model.md`](./assessment_builder_phase_b_pr_b1_canonical_scoring_model.md) (approved) |
| **Runtime (do not redefine)** | Commit `0c37e67` — `resolveTargetAuthoredScoringSource`, `isCanonicalScoringPack`, `resolveEffectiveScoring` in `frontend/src/utils/effectiveScoring.ts`; `scoring_mode` / `default_scoring` / `scoring_scales` on `ContentPackData` (`frontend/src/types/index.ts`) |
| **Adjacent stopgap** | Commit `9501d0e` — `deriveInitialGlobalScaleState` (display-only; no canonical fields) |
| **Non-goals** | Runtime resolver redesign · Named Scale Catalog authoring UI · editing-session redesign beyond Cancel recovery · Phase C/D editor shell · DB migrations · `pack_snapshot` rewrites |

This document defines **how the Assessment Builder must write and open packs** so durable storage matches PR B1 (mode + default + sparse overrides), given that PR B2 already resolves those fields at runtime.

It does **not** restate or amend the canonical scoring model. Where this plan and B1 conflict, **B1 wins**.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns Builder write-path sequencing, UI binding to existing B1 fields, and test obligations. It references B1 for M1–M5 / N1–N6 / Uniform contracts and `0c37e67` for runtime behaviour. It does not duplicate Effective Scoring rules or G1–G8.

---

## Founder decisions locked 2026-08-20 (binding)

| ID | Decision |
|----|----------|
| **FD-B3-1** | Sparse normalization (**N1–N6**) runs **silently on Save** — no confirmation UI, no diff preview (aligns with B1 §5.3). |
| **FD-B3-2** | Canonical migration (**M1–M5**) runs **automatically and silently on pack open** in the Builder — in memory immediately; no banner; no opt-in. Save persists the migrated canonical form. |
| **FD-B3-3** | **Custom → Uniform** with existing overrides: **standard confirm dialog** before clearing (B1 §3.3). Recovery = existing Cancel (discard working copy / leave Builder without save) — **no** separate undo stack. |
| **FD-B3-4** | **Named Scale Catalog authoring UX deferred** out of Phase B. Catalog remains resolver-level / reference-capable (B1 §4.4, N5). This PR must **not** design create/edit UI for named scales. |

Typo note in planning brief: header “Uniform → Custom” meant the **Custom → Uniform** clear-overrides confirm (FD-B3-3).

---

# 0. Code facts relied on (verified)

| Fact | Where |
|------|--------|
| Runtime inheritance shipped | `0c37e67` — `effectiveScoring.ts` |
| Types already include `scoring_mode`, `default_scoring`, `scoring_scales` | `types/index.ts` |
| Builder checkbox + default scale hydrate from dense equality only | `deriveInitialGlobalScaleState` (`AssessmentBuilder.tsx`, `9501d0e`) |
| Save densifies every target and strips catalog | `prepareBuilderPackForSave` → `stripPackScoringScaleReferences` → `materializePackForSave` (`assessmentPackAuthoring.ts`) |
| “Uniform” save only applies labels globally, not scales | `applyGlobalScaleLabels` |
| Helper checkbox `useGlobalScale` gates target scoring editors | `AssessmentBuilderTargetEditor` — `{!useGlobalScale && (…scoring UI…)}` |
| CSV import emits dense per-target `scoring` | `contentPackCsv.ts` |
| JSON upload is `JSON.parse` then `packService.upload` — no normalize | `ContentPacks.tsx` |
| Edit open path | `ContentPacks` → `AssessmentBuilder` `initialData={editingPack.pack_data…}` |
| Cancel | `onCancel` closes Builder; no formal dirty-session baseline object today |
| No M1–M5 / N1–N6 utilities in repo yet | Grep — absent |

**Integrity check:** Runtime at `0c37e67` and types match B1 detection (`isCanonical` ⇔ mode ∧ default). No stop-and-report incompleteness found for resolver/types. Remaining gap is **Builder write path only**.

---

# 1. Goals

## 1.1 What this PR delivers

After PR B3:

1. Opening a legacy dense pack in the Builder **silently migrates** it in memory via B1 §7.3 **M1–M5**.
2. Saving a pack runs B1 §5.3 **N1–N6** silently and persists **canonical** authored form (`scoring_mode` + `default_scoring` + sparse `target.scoring`).
3. The Builder’s “same scale for all” control is the **literal `scoring_mode` toggle** (Uniform ↔ Custom), not a parallel dense-equality heuristic.
4. Target editors show **Inherited vs Override** under Custom; Uniform hides per-target scoring editors.
5. CSV/JSON import paths that create packs for Builder use are brought into a **defined relationship** with M1–M5 (see §6 — open questions called out).
6. QA proves B1 §7.5 behaviour-preservation fixtures through the write path.

## 1.2 Success statement

> A clinician can open an existing dense pack or a new pack in the Builder, edit under honest Uniform/Custom semantics, Cancel to abandon in-memory migration/edits, or Save to persist a B1-canonical pack that `0c37e67` resolves identically (for migrated packs: Effective Scoring unchanged vs pre-migration dense form).

## 1.3 Explicit non-goals

| Out of scope | Owner |
|--------------|--------|
| Redesign `resolveEffectiveScoring` / authored-source selection | Already `0c37e67` |
| Named scale catalog create/edit UI | Deferred (FD-B3-4) |
| Confirm/diff UI for N1–N6 on save | Forbidden (FD-B3-1) |
| Banner/opt-in for migrate-on-open | Forbidden (FD-B3-2) |
| Separate undo stack for cleared overrides | Forbidden (FD-B3-3) |
| Rewriting assessment `pack_snapshot` | G8 / B1 §7.2 |

---

# 2. Relationship to B1 / B2 / `9501d0e`

```text
B1 model (authored meaning)     →  binding product law
B2 runtime (0c37e67)            →  reads canonical packs correctly
9501d0e display stopgap         →  MUST be superseded (not left parallel)
B3 (this plan)                  →  Builder open/save/import write canonical packs
```

| Concern | Before B3 | After B3 |
|---------|-----------|----------|
| “Is pack uniform?” | `deriveInitialGlobalScaleState` (dense numeric equality) | `scoring_mode === 'uniform'` after migrate |
| Default scale UI | Session string / inferred shared dense scale | Bound to `default_scoring` |
| Save | Densify + strip `scoring_scales` | Normalize N1–N6; **retain** lawful catalog if present (N5) |
| Target `scoring` | Always dense | Absent when Inherited |

**Supersession rule for `deriveInitialGlobalScaleState`:** Remove as the source of truth for checkbox/default UI. Replace with derivation from the **in-memory canonical pack** after migrate-on-open (or from new-pack defaults). Do not keep both heuristics — they will disagree on Custom-with-zero-overrides and on Uniform packs with incomplete dense history.

---

# 3. Pure transforms (shared library — implement first)

Introduce pure, pack-in / pack-out functions (suggested module location — implementation detail: e.g. `frontend/src/utils/assessmentPackCanonical.ts`). Names illustrative:

| Function | Implements | Input → Output |
|----------|------------|----------------|
| `migrateLegacyPackToCanonical(pack)` | B1 §7.3 **M1–M5** | Dense or partial → canonical; **identity** if already `isCanonicalScoringPack` |
| `normalizeCanonicalPackForSave(pack)` | B1 §5.3 **N1–N6** | Canonical working copy → save-ready sparse canonical |
| `effectiveScoringEquals` | Already in `effectiveScoring.ts` (`0c37e67`) | Use for N2 / M2–M3 equality — **do not fork** |

### 3.1 `migrateLegacyPackToCanonical` rules (reference B1 — do not redefine)

- If `isCanonicalScoringPack(pack)` → return pack unchanged (or pass through light N-prep only — **OQ-B3-1**).
- Else apply M1 (default) → M2 (mode) → M3 (sparsify) → M4 (Uniform cleanup) → M5 (no clinical invention).
- Must satisfy: `∀ targets Effective(before) ≡ Effective(after)` using `resolveEffectiveScoring` from `0c37e67`.

### 3.2 `normalizeCanonicalPackForSave` rules (reference B1 §5.3)

- N1 Uniform → strip all `target.scoring`.
- N2 Custom → strip overrides Effective-equal to default.
- N3 No copies onto Inherited targets.
- N4 Ensure complete `default_scoring`.
- N5 **Preserve** lawful `scoring_scales` / `scale_id` — **stop** calling `stripPackScoringScaleReferences` as the Builder save path. Catalog **authoring UI** remains out of scope; existing catalog bytes on an opened pack must round-trip.
- N6 Leave non-scoring fields untouched.

### 3.3 Replace `prepareBuilderPackForSave` behaviour

Current chain densifies and strips catalog — **antithetical to B1**.

**Required new semantics:**

```text
working pack (already canonical in Builder memory)
  → validate authoring (updated for Inherited targets)
  → normalizeCanonicalPackForSave  (N1–N6)
  → normalizePackIdentifiers (retain)
  → onSave(...)
```

`materializePackForSave` densification must **not** run on the Builder save path after B3. (If other call sites still need densify for Alpha-era consumers, isolate them — **OQ-B3-2**.)

---

# 4. Migrate-on-open

## 4.1 Where it runs

**Hook:** Builder mount / `initialData` acceptance — **before** React state for domains/mode/default is seeded.

Recommended flow:

```text
ContentPacks.handleEdit(pack)
  → AssessmentBuilder({ initialData: pack.pack_data + titles })
  → on first init:
       workingPack = migrateLegacyPackToCanonical(clone(initialData))
       seed React state FROM workingPack
```

Not in `packService.getByOrg`. Migration is a **Builder working-copy** transform until Save (FD-B3-2). Unsaved Cancel abandons migration (never written).

## 4.2 Seeding state (replaces `deriveInitialGlobalScaleState`)

| UI / state field | Source after migrate |
|------------------|----------------------|
| `scoringMode` (`uniform` \| `custom`) | `workingPack.scoring_mode` |
| Pack default scale / labels / type editors | `workingPack.default_scoring` |
| `domains` | `workingPack.domains` (Inherited targets may lack `scoring`) |
| Target scale drafts (Custom overrides only) | Present only where `target.scoring` exists |

**New pack (`initialData` undefined):**

| Field | Binding default for B3 |
|-------|------------------------|
| `scoring_mode` | **`uniform`** (matches today’s checkbox-on default for new packs) |
| `default_scoring` | Complete numeric default equivalent to today’s `0,1,2,3,4` + empty labels (same clinical default as `NEW_PACK_DEFAULT_SCALE`) |

If founder wants new packs to start Custom instead — **OQ-B3-3** (not assumed).

## 4.3 Interaction with live edit of default under Uniform

While `scoring_mode === 'uniform'`:

- Editing pack default updates **only** `default_scoring` in memory.
- Inherited targets stay without `scoring` blobs (dynamic inheritance via `0c37e67`).
- Delete the misleading copy: “Changing it later does not rewrite existing target scales” — under Uniform that claim is **false** for Effective Scoring and must be rewritten to inheritance language.

## 4.4 Already-canonical packs on open

If opened pack is already canonical: **no M1–M5 rewrite of clinical meaning**. Optionally run N2 preview in memory — **OQ-B3-1** (recommend: migrate is no-op; optional silent N2 on open is allowed only if Effective Scoring unchanged).

---

# 5. Save-path normalization

## 5.1 Where it runs

Inside `AssessmentBuilder.handleSubmit`, **after** successful validation, **before** `onSave`:

```text
1. Commit draft scale strings into working default / override blobs
2. Build ContentPackData including scoring_mode + default_scoring + domains
3. validateBuilderPackAuthoring (updated — see §5.3)
4. If issues → block save (no normalize persist)
5. normalizeCanonicalPackForSave(pack)   // silent N1–N6
6. onSave(normalizedPack)
```

No confirm, no diff (FD-B3-1).

## 5.2 Interaction with current `handleSubmit` steps

| Current step | B3 fate |
|--------------|---------|
| `useGlobalScale` + `commitNumericScaleCsv(defaultScale)` | Becomes: when Uniform (or editing default under Custom), commit into `default_scoring` |
| `applyGlobalScaleLabels` | **Remove** as Uniform save mechanism — labels live on `default_scoring`; Inherited targets do not receive copied labels |
| `commitAllTargetScaleDrafts` when not global | Runs only for **Override** targets under Custom |
| Build `packData` without mode/default | **Must include** `scoring_mode` + `default_scoring` |
| `prepareBuilderPackForSave` densify/strip | **Replace** with normalize path (§3.3) |

## 5.3 Validation updates

`validateBuilderPackAuthoring` today assumes dense numeric scales on every target when `!useGlobalScale`.

Required:

| Mode | Validate |
|------|----------|
| Uniform | Complete `default_scoring` only; do **not** require per-target scales |
| Custom Inherited target | No per-target scale required |
| Custom Override target | Complete override scoring required |

Incomplete override / incomplete default → **reject save** (B1 corrupt-state / N4), not silent densify.

---

# 6. Uniform / Custom mode UI

## 6.1 Decision — checkbox becomes the mode toggle

**Binding recommendation:** Repurpose the existing “Use same scoring scale for all targets” checkbox as the **literal `scoring_mode` control**:

| Checkbox | `scoring_mode` |
|----------|----------------|
| Checked | `uniform` |
| Unchecked | `custom` |

**Reasoning:** Founder did not request a new control chrome; B1 already maps Uniform to “same scale for all”; `9501d0e` already taught clinicians this checkbox means homogeneity — B3 makes that claim **true**.

Alternative (replace with segmented Uniform/Custom control) is allowed if UX pass prefers clearer labels — **OQ-B3-4** (cosmetic only; semantics identical).

## 6.2 Custom → Uniform (FD-B3-3)

When clinician checks Uniform while any `target.scoring` exists:

1. Show **standard confirm** stating overrides will be cleared and all targets will follow pack default.
2. **Confirm** → set `scoring_mode = 'uniform'`; remove all `target.scoring` in working copy; hide per-target scoring editors.
3. **Cancel dialog** → leave mode Custom; checkbox remains unchecked.
4. No undo stack. Further recovery: Builder **Cancel** button → exit without `onSave` → reopen loads DB baseline (pre-save), discarding in-memory migration/edits.

## 6.3 Uniform → Custom

No confirm required (B1 §3.4). Set `scoring_mode = 'custom'`; all targets remain Inherited until an override is created; show per-target scoring editors / override affordances.

## 6.4 Copy that must die

| Current copy / behaviour | Replacement intent |
|--------------------------|--------------------|
| “New targets snapshot this scale…” | New targets are **Inherited** (no snapshot copy) |
| “Changing it later does not rewrite existing…” | Under Uniform / Inherited: default changes **do** change Effective Scoring |
| `applyGlobalScaleLabels` on save | Deleted from Uniform path |

---

# 7. Per-target override UI (`AssessmentBuilderTargetEditor`)

## 7.1 Visibility

| Mode | Per-target scoring editors |
|------|----------------------------|
| Uniform | **Hidden** (pack default section only) |
| Custom | Visible |

## 7.2 Inherited vs Override (Custom)

For each target under Custom:

| State | Detection | UI |
|-------|-----------|-----|
| Inherited | `target.scoring` absent | Badge/label **Inherited**; show Effective Scoring summary from `resolveEffectiveScoring(target, workingPack)`; primary action **Customize** / **Override** that creates a complete `target.scoring` blob (initialized from current Effective / default — exact init rule **OQ-B3-5**) |
| Override | `target.scoring` present | Badge/label **Override**; full scoring fields editable; action **Revert to pack default** removes `scoring` (Inherited) |

Pixel layout is out of scope — behaviour and state machine are in scope.

## 7.3 Dense helpers

`denseTargetScoring` / `ensureDenseTargetScoring` must not silently re-densify Inherited targets during edit. Override editing may use local complete blobs only.

---

# 8. CSV / JSON import path

## 8.1 Current behaviour

| Path | Today |
|------|--------|
| CSV (`contentPackCsv.ts`) | Dense per-target `scoring`; no `scoring_mode` / `default_scoring` |
| JSON (`ContentPacks` upload) | Parse + upload as-is |
| Builder edit | Only place migrate-on-open runs under FD-B3-2 as written |

## 8.2 Required direction (B1 §7 principles)

Import should not leave the product creating **new** durable dense packs once B3 ships, **unless** founder explicitly keeps upload densify — that is an open question.

**Architecture recommendation (not locked):** After CSV parse or JSON parse, run `migrateLegacyPackToCanonical` **before** `packService.upload`, so uploaded packs are canonical without requiring a Builder open. Homogeneous → Uniform (M2); mixed → Custom + sparse overrides (M2–M3).

## 8.3 Open questions — do not invent (Convention 1)

| ID | Gap |
|----|-----|
| **OQ-B3-6** | Does **ContentPacks file upload** (CSV/JSON) run M1–M5 before persist, or only Builder open? |
| **OQ-B3-7** | JSON that is **already canonical**: re-normalize (N1–N6) on upload, identity pass-through, or reject if Uniform+overrides? |
| **OQ-B3-8** | JSON declaring `scoring_mode: 'uniform'` **with** overrides (B1 corrupt): coerce to Custom + warn (prior FD-B1-1 recommendation) vs fail upload? **Still founder-owned.** |
| **OQ-B3-9** | CSV rows with **no** scoring columns (default dense `0–4` today): treat as Uniform after migrate, or leave Custom with all Inherited after default chosen? M2 says all-equal → Uniform — confirm apply to CSV defaults. |
| **OQ-B3-10** | Authored pack **export** from Builder/ContentPacks: authored sparse vs resolved dense? (B1 §17 conceptual — export redesign may be out of B3; if B3 touches download, founder must choose.) |

Until OQ-B3-6 is answered, Builder migrate-on-open + save remains the **minimum** B3 scope that satisfies FD-B3-2 for edit; upload path must not be silently assumed.

---

# 9. Test / verification obligations

Map B1 §7.5 proof obligation onto fixtures this PR must prove.

## 9.1 Pure transform fixtures (unit)

| Fixture | Assert |
|---------|--------|
| All-identical dense numeric | → `uniform`; complete default; **zero** `target.scoring`; Effective equality ∀ targets |
| Mixed numeric scales | → `custom`; overrides **only** for exceptions; Effective equality ∀ targets |
| Yes/no pack (dense) | Effective equality; mode per M2 |
| Checkbox / task-step pack | Effective equality; mode per M2 |
| Mixed types in one pack | Modal default M1; Correct Custom/Uniform; Effective equality |
| Named-scale legacy (`scoring_scales` + `scale_id`, dense or mixed) | Effective equality; **catalog retained** after migrate+normalize (N5); no strip |
| Empty / missing scale (Phase A fallback cases) | Effective equality to pre-migration `resolveEffectiveScoring` |
| Already canonical Uniform | No-op migrate; save keeps zero overrides |
| Already canonical Custom with redundant override | N2 strips on save; Effective unchanged |
| Uniform + stray overrides (corrupt) | normalize N1 clears on save; or open path — see OQ-B3-1 |

Use `resolveEffectiveScoring` + `effectiveScoringEquals` from `0c37e67` as the oracle — do not reimplement equality in tests.

## 9.2 Builder integration fixtures

| Scenario | Assert |
|----------|--------|
| Open dense pack | In-memory pack `isCanonicalScoringPack`; UI mode matches `scoring_mode`; **no** call to dense-equality `deriveInitialGlobalScaleState` |
| Cancel after open | DB pack unchanged (still dense until a future save) |
| Save after open, no edits | Persisted pack canonical; Effective equality vs pre-save dense |
| Custom → Uniform confirm accept | Working copy overrides cleared |
| Custom → Uniform confirm dismiss | Mode remains Custom; overrides intact |
| Uniform default edit | Inherited targets stay without `scoring`; Effective tracks default |
| Custom Customize then Revert | Override created then removed |
| Save with Inherited targets | Persisted JSON omits `scoring` on those targets |

## 9.3 Regression

| Guard | Assert |
|-------|--------|
| `prepareBuilderPackForSave` / successor | Does **not** strip `scoring_scales` when present |
| `applyGlobalScaleLabels` | Not used as Uniform persistence mechanism |
| Runtime tests at `0c37e67` | Remain green without modification of resolution semantics |

---

# 10. Sequencing

## 10.1 Recommendation — **one shippable PR**, ordered internal slices

| Slice | Contents | Why this order |
|-------|----------|----------------|
| **B3.1** | Pure `migrateLegacyPackToCanonical` + `normalizeCanonicalPackForSave` + §9.1 fixtures | Testable without UI; locks Effective equality |
| **B3.2** | Rewire `prepareBuilderPackForSave` / `handleSubmit`; stop densify/strip | Save path becomes canonical |
| **B3.3** | Migrate-on-open; delete/supersede `deriveInitialGlobalScaleState`; seed from canonical fields | Ends dual “is uniform?” computations |
| **B3.4** | Mode checkbox ↔ `scoring_mode`; Custom→Uniform confirm; copy fixes | Honest mode UI (FD-B3-3) |
| **B3.5** | Inherited/Override badges + Customize/Revert | Sparse authoring operable |

**Do not ship B3.3 without B3.2** — migrate-on-open without normalize-on-save re-densifies on save and undoes M3.

**Do not ship B3.2 without B3.4 intent** — persisting `scoring_mode` while the checkbox still means dense-equality will desync UI and storage. B3.3–B3.4 should land in the **same** merge.

## 10.2 Optional split (only if PR size forces it)

| PR | Scope | Risk if split |
|----|--------|----------------|
| **B3a** | B3.1–B3.4 (transforms + open/save + mode toggle/confirm) | Acceptable MVP: canonical packs honest |
| **B3b** | B3.5 Inherited/Override UX polish | Custom packs editable but override creation UX weaker |

**Do not split** migrate-on-open from save normalization.

Import upload path (OQ-B3-6): schedule as **B3c** or same PR **after** founder answers — not a silent add-on.

---

# 11. Open questions (founder — unresolved)

Do **not** treat silence as approval of the Architecture recommendations above.

| ID | Question |
|----|----------|
| **OQ-B3-1** | On open of an **already-canonical** pack: strict identity, or also silent N2 sparsify in memory? |
| **OQ-B3-2** | May `materializePackForSave` densify remain for any non-Builder caller, or delete entirely once B3 ships? |
| **OQ-B3-3** | New blank pack default mode: confirm **`uniform`** (recommended) vs `custom`? |
| **OQ-B3-4** | Keep checkbox label vs rename to explicit “Uniform scoring (all targets inherit pack default)”? |
| **OQ-B3-5** | When creating an Override from Inherited, initialize override blob as **deep copy of current Effective / default_scoring** — confirm? |
| **OQ-B3-6** | Run M1–M5 on **ContentPacks CSV/JSON upload** before persist? |
| **OQ-B3-7** | Already-canonical JSON upload: identity vs re-normalize vs reject corrupt Uniform+overrides? |
| **OQ-B3-8** | Corrupt Uniform+overrides on import: coerce Custom vs fail? (Related prior FD-B1-1.) |
| **OQ-B3-9** | CSV with defaulted identical `0–4` rows → Uniform via M2 — confirm? |
| **OQ-B3-10** | Does B3 include authored sparse **export/download**, or leave export densified until a later interchange PR? |

---

# 12. Acceptance checklist (Overseer)

- [ ] No parallel uniform heuristics: `deriveInitialGlobalScaleState` removed or reduced to test-only legacy helper unused by Builder UI
- [ ] Builder working copy after open is `isCanonicalScoringPack` for legacy inputs
- [ ] Save persists `scoring_mode` + `default_scoring` + sparse overrides only
- [ ] Save does not strip lawful `scoring_scales`
- [ ] Custom→Uniform confirm required when overrides exist; dismiss is no-op
- [ ] Cancel abandons in-memory migration/edits without DB write
- [ ] B1 §7.5 fixtures green via `resolveEffectiveScoring` equality
- [ ] Named scale **catalog UI** absent (FD-B3-4)
- [ ] No silent product decisions on OQ-B3-6…10 without founder answers

---

# 13. Document history

| Date | Change |
|------|--------|
| 2026-08-20 | Initial PR B3 Builder write-path plan — migrate-on-open, silent normalize-on-save, mode UI, override UX, import open questions, sequencing |
