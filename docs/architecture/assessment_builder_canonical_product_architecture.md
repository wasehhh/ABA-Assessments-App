# Evalis Assessment Builder — Canonical Product Architecture

| Field | Value |
|-------|--------|
| **Document type** | Canonical product architecture specification |
| **Status** | Authoritative product direction (not an implementation plan) |
| **Audience** | Product, UX, engineering, clinical SME, QA |
| **Horizon** | 3–5 years |
| **Related** | `assessment_builder_universal_architecture_plan.md` · `assessment_lifecycle.md` · `database_schema.md` |

This document answers one question:

> **If we were designing the Assessment Builder today, with everything we've learned, how should it fundamentally work?**

It deliberately optimizes for the Builder Evalis should still be proud of in five years—not for the current implementation.

---

# Executive Summary

The Assessment Builder must stop behaving like a long configuration form that happens to create packs.

**Canonical direction:** treat the Builder as a **structured assessment authoring environment**—a professional, versioned editor for assessment schemas and clinical content. Packs are first-class authored documents with inheritance, sparse overrides, explicit editing sessions, and deterministic import/export contracts.

**Core redesigns:**

1. **Assessment-level scoring is inherited configuration**, not a one-time copy and not decorative metadata.
2. **Targets store scoring only as overrides** when they differ from the resolved assessment default (or from a named pack scale they reference).
3. **"Use same scoring scale for all targets" is a pack mode**, not a convenience button that half-applies settings.
4. **Editing is session-based**: dirty state, Save, Cancel, reload, and navigation are one coherent contract.
5. **UX must become an editor**: sticky chrome, navigable outline, search/filter, validation summary—capable of ABLLS-scale packs (hundreds–thousands of targets).

If these rules are not established now, every future assessment type (VB-MAPP, PEAK, ESDM, org-custom, Vineland-like) will inherit ambiguity into scoring, Matrix behaviour, snapshots, analytics, and clinical trust.

---

# Canonical Product Philosophy

## What the Assessment Builder is

The Assessment Builder is a **structured assessment authoring tool**.

It is:

- the place clinicians and curriculum authors define **what** an assessment measures,
- the place they define **how** items are scored,
- the place they organize hierarchy, instructions, materials, criteria, and examples,
- the place packs are versioned, duplicated, imported, and prepared for freeze into assessment snapshots.

It is **not**:

- a generic settings form,
- a free-form document editor (Word/Docs metaphor),
- a runtime scoring worksheet (that is Matrix / Snapshot),
- a one-off CSV transform utility with a UI wrapper.

## How clinicians should perceive it

Experienced BCBAs should perceive the Builder as:

> **"I am authoring a clinical instrument."**

Expectations that must hold:

- Changing the pack-level scoring scale changes the instrument **unless** a target deliberately overrides it.
- Uniform-scale mode means the instrument is intentionally homogeneous.
- Importing a pack preserves clinical intent months later without tribal knowledge.
- Save means "commit this draft of the instrument"; Cancel means "discard this editing session."

## How engineers should think about it

Engineers should treat packs as:

> **Versioned, inheritance-aware schema documents with a resolved runtime view.**

Mental model:

```text
Authoring document (sparse, editable)
        │ resolve(inheritance + overrides)
        ▼
Resolved pack view (used by Matrix, Snapshot, export "resolved", analytics)
        │ freeze on assessment create
        ▼
Assessment pack_snapshot (immutable for that assessment)
```

Rules of thumb:

- Never persist "half-resolved" ambiguity.
- Never rely on UI session state as the source of truth for inheritance.
- Always be able to answer: **What is the effective scoring definition for target X?** in one pure function.

---

# Canonical Product Rules

These are the official Builder rules.

## Rule 1 — Assessment configuration is inherited configuration

Assessment-level settings (title, description, default scoring scale, named scoring scales, structure labels, pack metadata) fall into two classes:

| Class | Examples | Semantics |
|-------|----------|-----------|
| **Document metadata** | title, description, version, pack_id | Describes the pack; not inherited by targets |
| **Inherited configuration** | default scoring scale / mode, named scale catalog, structure labels | Provides defaults that resolve onto targets and UI unless overridden |

**Canonical model:** assessment scoring settings are **inherited configuration** (not global copy-on-write defaults, not metadata-only).

Why not the alternatives:

- **Global defaults (copy into every target):** creates silent drift; changing the assessment scale later does not update targets; "same scale" becomes a lie.
- **Metadata only:** leaves Matrix/runtime without a deterministic default; authors must set every target; large packs become unmaintainable.
- **Inherited configuration:** matches clinician mental model ("the assessment uses 0–4 unless this item is special") and scales to thousands of items.

## Rule 2 — Scoring architecture is sparse inheritance (Model B+)

### Rejected: Model A (copy assessment scale into every target)

| Lens | Assessment |
|------|------------|
| Advantages | Simple per-target reads; no resolver needed |
| Disadvantages | Drift; bulk edits explode; "default" is fake |
| Import | Either stamp all rows or invent a phantom default |
| Maintenance | Changing assessment scale requires rewriting N targets |
| Clinical | Authors believe they changed "the assessment" but items silently diverge |

### Accepted: Model B / B+ (dynamic inheritance + sparse overrides + named scales)

**Canonical scoring model:**

1. Pack defines:
   - `scoring_mode`: `uniform` | `allow_overrides`
   - `default_scoring` (or reference to a named scale)
   - optional `scoring_scales[]` catalog for reusable named scales
2. Each target either:
   - **inherits** (no local scoring override stored), or
   - **overrides** (stores a local scoring definition and/or `scale_id`), or
   - **references** a named pack scale (`scale_id`) without duplicating the full definition
3. Runtime always uses `resolveTargetScoring(pack, target)`.

| Lens | Assessment |
|------|------------|
| Advantages | Single source of truth; predictable bulk change; readable JSON; clinical clarity |
| Disadvantages | Requires a resolver everywhere; must teach override UX carefully |
| Versioning | Diffs show real intent (override added/removed), not stamped noise |
| Database | Pack remains JSONB; no per-target relational scoring tables required for authoring |
| Export | Must distinguish **authored** vs **resolved** export modes |

**Hybrid note:** Named pack scales are allowed as reusable definitions. That is still inheritance—targets reference definitions; they do not own silent copies unless they explicitly override.

## Rule 3 — "Use same scoring scale for all targets" is a pack mode

### Contract

The control is not a one-shot action. It sets:

```text
scoring_mode = "uniform"
```

**When Uniform mode is ON:**

1. All targets **inherit** the assessment default scoring definition.
2. Existing target scoring overrides are **removed** (after explicit confirmation).
3. Per-target scoring editors are **hidden/disabled**.
4. Changing the assessment default immediately changes effective scoring for **all** targets.
5. Import of packs with heterogeneous target scales must either refuse Uniform mode or require the user to choose: keep mixed (force Allow Overrides) or normalize (enter Uniform and discard differences).

**When Uniform mode is OFF (`allow_overrides`):**

1. Targets may inherit or override.
2. Previously discarded overrides are **not** auto-restored (unless the user undoes within the same editing session).
3. UI shows inheritance badges: `Inherited` vs `Custom`.

### Why this behaviour

| Criterion | Why Uniform-removes-overrides wins |
|-----------|-------------------------------------|
| Usability | One visible truth: either everything shares a scale, or overrides are allowed |
| Predictability | No hidden overrides surviving under a "same scale" label |
| Reversibility | Session undo can restore; cross-session restore would invent false history |
| Data integrity | Effective scale always matches author intent |
| Future assessments | PEAK/VB-MAPP packs that need mixed scales simply stay in Allow Overrides |

**Rejected behaviours:** hide editors but keep overrides; "preserve overrides silently"; overwrite only some targets; different rules for imported packs without surfacing the difference.

## Rule 4 — Target overrides are stored only when different

**Canonical internal representation:** sparse overrides.

- Do **not** always store a full scoring object on every target.
- Store target scoring **only when** it differs from the resolved inherited definition (or when it explicitly references a non-default named scale).
- Normalization on save: if a target's override equals the current default, **drop** the override.

Implications:

| Concern | Rule |
|---------|------|
| Serialization | Authored JSON is sparse and diff-friendly |
| Import/export | Importers may accept dense or sparse; saver normalizes to sparse |
| JSON readability | Humans can see which items are special |
| Version control | Diffs reveal intent |
| Migration | Existing dense packs normalize once: equal-to-default → remove |
| Maintenance | Bulk default changes do not rewrite thousands of identical blobs |

## Rule 5 — Persistence and editing sessions

### Editing session model

Opening a pack in the Builder creates an **editing session**:

- **Baseline:** last saved pack document (server truth)
- **Working copy:** in-memory (or durable draft) document under edit
- **Dirty:** working copy ≠ baseline

### Save

- Validates the working copy.
- Normalizes sparse overrides and Uniform mode invariants.
- Writes the full pack document atomically.
- Becomes the new baseline; dirty clears.
- Creates or updates version metadata per product versioning policy.

### Cancel

- Discards the working copy.
- Restores UI to baseline.
- Never partially applies fields.

### Reload

- Reloads baseline from server.
- If dirty, requires confirm: discard local changes or cancel reload.

### Unsaved edits / browser refresh / navigate away

- Dirty session must warn before unload/navigation.
- Ideal enterprise behaviour (Phase 2+): autosave durable draft separate from published/saved pack version.
- Phase 1 minimum: in-memory dirty + beforeunload + route guard.

### Validation failures

- Save is blocked.
- Validation summary lists errors with navigation to the offending domain/target/field.
- Partial invalid edits may remain in the working copy until fixed or cancelled—**never** silently drop them.

### Partial edits

- Allowed in the working copy.
- Not committed until Save succeeds.
- No "autosave some fields to server" without an explicit draft model.

### Concurrent editing

- Phase 1: last-write-wins with `updated_at` conflict detection (warn and require reload/overwrite).
- Phase 3: optional pack locking or presence; still never merge JSON blindly.

### Large packs

- Working copy may be virtualized in UI, but the document model remains one pack.
- Save remains whole-document for Alpha/near-term; chunked save is an implementation concern only if product invariants stay atomic from the author's perspective.

---

# Section analyses (design rationale)

## 1 — Assessment-level configuration

**Recommendation: Inherited configuration** for scoring and structural defaults; metadata for descriptive fields.

Assessment-level scoring is the instrument's default measurement system. Treating it as anything weaker produces the exact class of bugs recently exposed: reload surprises, inheritance confusion, and Matrix behaviour that depends on how the pack was last touched in the UI.

## 2 — Scoring architecture

**Recommendation: Model B+ (dynamic inheritance + sparse overrides + optional named scale catalog).**

This is the only model that survives ABLLS (mostly uniform with occasional exceptions), VB-MAPP (level-specific conventions), PEAK (module-specific systems), and org-custom instruments without forking the Builder.

## 3 — Uniform scoring control

**Recommendation: Pack mode that removes overrides, disables target scoring editors, and binds all targets to the assessment default.**

Anything less is a false affordance.

## 4 — Override storage

**Recommendation: Store only when different; normalize on save.**

Dense storage is an import accommodation, not the canonical authored form.

## 5 — State management

**Recommendation: Explicit editing session with atomic save, discard-on-cancel, dirty guards, and conflict detection.**

The Builder is an editor. Editors have sessions. Forms that patch fields live have no place as the long-term model for thousand-item instruments.

## 6 — Builder UX

**Recommendation: Evolve into a professional authoring editor.**

A scrolling configuration form does not scale to ABLLS/AFLS/PEAK. Long-term UX philosophy:

- Sticky header with pack title, dirty indicator, Save, Cancel
- Persistent left navigation (domains / secondary groups / targets)
- Search + filter (by override status, missing criteria, scoring type)
- Collapsible sections; open one domain deeply at a time
- Validation summary drawer
- Keyboard shortcuts for save, search, next/previous target
- Breadcrumbs: Pack → Domain → Target
- Stable scroll restoration when navigating validation errors

## 7 — Import / Export

### Principles

1. **Authored vs Resolved** are different export modes.
2. Importers accept messy reality; savers emit canonical sparse form.
3. Missing scoring values inherit; they do not invent a second default.
4. Backward compatibility is mandatory; migrations are additive then normalizing.

### Contracts

| Operation | Expected behaviour |
|-----------|--------------------|
| CSV import | Map columns to pack fields; absent scoring → inherit; mixed scales → `allow_overrides`; optional Uniform normalize with confirm |
| JSON import | Accept dense or sparse; validate; normalize to sparse on save |
| CSV export | Include effective scoring columns; mark override vs inherited |
| JSON export (authored) | Sparse canonical document |
| JSON export (resolved) | Fully expanded effective scoring for interoperability |
| Pack duplication | Deep copy authored document; new ids/version; preserve modes/overrides |
| Version cloning | Same as duplication with lineage pointer to prior version |
| Global defaults | Travel with the pack as inherited configuration |
| Target overrides | Travel only if present; never re-expand on save |
| Missing values | Resolve via inheritance at runtime; do not write fabricated overrides |
| Backward compatibility | Old dense packs remain readable; normalize when opened/saved |
| Future migrations | Additive schema + pure normalize functions; no silent clinical meaning changes |

