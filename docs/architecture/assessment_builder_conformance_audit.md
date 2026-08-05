# Assessment Builder — Canonical Architecture Conformance Audit

| Field | Value |
|-------|--------|
| **Document type** | Product architecture compliance audit |
| **Status** | Official gap analysis vs Canonical Product Architecture |
| **Spec** | [`assessment_builder_canonical_product_architecture.md`](./assessment_builder_canonical_product_architecture.md) |
| **Scope** | Current Assessment Builder + scoring consumers (Matrix, Snapshot, Reports, Analytics, Exports, Import) |
| **Non-goals** | Code proposals · implementation tasks · PR review of a specific diff |

**Compliance legend**

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| 🟡 | Partially implemented |
| 🔴 | Not implemented |
| 🔵 | Implemented differently (working behaviour that conflicts with canonical meaning) |

---

# Executive Summary

## Overall conformance score

**~28% conformant** (weighted across canonical rules).

| Status | Share of audited rules |
|--------|------------------------|
| ✅ Fully implemented | ~10% |
| 🟡 Partially implemented | ~30% |
| 🔵 Implemented differently | ~25% |
| 🔴 Not implemented | ~35% |

## Overall architectural health

**Fragile Alpha authoring surface with promising but incomplete universal primitives.**

Strengths already present:

- Structured pack content (domains, targets, criteria, materials, secondary grouping, structure labels)
- A shared `resolveTargetScoring()` primitive for named pack scales
- Blocking authoring validation and oversized-group warnings
- Assessment freeze via `pack_snapshot`

Critical gaps:

- Default scoring is **snapshot-copied**, not inherited
- Uniform toggle is a **UI visibility flag**, not a pack mode
- Target scoring is **dense**, not sparse
- Editing has **Save/Cancel buttons** without a real editing-session contract
- Runtime consumers **do not share one scoring model**
- Builder save **strips** named `scoring_scales` that the universal plan introduced

## Major themes

1. **False inheritance** — UI language (“default / same scale”) implies Model B; tests and copy lock Model A (copy-at-creation).
2. **False Uniform** — “Use same scoring scale for all targets” hides editors and preserves divergent target scales.
3. **Split brain at runtime** — Matrix write path resolves; interpretation / analytics / snapshot / exports often read inline `target.scoring`.
4. **Sessionlessness** — Cancel discards without confirm; no dirty tracking, unload guards, or conflict detection.
5. **Form ceiling** — Authoring capabilities grew inside a long scrolling form that cannot scale to ABLLS-class instruments.

---

# Audit Areas

## 1. Product Philosophy

| Question | Finding |
|----------|---------|
| Behaves like structured authoring environment? | Partially — content model yes; interaction model no |
| Behaves like long configuration form? | **Yes — primary UX shape** |

**Current behaviour:** Single long `<form>` with nested domain/target cards, sticky neither chrome nor outline. Capable of authoring rich pack structure (labels, secondary groups, criteria), but experienced as a settings form that grows vertically.

**Canonical:** Professional structured assessment authoring environment / editor.

**Status:** 🟡 Partially implemented (content model) / 🔵 Implemented differently (interaction model).

---

## 2. Assessment Configuration

| Concern | Current | Canonical | Status |
|---------|---------|-----------|--------|
| Title / description | Pack metadata; persisted | Metadata | ✅ |
| Version | Displayed; edit keeps existing version; no deliberate bump/clone UX | Versioned instrument document | 🟡 |
| Structure labels | Editable; persisted on pack | Inherited/config for UI naming | ✅ |
| Secondary grouping | Optional; persisted | Optional hierarchy metadata | ✅ |
| Default scoring scale | **React session state only**; hardcoded `0,1,2,3,4` on open; not loaded from pack; stamped into new targets | Inherited configuration on pack | 🔵 |
| Score criteria (global labels) | Applied to all targets’ `scale_labels` on save when Uniform UI is on | Part of inherited scoring config | 🟡 |
| Named scale catalog | Types + resolver exist; **Builder save strips** `scoring_scales` / `scale_id` | Pack-level inherited catalog | 🔵 |

**Gap:** Assessment scoring settings are not pack-persisted inherited configuration. They are session defaults that snapshot into targets.

---

## 3. Scoring Architecture

