# Phase B — PR B1
## Canonical Scoring Model Specification

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (authored scoring model contract) |
| **Phase / PR** | Phase B · PR B1 |
| **Status** | Authoritative product contract for Builder, QA, and Overseer |
| **References** | [`assessment_builder_canonical_product_architecture.md`](./assessment_builder_canonical_product_architecture.md) · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) · Commit `bad2e24` (Phase A Effective Scoring runtime truth) |
| **Non-goals** | Implementation details · code · Builder UX redesign · editing sessions · interchange redesign |

This document defines the **canonical authored scoring model** that Phase B introduces.

It extends Phase A without weakening it:

> Phase A made Effective Scoring the only runtime truth.  
> PR B1 defines how Authored Scoring is structured so Effective Scoring can be produced by **inheritance**, not only by dense per-target copies.

---

# 1. Goals

## 1.1 What Phase A delivered

Phase A (`bad2e24`) established:

- Effective Scoring as the single runtime scoring definition
- Identical interpretation across Matrix, validation, Snapshot, Learner Map, Reports, Analytics, Domain Profiles, and Exports
- Frozen Assessment Consistency (G8): assessments resolve from their own `pack_snapshot`

Phase A intentionally **did not** change authored pack structure, inheritance, Uniform semantics, or override storage.

## 1.2 Problems PR B1 solves

| Deferred problem | Why it matters | PR B1 outcome |
|------------------|----------------|---------------|
| No pack-level default scoring as inherited configuration | “Default scale” was session/UI semantics, not instrument truth | Pack owns a persisted default scoring definition |
| No scoring inheritance | Changing the instrument default could not update inheriting targets | Targets inherit unless they override |
| Dense per-target scoring as the only authored form | Large packs duplicate identical scoring; diffs hide intent | Sparse overrides become the canonical authored form |
| Uniform was not a real mode | “Same scale for all” could hide divergent target scoring | Uniform / Custom are persisted pack modes with invariants |
| Named scales had no durable authored role in the model | Catalog could not be a first-class inheritance source | Model reserves named-scale references without requiring catalog UX now |
| Authored storage disagreed with clinical mental model | Clinicians think in “assessment default + exceptions” | Authored model matches that mental model |

## 1.3 What PR B1 does not solve

- Builder layout, navigation, sticky chrome, search, or editor shell
- Editing-session dirty/save/cancel contracts
- Import/export authored-vs-resolved interchange redesign
- Org-level scale libraries
- Changing Phase A runtime consumer contracts (they remain Effective-Scoring consumers)

## 1.4 Success statement

After PR B1 is accepted and applied:

> An authored pack expresses scoring as **pack default + mode + sparse target overrides** (with optional named-scale references).  
> Effective Scoring for every target is derived solely by Canonical Resolution.  
> Migrated legacy packs preserve prior Effective Scoring for every target.

---

# 2. Canonical Data Model

## 2.1 Conceptual layers

```text
Authored Scoring Document (pack)
  ├── scoring_mode
  ├── default scoring configuration
  ├── optional named scoring scale catalog (future-ready)
  └── targets
        └── override scoring (present only when Custom and different)

        │ Canonical Resolution (extends Phase A)
        ▼

Effective Scoring Definition (per target)
  └── consumed by all runtime surfaces (Phase A law unchanged)
```

## 2.2 Pack-level scoring configuration

Every pack document owns the following authored scoring configuration:

| Element | Product meaning | Required? |
|---------|-----------------|-----------|
| **Scoring mode** | Whether the instrument is Uniform or Custom | Yes |
| **Default scoring definition** | The inherited scoring configuration for targets that do not override | Yes |
| **Named scoring scale catalog** | Reusable named scoring definitions referenced by id | Optional (future-ready; may be absent) |

### Default scoring definition

The pack default is **inherited configuration**, not metadata and not a one-time copy instruction.

It defines the instrument’s baseline measurement system, including determinate answers for the same attribute family as Effective Scoring:

- scoring type
- scale values (when applicable)
- scale labels (when applicable)
- task steps (when applicable)
- no-opportunity allowance
- optional reference to a named catalog scale as the default source

Product rule:

> Changing the pack default changes Effective Scoring for every target that inherits, immediately and without rewriting those targets’ authored storage.

## 2.3 Target scoring

Each target has one of two authored states:

| State | Meaning |
|-------|---------|
| **Inherited** | Target stores no scoring override. Effective Scoring comes from pack default (and named-scale resolution if the default or catalog participates). |
| **Override (Custom only)** | Target stores a scoring override that differs from what inheritance would produce. |