## 8 — Clinical perspective

### What clinicians naturally expect

- "Default scale" means the assessment's scale.
- Special items are visibly special.
- Uniform means uniform.
- Imported publisher-style packs remain intelligible months later.

### Hidden risks if philosophy stays form-like

- Accidental mixed scales under a uniform label
- Silent drift after "change default"
- Inability to audit which items are exceptions
- Training burden ("don't touch that toggle")
- Loss of trust when Matrix buttons disagree with author memory
- Org-custom packs becoming unmaintainable folklore

### Clinical integrity rule

> **If two clinicians open the same saved pack, they must derive the same effective scoring for every target without tribal knowledge.**

## 9 — Long-term scalability

The proposed architecture works for ABLLS-R, AFLS, VB-MAPP, PEAK, ESDM, Vineland-like customs, and org-created instruments **if and only if**:

1. Hierarchy labels remain configurable (Domain/Level/Module/Age Band).
2. Secondary grouping remains optional metadata, not a second source of truth.
3. Scoring remains inheritance + named scales + sparse overrides.
4. Runtime consumers always use the resolver.
5. The Builder becomes an editor capable of large documents.

**Required now (not later):**

- Named scoring scale catalog at pack level
- `scoring_mode` uniform vs allow_overrides
- Sparse override normalization
- Resolved vs authored export
- Editor UX trajectory (even if Phase 1 is only sticky header + validation summary)

**Avoid:** assessment-specific Builders, copying scales into targets as the primary model, or treating CSV shape as the pack schema.

## 10 — Product consistency audit (conceptual)

| Area | Inconsistency to eliminate |
|------|----------------------------|
| Product | Builder as form vs Matrix/Snapshot as professional clinical surfaces |
| Conceptual | "Default scale" that does not actually default |
| Workflow | Field-level auto-persistence vs explicit Save/Cancel expectations |
| Terminology | Default / global / same / override / custom used interchangeably |
| State | Session dirty state unclear on reload/refresh |
| Inheritance | Copy-on-save patterns fighting dynamic inheritance |
| UX | Critical actions buried; no outline for large packs |
| Data model | Dense target scoring implying false independence from pack defaults |

---

# UX Principles

## Critical

1. **Sticky authoring chrome** — title, dirty state, Save, Cancel always available.
2. **Visible inheritance** — every target shows Inherited vs Custom scoring.
3. **Uniform mode honesty** — enabling Uniform confirms override removal; UI disables local scale editors.
4. **Validation summary** — blocking issues are listable and jumpable before Save.
5. **Navigation outline** — domains (and secondary groups) must be reachable without endless scrolling.

## High

6. Search targets by title/id.
7. Filter: missing criteria, custom scoring, incomplete required fields.
8. Breadcrumbs and deep-linkable target focus.
9. Keyboard save / search / next error.
10. Authored vs Resolved export clearly labeled.

## Medium

11. Collapsible domain sections with remember-last-open.
12. Bulk actions: apply named scale to selection; clear overrides on selection.
13. Pack compare / version diff emphasizing override and scale changes.
14. Autosave durable drafts (separate from published save).

## Low

15. Presence/avatars for concurrent editors.
16. Advanced keyboard command palette.
17. In-editor preview of Matrix scoring controls from resolved scoring.
18. AI-assisted criteria drafting (never silent scoring changes).

---

# Architectural Recommendations

## Product Decisions

These are binding product rules:

1. Builder = structured assessment authoring environment.
2. Assessment scoring = inherited configuration.
3. Canonical scoring = dynamic inheritance + sparse overrides + named scales.
4. Uniform scoring = pack mode that removes overrides and binds all targets to default.
5. Overrides stored only when different; normalize on save.
6. Editing = explicit session; Save commits; Cancel discards.
7. Runtime and exports that need effective values must call a single resolver.
8. Import accepts diversity; save emits canonical sparse authored form.
9. UX trajectory = professional editor, not longer forms.
10. No assessment-specific Builder forks.

## Implementation Recommendations

Guidance for engineering (non-binding on product meaning):