| Concern | Current behaviour | Required behaviour | Gap |
|---------|-------------------|--------------------|-----|
| Inheritance | Copy scale into target at creation; later default changes do **not** rewrite existing scales (documented + test-locked) | Dynamic inheritance from pack default / named scale | Model A vs Model B+ |
| Sparse overrides | Dense numeric `scoring.scale` on Builder targets; materialize writes full scoring onto every target | Store only when different | Opposite persistence model |
| Resolver | `resolveTargetScoring` merges target inline over `scoring_scales` entry | Single effective-scoring function everywhere | Exists but incomplete adoption + no pack-default inheritance |
| Named scales | Supported in types/resolver; stripped on Builder save | First-class pack catalog | Infrastructure present, product path disabled |
| Runtime consistency | Write controls + score validation resolve; interpretation/analytics/snapshot/export often inline | All surfaces resolve | Split brain |

**Status:** 🔵 Implemented differently (copy model) with 🟡 partial resolver readiness.

---

## 4. Uniform Scoring Mode

### Current behaviour

- Control: `useGlobalScale` checkbox (default `true`)
- **Not persisted** on the pack
- ON: shows default scale + global labels; **hides** per-target scoring editors
- OFF: shows per-target editors; copy promises target scales survive reopen
- Toggle does **not** mutate target scales
- Save ON: validates default CSV; applies **labels** to all targets; **does not** rewrite `scale`
- Save ON: skips per-target numeric scale validation even if scales diverge
- Reopen: checkbox resets to `true` regardless of heterogeneous target scales

### Canonical behaviour

- Persist `scoring_mode = uniform | allow_overrides`
- Uniform ON: remove overrides (confirm), disable editors, bind all targets to assessment default dynamically
- Uniform OFF: allow Inherited/Custom; do not auto-restore prior overrides across sessions

### Edge cases / migration

| Edge case | Risk |
|-----------|------|
| Heterogeneous scales + Uniform UI ON | Clinician believes instrument is uniform; Matrix may show mixed scales |
| Reopen after mixed save | UI claims “same scale” again while pack is mixed |
| Import mixed pack then open Builder | Default Uniform UI masks divergence |
| Enabling canonical Uniform later | Must confirm normalize/remove overrides or refuse until user chooses |

**Status:** 🔵 Implemented differently.

---

## 5. Override Storage

| Question | Answer |
|----------|--------|
| How stored today? | Full `target.scoring` on each target; numeric targets always carry `scale` |
| Sparse? | **No** |
| Normalize-if-equal-to-default? | **No** — save materializes dense resolved inline scoring |
| Migration implication | Existing packs are dense Model A documents; need one-time or open/save normalize to sparse + pack default once inheritance ships |

**Status:** 🔴 Not implemented (sparse model).

---

## 6. Editing Sessions

| Event | Current | Canonical | Status |
|-------|---------|-----------|--------|
| Save | Validate → prepareBuilderPackForSave → parent update/upload | Atomic commit of working copy | 🟡 |
| Cancel | Immediate discard via unmount; no confirm | Discard working copy (ideally confirm if dirty) | 🔵 |
| Dirty tracking | None | Explicit dirty vs baseline | 🔴 |
| Reload | None | Reload baseline with dirty confirm | 🔴 |
| Browser refresh | Silent loss | Warn / durable draft | 🔴 |
| Navigation guards | None | Route + beforeunload | 🔴 |
| Validation | Blocking issue list count + inline; not jumpable summary | Jumpable validation summary | 🟡 |
| Concurrent edit | Last-write-wins; no `updated_at` check on packs | Conflict detection | 🔴 |

**Status:** 🟡 Partial Save/Cancel/validation; session contract largely 🔴.

---

## 7. Builder UX

| Capability | Current | Canonical priority | Status |
|------------|---------|-------------------|--------|
| Sticky Save/Cancel chrome | Bottom of long form | Critical | 🔴 |
| Outline navigation | None | Critical | 🔴 |
| Inherited/Custom badges | None | Critical | 🔴 |
| Honest Uniform UX | Misleading | Critical | 🔵 |
| Validation summary | Count banner | Critical (jumpable) | 🟡 |
| Search / filter | None | High | 🔴 |
| Breadcrumbs | None | High | 🔴 |
| Keyboard shortcuts | None beyond native form | High | 🔴 |
| Virtualization | None | Medium (large packs) | 🔴 |
| Structure authoring | Labels + secondary groups present | Needed for universal packs | ✅ |

**Status:** 🔴 relative to editor philosophy; 🟡 for content-authoring features already present.

---

## 8. Runtime Consistency