Targets do not store “a full independent scoring system by default.” Independence is an explicit override.

## 2.4 Override representation

An **override** is authored target scoring that intentionally replaces inheritance for that target.

Product properties:

- Exists only when mode is **Custom**
- Exists only when the target’s intended Effective Scoring would differ from pure inheritance
- Is absent when the target should follow the pack default
- May be expressed as:
  - inline scoring attributes that differ from inheritance, and/or
  - a named scale reference that yields a different Effective Scoring than the pack default

An override is **not**:

- a mandatory field on every target
- a silent copy of the pack default
- evidence that Uniform mode is active

## 2.5 Authored storage vs effective runtime resolution

| Representation | Role |
|----------------|------|
| **Authored storage** | What the pack document persists: mode, default, optional catalog, sparse overrides |
| **Effective Scoring** | What runtime uses after Canonical Resolution (Phase A concept, Phase B inputs expanded) |

Relationship:

```text
Authored(pack, target)  --resolve-->  Effective(pack, target)
```

Invariants:

1. Runtime never treats authored storage as Effective Scoring.
2. Builder/authoring may display authored state (Inherited vs Override) but runtime remains Effective-only.
3. Frozen assessments continue to resolve from their own authored `pack_snapshot` (G8).

## 2.6 Completeness rule for defaults

The pack default must be sufficient to produce a complete Effective Scoring Definition for any inheriting target without consulting other targets.

No target may be required as a “hidden template” for another target’s inheritance.

---

# 3. Scoring Modes

PR B1 defines exactly two pack scoring modes:

| Mode name (product) | Meaning |
|---------------------|---------|
| **Uniform** | All targets inherit the pack default. Overrides are disallowed and must be absent. |
| **Custom** | Targets may inherit or override. Overrides are allowed when they differ from inheritance. |

*(Canonical synonym for Custom: `allow_overrides`. Product language for PR B1 uses **Uniform** and **Custom**.)*

## 3.1 Ownership

| Concern | Owner |
|---------|-------|
| Scoring mode | The pack document |
| Pack default scoring | The pack document |
| Whether a target overrides | The target’s authored override presence (Custom only) |
| Effective Scoring | Canonical Resolution over the pack context |

Mode is **not** ephemeral UI state. Mode is persisted pack configuration.

## 3.2 Persistence

- Mode is stored with the pack and travels with pack duplication, versioning, and assessment freeze.
- Reopening a pack restores the saved mode.
- Assessment `pack_snapshot` freezes the mode that existed at assessment creation.

## 3.3 Uniform mode

### Meaning

Uniform declares:

> This instrument uses one scoring definition for every target: the pack default.

### Invariants while Uniform

1. Every target is Inherited.
2. No target override is present in authored storage.
3. Effective Scoring for every target equals Effective Scoring of the pack default (after named-scale resolution if the default references a catalog entry).
4. Changing the pack default changes Effective Scoring for all targets.

### Transitions into Uniform

Entering Uniform from Custom is a **mode transition with data consequences**:

1. Author intent must be explicit (product confirmation is required when any overrides exist).
2. All overrides are removed.
3. Mode becomes Uniform.
4. Effective Scoring for all targets becomes the pack default’s Effective Scoring.

Rejected Uniform meanings:

- hide override editors but keep overrides
- claim sameness while authored overrides remain
- apply labels globally while leaving divergent scales

## 3.4 Custom mode

### Meaning

Custom declares:

> This instrument has a pack default, and individual targets may differ.

### Invariants while Custom

1. Targets without overrides inherit the pack default.
2. Targets with overrides use override precedence (§4).
3. Overrides that equal inheritance must not remain (§5 normalization).
4. Leaving Custom for Uniform clears overrides (§3.3).

### Transitions into Custom

Entering Custom from Uniform:

1. Mode becomes Custom.
2. All targets remain Inherited until an override is explicitly created.
3. Previously cleared overrides are **not** restored across sessions.

## 3.5 Mode transition summary

| From → To | Authored result | Effective result |
|-----------|-----------------|------------------|
| Custom → Uniform | Overrides removed; mode Uniform | All targets follow pack default |
| Uniform → Custom | Mode Custom; no new overrides invented | Still all follow pack default until overrides are added |
| Save in either mode | Normalized authored form (§5) | Unchanged by normalization itself |

## 3.6 Homogeneity is not mode