1. Implement `resolveTargetScoring(pack, target)` as a pure shared function used by Builder, Matrix, Snapshot, analytics, exports.
2. Persist `scoring_mode` and `default_scoring` / `scoring_scales` on the pack document.
3. On save, run `normalizePackScoring(pack)` to enforce Uniform invariants and sparse overrides.
4. Migrate existing dense packs opportunistically on open/save; do not require a blocking big-bang rewrite.
5. Add route guards + beforeunload for dirty sessions; add `updated_at` conflict checks.
6. Rebuild Builder shell toward editor chrome incrementally (sticky header → outline → search → virtualization).
7. Keep pack authoring in JSONB; do not relationalize targets for authoring unless enterprise scale later demands it.
8. Never teach feature flags that preserve ambiguous dual semantics of Uniform mode.

---

# Risks

If the current form-like, ambiguous-inheritance philosophy is not corrected:

1. **Clinical trust erosion** — effective scales disagree with author intent.
2. **Combinatorial QA cost** — every assessment type multiplies edge cases.
3. **Import/export folklore** — only one engineer understands "why that CSV looks like that."
4. **Analytics corruption** — longitudinal comparisons across cycles/packs become non-comparable.
5. **Enterprise authoring failure** — orgs building custom assessments abandon the Builder.
6. **Snapshot/Matrix divergence** — frozen snapshots encode accidents of UI state.
7. **Irreversible content debt** — years of packs with stamped pseudo-defaults that cannot be bulk-maintained.
8. **Training tax** — BCBAs learn workarounds instead of a coherent instrument model.

---

# Future Roadmap

## Phase 1 — Immediate Builder hardening

- Codify inheritance + sparse overrides as product rules in UI copy and validation.
- Define Uniform mode contract with confirmation and override removal.
- Explicit dirty/Save/Cancel/reload behaviour.
- Shared scoring resolver across Builder and runtime.
- Normalize-on-save for dense legacy packs.
- Sticky header with Save/Cancel + basic validation summary.
- Terminology cleanup: Inherited / Custom / Uniform / Allow overrides.

## Phase 2 — Builder modernization

- Left outline navigation for domains/groups/targets.
- Search, filter, jump-to-validation-error.
- Named scoring scale catalog UX.
- Authored vs Resolved export modes.
- Durable draft autosave.
- Bulk override operations.
- Virtualized target lists for large packs.
- Pack version diff focused on scoring/structure intent.

## Phase 3 — Enterprise authoring experience (3–5 years)

- Multi-user authoring safeguards (lock or presence + non-destructive conflict UX).
- Organization template libraries and governed pack publishing.
- Cross-pack scale libraries (org-level), still resolved into pack documents on publish.
- Advanced hierarchy authoring for VB-MAPP/PEAK/ESDM without custom Builders.
- In-editor Matrix preview from resolved scoring.
- Accessibility-certified keyboard authoring workflows.
- Policy-aware IP boundaries for licensed content vs org-authored content.
- Audit trail of clinically material pack changes (who changed scoring definitions and when).

---

# Appendix A — Canonical glossary

| Term | Meaning |
|------|---------|
| **Pack** | Versioned assessment instrument document |
| **Inherited configuration** | Pack-level settings that resolve onto targets unless overridden |
| **Override** | Target-level scoring that differs from inheritance |
| **Uniform mode** | Pack mode where all targets inherit; overrides disallowed/absent |
| **Allow overrides** | Pack mode where targets may customize scoring |
| **Named scale** | Reusable scoring definition in the pack catalog |
| **Resolved scoring** | Effective scoring after inheritance resolution |
| **Authored document** | Sparse saved pack form |
| **Editing session** | Working copy derived from baseline until Save or Cancel |
| **Freeze / snapshot** | Immutable pack copy captured on assessment creation |

# Appendix B — Non-goals

- This document does not prescribe React component structure.
- This document does not authorize a specific migration PR.
- This document does not redefine Matrix scoring UX beyond requiring resolver use.
- This document does not claim current code already implements these rules.

---

# Closing position

The Assessment Builder should be one of Evalis's flagship surfaces: the place thousands of clinicians trust to define instruments that drive care decisions for years.

That requires an opinionated model:

> **Author a sparse, inheritance-aware instrument. Resolve it everywhere. Edit it in sessions. Make Uniform mean Uniform. Make Custom visible. Scale the UX like an editor, not a form.**

Anything less will keep producing local bugfixes that never restore product clarity.