```text
resolveTargetScoring
  ├─ TargetScoreControls (Matrix buttons)
  ├─ assessments.assertScoreAllowedForTarget (writes)
  └─ materializeTargetScoring (Builder/CSV save)

target.scoring / scoreInterpretation (inline)
  ├─ Domain display / filters / competency bands
  ├─ analytics → domain stats
  ├─ domainProfile / learnerMap / snapshot / report
  └─ exportUtils Max Score
```

**Inconsistencies**

1. Write UI can resolve named scales; display/analytics may ignore them.
2. Parallel max-score algorithms (`getResolvedScaleValues` vs `getTargetMaxScore` vs export local logic).
3. Checkbox fallback differs across paths.
4. Builder Alpha save collapses inheritance, hiding the split until JSON/universal packs appear.

**Status:** 🟡 Partially implemented.

---

## 9. Import / Export

| Operation | Current | Canonical | Status |
|-----------|---------|-----------|--------|
| CSV import | Per-row inline scoring; materialize on save path | Absent → inherit; mixed → allow_overrides | 🟡 / 🔵 |
| JSON import | `JSON.parse` only; no materialize/normalize | Accept dense/sparse; normalize on save | 🟡 |
| CSV export (scores) | Assessment score CSV; max from inline scoring | Effective scoring + inherited/override marker | 🔵 |
| JSON export authored vs resolved | Not distinguished | Required dual modes | 🔴 |
| Pack duplication | Not found as pack operation | Deep copy authored doc | 🔴 |
| Version cloning | Version preserved on edit; no clone UX | Lineage + new version | 🔴 |
| Normalization | Materialize densifies; strips named scales on Builder save | Sparse normalize; preserve catalog | 🔵 |
| Backward compatibility | Dense packs work for Alpha inline model | Keep readable; normalize opportunistically | 🟡 |

---

## 10. Clinical Workflow

From a BCBA authoring ABLLS / AFLS / VB-MAPP / PEAK:

| Expectation | Reality | Confusion risk |
|-------------|---------|----------------|
| “Default scale” changes the instrument | Only affects **new** targets + labels on save | **High** |
| “Same scale for all” means uniform | Hides editors; mixed scales can remain | **Critical** |
| Special items look special | No Inherited/Custom badges | **High** |
| Reopen shows how pack is scored | Uniform checkbox resets to ON | **Critical** |
| Large ABLLS pack is editable | Endless scroll; no outline/search | **High** |
| PEAK/VB-MAPP named scales | Types exist; Builder strips catalog | **High** for universal packs |
| Import months later is intelligible | Dense stamped scales without pack-level mode | **Medium–High** |

---

## 11. Scalability

| Need | Current fitness | Architectural change required? |
|------|-----------------|--------------------------------|
| Very large assessments (500–1000+ targets) | Form UX cannot scale | **Yes** — editor shell + virtualization |
| Multiple scoring systems | Dense per-target + stripped catalogs | **Yes** — inheritance + named scales retained |
| Enterprise orgs / libraries | No pack duplicate/version publish flow | **Yes** — document lifecycle |
| Assessment libraries | Content packs list only | **Yes** — template/publish model (Phase 3) |

**Verdict:** Current Builder cannot realistically support enterprise-scale universal authoring **without** the canonical model changes. Incremental UI polish alone will not fix inheritance/Uniform falsehoods.

---

# Compliance Matrix