A Custom pack may happen to have no overrides (all inherited). That pack is still Custom.

Uniform is an explicit product declaration of enforced homogeneity, not a computed observation of current equality.

---

# 4. Inheritance Rules

## 4.1 Default inheritance

For any target with no override:

```text
Effective(target) = Effective(pack default)
```

where Effective(pack default) applies named-scale resolution if the default references a catalog scale.

Inheritance is **dynamic**:

- It is evaluated at resolution time.
- It does not require copying default attributes onto the target.
- It remains true after pack-default edits for all Inherited targets.

## 4.2 Override precedence

When a target has an override, resolution uses this precedence (highest wins):

1. **Target override attributes that are explicitly authored**
2. **Named scale referenced by the target override** (for attributes not explicitly set inline on the override)
3. **Pack default** is not mixed attribute-by-attribute into an override except where the override intentionally references shared catalog definitions

Product clarification:

> An override replaces inheritance for the target’s Effective Scoring as a definition. It is not a patch that silently fills unspecified clinical meaning from the pack default unless the override explicitly participates in named-scale reference semantics.

For PR B1, an override is treated as a **complete intended scoring definition** once normalized. Partial/ambiguous overrides are invalid authored state and must be rejected before save.

## 4.3 Fallback behaviour

Fallbacks exist only inside Canonical Resolution, never as per-surface invention (Phase A law).

Phase B adds these authored fallbacks:

| Situation | Product behaviour |
|-----------|-------------------|
| Target Inherited | Use pack default (then catalog if referenced) |
| Target Override present | Use override definition (then catalog if referenced by override) |
| Default references unknown named scale | Resolve from inline default attributes only; do not invent catalog data |
| Override references unknown named scale | Resolve from inline override attributes only |
| Legacy dense target with no pack default yet | Migration supplies pack default first (§7); resolution then follows Phase B rules |
| Empty/invalid default | Pack is not saveable; runtime of a corrupt document is undefined and must be prevented by authoring validation |

## 4.4 Named scale interaction (future-ready)

PR B1 requires the model to support named scales without depending on Builder catalog UX.

Rules:

1. A pack may include an optional named scoring scale catalog.
2. Pack default may reference a named scale.
3. A target override may reference a named scale.
4. Named-scale resolution participates in producing Effective Scoring exactly as Phase A required for catalog references, now also reachable through pack default inheritance.
5. Absence of a catalog is valid.
6. Presence of a catalog does not change Uniform/Custom meaning.
7. Under Uniform, targets must not carry per-target named-scale overrides; only the pack default (possibly catalog-backed) applies.

PR B1 does **not** require authors to manage a catalog UI. It requires that authored documents and resolution treat catalog references as lawful.

---

# 5. Sparse Override Model

## 5.1 When overrides exist

A target override exists if and only if:

1. Pack mode is **Custom**, and
2. The target’s intended Effective Scoring differs from Effective(pack default), and
3. The override has been explicitly authored (or preserved from migration because it differs)

## 5.2 When overrides are removed

Overrides are removed when any of the following occur:

| Event | Result |
|-------|--------|
| Mode transitions to Uniform | All overrides removed |
| Author clears a target’s customization while Custom | That target returns to Inherited |
| Normalization determines override equals inheritance | Override removed |
| Migration finds target scoring equal to migrated pack default | Target becomes Inherited (no override stored) |

Overrides are **not** removed merely because the Builder UI hides fields, nor because a session checkbox is toggled without a true mode transition.

## 5.3 Normalization rules

Normalization is part of the authored model contract. It runs whenever a pack is committed to durable authored storage (save / migrate-on-save).

### N1 — Mode integrity

- If mode is Uniform: remove all target overrides.
- If mode is Custom: retain only differing overrides.

### N2 — Equality collapse

If a target override’s Effective Scoring equals Effective(pack default), remove the override.

Equality is defined on Effective Scoring meaning (type, allowed values, max basis, labels, task steps, flags), not on accidental storage shape.

### N3 — No default copies

Do not write pack-default attributes onto Inherited targets.

### N4 — Default completeness

Persist a complete pack default capable of standing alone for inheritance.

### N5 — Catalog references

Preserve lawful named-scale references on pack default or overrides. Do not expand catalog entries into dense copies as the canonical authored form.

### N6 — Non-scoring fields untouched

Normalization does not alter target clinical content (title, criteria, materials, instructions, examples, notes) or structure identifiers.

## 5.4 Storage guarantees

After normalization, authored storage guarantees:

1. **Uniform packs** store mode + default (+ optional catalog) and **zero** target scoring overrides.
2. **Custom packs** store mode + default (+ optional catalog) and overrides **only** for exceptional targets.
3. Inherited targets are identifiable by **absence** of override storage.
4. Authored documents remain backward-resolvable into Effective Scoring by Canonical Resolution.
5. Sparse authored form and dense legacy form that resolve identically are clinically equivalent at runtime; sparse is the canonical authored target state going forward.

---

# 6. Product Invariants

These must remain true regardless of future implementation choices.

### I1 — Effective Scoring remains runtime truth

Phase A law is unchanged. All runtime consumers use Effective Scoring only.

### I2 — Authored model is inheritance-based

Pack default is inherited configuration. Targets inherit unless they override.

### I3 — Sparse overrides only

Canonical authored storage does not retain target scoring that merely duplicates inheritance.

### I4 — Uniform means enforced homogeneity

Uniform packs have no overrides. Effective Scoring is identical for all targets and tracks the pack default.

### I5 — Custom means optional exceptions

Custom packs may contain overrides. Absence of overrides does not auto-convert mode to Uniform.

### I6 — Mode is persisted pack truth

Scoring mode is not ephemeral UI state and must reopen as saved.

### I7 — Dynamic inheritance

Editing the pack default updates Effective Scoring for all Inherited targets without rewriting those targets.

### I8 — Override precedence is explicit

Overrides replace inheritance for that target; they are not silent partial patches of ambiguous meaning.

### I9 — Named scales are lawful but optional

Catalog references may participate in default or override resolution; packs without catalogs remain valid.

### I10 — Frozen Assessment Consistency (G8)

Assessments resolve Effective Scoring from their own frozen `pack_snapshot`. Later live-pack model migrations do not rewrite historical snapshots’ meaning except by resolving that snapshot’s authored content under compatible resolution rules that preserve Effective Scoring.

### I11 — Migration preserves Effective Scoring

Applying PR B1 migration to a legacy pack must not change any target’s Effective Scoring.

### I12 — No dual Uniform semantics

There is one Uniform contract. Hidden-overrides-under-Uniform is permanently rejected.

### I13 — Resolution purity

Effective Scoring depends only on pack authored scoring context + target identity/override state—not on Builder session defaults, display order, or which screen requested resolution.

---

# 7. Migration Strategy

## 7.1 Objective

Migrate existing dense packs into the canonical authored model **without changing runtime behaviour**.

For every target:

```text
EffectiveScoring_before_migration(pack, target)
  ==
EffectiveScoring_after_migration(migrated_pack, target)
```

## 7.2 What migrates

| Artifact | Migration behaviour |
|----------|---------------------|
| Live content packs | Eligible for authored-model migration on open/save (or explicit migrate) |
| New pack saves after PR B1 | Must emit canonical authored form |
| Existing assessment `pack_snapshot` values | **Not rewritten** by live-pack migration (G8) |
| Runtime of old snapshots | Remains correct via resolution compatibility with dense authored snapshots |

## 7.3 Deterministic migration rules

Migration is a pure authored transform:

### M1 — Establish pack default

Choose a pack default scoring definition deterministically from the legacy pack such that preserving Effective Scoring is possible.

Canonical choice order:

1. If a lawful pack-level default already exists, keep it.
2. Otherwise, if all targets share one Effective Scoring definition, that definition becomes the pack default.
3. Otherwise (heterogeneous targets), select the **modal** Effective Scoring definition among targets (most frequent). Ties break by first occurrence in stable pack order (domain order, then target order).

The chosen default must itself be a complete scoring definition.

### M2 — Establish mode

- If every target’s Effective Scoring equals the chosen pack default → mode **Uniform**
- Otherwise → mode **Custom**

### M3 — Sparsify targets

- For each target whose Effective Scoring equals the pack default → store as Inherited (remove dense duplicate scoring)
- For each target whose Effective Scoring differs → retain an override that preserves that Effective Scoring

### M4 — Uniform cleanup

If mode is Uniform, ensure no overrides remain (should already follow from M2–M3).

### M5 — Do not invent clinical meaning

Migration must not change labels, types, scales, or flags in ways that alter Effective Scoring. It may only restructure authorship (default + mode + sparse overrides).

## 7.4 Runtime compatibility for unmigrated snapshots

Historical assessments may still contain dense per-target scoring and may lack pack mode/default fields.

Compatible resolution requirement:

> Dense legacy snapshots must continue to produce the same Effective Scoring they produced under Phase A.