| # | Canonical Rule | Current Behaviour | Status | Gap | Required Product Change | Complexity | Priority | Dependencies |
|---|----------------|-------------------|--------|-----|-------------------------|------------|----------|--------------|
| R1 | Builder is structured authoring environment | Long form with rich fields | 🟡/🔵 | Interaction model is form-shaped | Adopt editor philosophy in UX roadmap | High | P1 | R6, R7 |
| R2 | Assessment scoring is inherited configuration | Session default; snapshot into new targets | 🔵 | No pack-persisted inherited default | Persist pack default scoring; resolve dynamically | High | **P0** | R8 |
| R3 | Sparse inheritance + named scales (B+) | Dense inline; named scales stripped on Builder save | 🔵/🔴 | Opposite storage; catalog disabled | Sparse overrides + retain catalog | High | **P0** | R2, R8 |
| R4 | Single resolver everywhere | Used on write/save; not on interpret/analytics/export | 🟡 | Split brain | Route all effective scoring through resolver | Medium | **P0** | — |
| R5 | Uniform is pack mode removing overrides | UI flag hides editors; preserves scales | 🔵 | False Uniform | Persist `scoring_mode`; confirm+clear overrides | Medium | **P0** | R2, R3 |
| R6 | Overrides stored only when different | Always store full target scoring | 🔴 | Dense Model A | Normalize-on-save sparsify | Medium | P0 | R2, R5 |
| R7 | Explicit editing session | Save/Cancel without dirty/guards | 🟡/🔴 | Sessionless | Dirty baseline, confirms, unload guards | Medium | P1 | — |
| R8 | Conflict detection | Last-write-wins | 🔴 | Silent overwrite | Pack `updated_at` / version check | Low–Med | P2 | R7 |
| R9 | Sticky chrome + outline + badges | Absent | 🔴 | Form UX | Editor shell | High | P1 | R5 terminology |
| R10 | Jumpable validation summary | Count banner only | 🟡 | Not navigable | Issue list with focus targets | Low | P1 | R7 |
| R11 | Search/filter/keyboard | Absent | 🔴 | No large-pack affordances | Editor productivity features | Medium | P2 | R9 |
| R12 | Authored vs Resolved export | Single inline export semantics | 🔴 | Ambiguous interchange | Dual export modes | Medium | P1 | R4, R6 |
| R13 | Import respects inherit/mode | CSV densifies; JSON raw; no mode inference | 🟡/🔵 | Asymmetry + no mode | Import contracts + normalize | Medium | P1 | R2, R5, R6 |
| R14 | Pack duplicate / version clone | Missing / version frozen on edit | 🔴 | No instrument lifecycle | Duplicate + version bump UX | Medium | P2 | R7 |
| R15 | Clinical clarity (Inherited/Custom) | No badges; misleading copy | 🔴/🔵 | Trust risk | Terminology + visible resolution state | Low | **P0** | R5 |
| R16 | Durable drafts | None | 🔴 | Refresh loses work | Autosave draft store | Medium–High | P2 | R7 |
| R17 | Enterprise libraries / org scales | Not present | 🔴 | Out of Alpha scope | Phase 3 platform | High | P3 | R3, R14 |

---

# Architectural Risks

## High

1. **False Uniform / false default** — Clinicians believe the instrument is homogeneous while Matrix scores against divergent target scales. Direct clinical integrity risk.
2. **Runtime split brain** — Write validation vs display/analytics/export disagree when `scale_id` / catalog packs appear (or already diverge on checkbox max fallbacks).
3. **Content debt from dense Model A** — Years of stamped scales make “change the assessment default” impossible without bulk rewrite tools.
4. **Builder strips universal scoring catalog** — Undermines the universal architecture plan the product already documented.

## Medium

5. **Session data loss** — No dirty guards; refresh/cancel destroys uncommitted authoring.
6. **Import asymmetry (CSV vs JSON)** — Different persistence semantics produce packs that behave differently downstream.
7. **Form UX ceiling** — Blocks ABLLS-scale adoption and enterprise authoring credibility.
8. **Version/duplication absence** — Orgs cannot safely iterate instruments.

## Low

9. **Concurrent last-write-wins** — Limited multi-author risk today; grows with enterprise use.
10. **Accessibility / keyboard gaps** — Important for editor phase; secondary to model honesty.

---

# Recommended Implementation Roadmap

Logical phases by **engineering dependency** (not task lists).

## Phase A — Truthfulness foundation (unblock everything)

Make effective scoring one concept everywhere and stop lying in the Uniform UI copy—even before storage fully flips.

- Adopt resolver on interpretation, analytics, snapshot, report, export paths
- Align max-score / scale-value helpers to one resolved definition
- Correct or qualify Uniform/default UI copy to match actual snapshot behaviour **or** gate the checkbox until Mode ships

**Exit criteria:** No consumer reads competing scale definitions for the same target.

## Phase B — Canonical scoring model

Introduce pack-persisted inherited configuration + Uniform mode + sparse overrides.

- Persist default scoring + `scoring_mode`
- Dynamic inheritance for targets without overrides
- Uniform confirm → remove overrides; Allow Overrides → Inherited/Custom badges
- Normalize-on-save sparsify; stop stripping named scales (or retain with explicit Alpha flag policy reversed)
- Migration: open/save normalize dense packs; infer mode from homogeneity heuristic with user confirm when ambiguous

**Exit criteria:** Saved pack alone determines effective scoring; reopen UI matches data.

## Phase C — Editing session contract

- Baseline vs working copy dirty state
- Confirm on Cancel / reload / navigate / unload
- Jumpable validation summary
- Optional pack update conflict check

**Exit criteria:** Authors cannot lose or silently overwrite work without acknowledgement.

## Phase D — Editor UX modernization

- Sticky header with Save/Cancel/dirty
- Outline navigation
- Search/filter
- Virtualized target lists

**Exit criteria:** ABLLS-scale packs are navigable without endless scroll.

## Phase E — Interchange & lifecycle

- Authored vs Resolved JSON/CSV export
- Import mode inference + normalize
- Pack duplicate + version clone

**Exit criteria:** Interchange and instrument iteration match canonical contracts.

## Phase F — Enterprise authoring (3–5y)

- Org template libraries, publish workflow, org-level scale libraries, presence/locking, audit trail

**Exit criteria:** Out of scope for Alpha compliance; depends on A–E.

---

# Suggested PR Breakdown

Independently testable slices. Risk = product/regression risk.

| Order | PR theme | What it proves | Risk |
|------:|----------|----------------|------|
| 1 | Runtime resolver unification | Interpretation/analytics/export use same effective scoring as Matrix writes | **Medium** — score display/% may change for edge packs |
| 2 | Shared scale/max helper consolidation | One algorithm for allowed values and max | **Medium** |
| 3 | Uniform/default copy & reopen honesty | UI no longer claims false Uniform; optional infer checkbox from pack homogeneity | **Low** |
| 4 | Persist pack default scoring + scoring_mode (read path) | Pack stores inheritance config; resolver reads pack default when no override | **High** — model change |
| 5 | Uniform mode write contract | Enabling Uniform clears overrides with confirm; disables editors | **High** — data mutation |
| 6 | Sparse normalize-on-save | Equal-to-default overrides dropped; tests for dense→sparse | **High** — pack JSON shape changes |
| 7 | Stop stripping named scales on Builder save | Catalog round-trips; Builder can reference scales | **Medium–High** |
| 8 | Editing session dirty + guards | beforeunload/route confirm; Cancel confirm when dirty | **Low–Medium** |
| 9 | Jumpable validation summary | Click issue → focus field | **Low** |
| 10 | Sticky authoring chrome | Save/Cancel always reachable | **Low** |
| 11 | Outline navigation | Jump domains/groups | **Medium** UX |
| 12 | Authored vs Resolved export | Dual export modes labeled | **Medium** |
| 13 | Import contract alignment | CSV/JSON normalize + mode inference | **Medium–High** |
| 14 | Pack duplicate / version bump | Lifecycle operations | **Low–Medium** |
| 15 | Search/filter + virtualization | Large-pack performance | **Medium** |

**Do not ship PR 5–6 before PR 1–2** if universal/`scale_id` packs exist in the wild—otherwise Uniform normalization and runtime display can diverge during the transition.

**Do not add new Builder features** (AI assist, org libraries, PEAK-specific chrome) before PR 4–6 land.

---

# Final Assessment

## 1. Current maturity level

**Alpha-capable content authoring; pre-canonical scoring and session semantics.**

The Builder can create useful ABLLS-like packs for Alpha. It is **not** yet a conformant implementation of the Canonical Product Architecture, and several behaviours are **test-locked against** that architecture (snapshot defaults; labels-only global apply; strip named scales).

## 2. Biggest architectural weaknesses

1. Snapshot defaults masquerading as inheritance  
2. Uniform toggle masquerading as Uniform mode  
3. Runtime scoring split brain  
4. Dense persistence without pack-level scoring truth  
5. Sessionless editing on a high-stakes clinical document  

## 3. Highest ROI improvements

1. **Resolver unification** — immediate consistency across Matrix/Snapshot/Analytics/Export  
2. **Honest Uniform + Inherited/Custom** — restores clinical trust with relatively clear product rules  
3. **Pack-persisted default + sparse overrides** — unlocks maintainable large instruments  
4. **Dirty session guards** — prevents silent authoring loss  
5. **Sticky chrome + outline** — makes large-pack authoring viable  

## 4. What must be completed before adding new Builder features

Gate new Builder features behind:

1. Phase A runtime truth (resolver everywhere)  
2. Phase B scoring model (`scoring_mode`, inherited default, sparse overrides, Uniform contract)  
3. Minimum Phase C dirty/save/cancel honesty  

Until then, new features will amplify false inheritance and Uniform ambiguity into more surfaces.

---

# Closing

The current Builder is **not failing from lack of fields**—it fails from **ambiguous product contracts** implemented as UI conveniences.

Bringing it into compliance is primarily a **model correction** (inheritance, Uniform, sparse storage, shared resolution, sessions), then an **editor modernization**. Treat this audit as the official implementation roadmap order; execute in dependency order, not by polishing the form first.