Therefore Canonical Resolution must accept:

- canonical sparse packs (mode + default + overrides), and
- legacy dense packs/snapshots (per-target scoring, optional catalog),

without clinical drift.

Live-pack migration is an authored modernization path; it is not a requirement to mutate frozen history.

## 7.5 Behaviour-preservation proof obligation

PR B1 is incomplete unless migration can demonstrate, on representative fixtures:

- all-identical dense numeric packs → Uniform + default + no overrides, same Effective Scoring
- mixed numeric packs → Custom + default + overrides only for exceptions, same Effective Scoring
- yes/no / checkbox / mixed-type packs preserve Effective Scoring
- named-scale legacy packs preserve Effective Scoring
- empty-scale / fallback cases preserve the Phase A Effective Scoring fallbacks

---

# 8. Acceptance Criteria

PR B1 is complete only when all of the following are true.

## 8.1 Model completeness

- [ ] Pack-level scoring configuration is fully defined (mode, default, optional catalog)
- [ ] Target Inherited vs Override states are fully defined
- [ ] Authored vs Effective relationship is explicit and Phase A–compatible
- [ ] Uniform and Custom ownership, persistence, transitions, and invariants are fully specified
- [ ] Inheritance, precedence, fallbacks, and named-scale interaction are fully specified
- [ ] Sparse override existence, removal, normalization, and storage guarantees are fully specified
- [ ] Product invariants I1–I13 are accepted as binding

## 8.2 Phase A non-regression (contract level)

- [ ] Effective Scoring remains the only runtime scoring authority
- [ ] G8 Frozen Assessment Consistency remains binding
- [ ] No acceptance of dual/parallel scoring-definition logic for runtime consumers

## 8.3 Behaviour-preserving migration

- [ ] Migration rules M1–M5 are deterministic
- [ ] For agreed fixtures, Effective Scoring is unchanged for every target after migration
- [ ] Frozen snapshots are not required to be rewritten to preserve runtime meaning
- [ ] Legacy dense snapshots remain resolvable to prior Effective Scoring

## 8.4 Mode honesty

- [ ] Uniform cannot coexist with retained overrides in the canonical model
- [ ] Custom may have zero overrides without being silently converted to Uniform
- [ ] Mode is persisted pack truth, not ephemeral UI state

## 8.5 Sparse authored form

- [ ] Inherited targets store no duplicate default scoring
- [ ] Overrides exist only when Effective Scoring differs from inheritance
- [ ] Normalization collapses equal overrides

## 8.6 Named-scale readiness

- [ ] Model allows pack default and overrides to reference named scales
- [ ] Model remains valid with no catalog present
- [ ] Uniform forbids per-target named-scale overrides

## 8.7 Explicit non-scope held

- [ ] No Builder UX redesign is required for PR B1 acceptance as a model specification
- [ ] No editing-session redesign is included
- [ ] No interchange export redesign is included

## 8.8 Gate to later Phase B work

After PR B1 acceptance, later Phase B work may implement:

- persisting and resolving the model in product behaviour
- Uniform/Custom transitions in authoring workflows
- normalize-on-save against this contract

Those later slices are out of scope for this specification’s authorship, but they are invalid if they violate this model.

---

# 9. Out of Scope

| Topic | Where it belongs |
|-------|------------------|
| Builder visual redesign / navigation / sticky chrome | Later UX phases |
| Dirty-state editing sessions | Phase C |
| Confirm-dialog microcopy and control layout | Later authoring workflow slices |
| Authored vs Resolved pack export formats | Phase E |
| Import wizard redesign | Phase E |
| Org-level scale libraries | Phase F |
| Changing competency-band clinical policy | Separate product decision |
| Rewriting historical `pack_snapshot` blobs in place | Rejected by G8 |

---

# 10. Closing Contract Statement

**PR B1 canonical scoring model:**

1. Packs own **scoring mode** and **default scoring**.
2. Targets **inherit** by default and store **sparse overrides** only when Custom and different.
3. **Uniform** means enforced homogeneity with no overrides.
4. **Custom** means default plus optional exceptions.
5. Named scales are optional, lawful resolution sources for defaults and overrides.
6. Authored storage is inheritance-aware and sparse; runtime remains Effective Scoring (Phase A).
7. Migration restructures authorship without changing Effective Scoring.
8. Frozen assessments continue to resolve from their own snapshots (G8).

This is the authored scoring contract that all subsequent Phase B work must satisfy.
