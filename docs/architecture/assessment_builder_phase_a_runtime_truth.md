# Phase A — Runtime Truth Foundation
## Product Architecture Specification

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Phase** | A — Runtime Truth Foundation |
| **Status** | Authoritative product contract for Builder, QA, and Overseer |
| **Depends on** | [`assessment_builder_canonical_product_architecture.md`](./assessment_builder_canonical_product_architecture.md) |
| **Informed by** | [`assessment_builder_conformance_audit.md`](./assessment_builder_conformance_audit.md) |
| **Non-goals** | Code · implementation tasks · Builder inheritance redesign · UX redesign |

This specification defines the **product behaviour** every Phase A implementation must satisfy.

After Phase A:

> **There must never be a situation where two parts of Evalis interpret the same assessment’s scoring rules differently.**

---

# 1. Executive Summary

Phase A establishes **Effective Scoring** as the single runtime scoring definition for every consumer of an assessment pack or frozen `pack_snapshot`.

Phase A does **not** change how packs are authored, how defaults inherit, how Uniform mode works, how overrides are stored, or how the Builder looks. Those belong to later phases.

Phase A **does** require that every runtime surface that needs to know “how is this target scored?” obtain that answer exclusively through the **Canonical Effective Scoring** definition—never by inventing local rules from raw authored fields.

---

# 2. Objective

Establish one authoritative definition of **Effective Scoring** such that:

1. Matrix buttons, validation, Snapshot, Learner Map, Reports, Analytics, Domain Profiles, and Exports all agree on:
   - scoring type
   - allowed scale values
   - scale labels
   - maximum score
   - task-step / checkbox cardinality
   - no-opportunity allowance
2. No runtime consumer maintains independent scoring-definition logic.
3. Viewing or exporting the same assessment from any surface yields the same effective scoring meaning for every target.

---

# 3. Scope

## In scope

Runtime consumers of pack scoring definitions, including:

- Assessment Matrix (controls, display, filters)
- Assessment score entry / update
- Assessment score validation / submission gatekeeping that depends on allowed scores
- Assessment Snapshot
- Learner Map
- Reports
- Analytics
- Domain Profiles
- CSV export of assessment results
- JSON export of assessment results (where scoring definitions affect output)
- Any future reporting, print, or analytics surface that depends on how targets are scored

Also in scope:

- The product distinction between **authored**, **effective**, and **resolved** scoring
- The rule that score **interpretation** and **aggregation** must be derived from Effective Scoring, not from raw authored fields
- Frozen `pack_snapshot` as the pack context for in-flight and historical assessments

## Out of scope (explicit)

See §12. Summarized:

- Scoring inheritance / pack default as dynamic source
- Sparse override storage
- Uniform mode contract redesign
- Editing sessions / dirty state
- Builder UX modernization
- Import/export authored-vs-resolved redesign as a Builder interchange feature
- Named-scale catalog authoring UX
- Changing clinical competency-band policy (except requiring it to use Effective Scoring inputs)

---

# 4. Canonical Definitions

## 4.1 Authored Scoring

**Authored Scoring** is the scoring information **as stored** on the pack document (or frozen assessment `pack_snapshot`).

It may include:

- Per-target scoring fields (type, scale, scale labels, task steps, flags, optional scale reference)
- Optional pack-level named scoring scale catalog entries

Authored Scoring is a **storage representation**. It may be incomplete relative to what a clinician experiences at runtime (for example, a target may reference a named scale rather than inline every field).

**Runtime consumers must not treat Authored Scoring as the final clinical scoring definition** unless the product explicitly marks a surface as an authoring/debug view of storage (none of the Phase A runtime surfaces listed in §3 are authoring views).

## 4.2 Effective Scoring

**Effective Scoring** (also called the **Effective Scoring Definition** for a target) is the complete, clinically authoritative scoring definition for a target within a specific pack context after Canonical Resolution Rules are applied.

Effective Scoring answers:

> **Given this pack (or pack snapshot) and this target, what are the complete rules for scoring this item?**

It always includes a determinate answer for:

| Attribute | Meaning |
|-----------|---------|
| Scoring type | numeric, yes/no, checkbox, text, or other supported type |
| Allowed values | The discrete values a recorded score may take (where applicable) |
| Maximum score | The authoritative max used for ratios, percentages, and “at maximum” |
| Scale labels | Display labels for values, when defined |
| Task steps | Checkbox / task-analysis steps, when applicable |
| No-opportunity allowed | Whether “no opportunity” is permitted |
| Resolution provenance | Whether the definition came from inline fields, a named scale, or a merge (for audit/debug; not required on every clinician UI) |

Effective Scoring is **not** the learner’s recorded score. It is the **instrument rule** for the item.

## 4.3 Resolved Scoring

For Phase A product language:

> **Resolved Scoring = Effective Scoring.**

“Resolved” names the process; “Effective” names the product result.

Documents and UI copy may say either term. Implementations and QA checklists should treat them as the same Phase A concept.

*(Later phases may extend resolution—for example pack-default inheritance—without renaming Effective Scoring. Resolution rules may grow; the product concept remains “the complete scoring definition every runtime surface must use.”)*

## 4.4 Related concepts (not synonyms)

| Concept | Definition | Relationship to Effective Scoring |
|---------|------------|-----------------------------------|
| **Recorded Score** | The value stored for a learner on a target in a cycle | Interpreted **against** Effective Scoring |
| **Score Interpretation** | Competency/display state derived from Recorded Score + Effective Scoring | Must use Effective Scoring for max, scale membership, type |
| **Domain / assessment aggregation** | Totals, percentages, points | Must use Effective Scoring maxima and type rules |
| **Builder session defaults** | UI-only defaults while authoring | Out of scope for Phase A runtime; must never be consulted by runtime consumers |

## 4.5 Which representation runtime surfaces use

| Surface class | Must use |
|---------------|----------|
| All Phase A runtime consumers in §3 | **Effective Scoring** |
| Pack authoring / Builder | Authored Scoring (out of Phase A behaviour change) |
| Storage / database pack JSON | Authored Scoring |
| Frozen assessment snapshot storage | Authored Scoring (frozen); runtime **reads** it only through Effective Scoring resolution |

**Rule:** Runtime may read the pack/snapshot document as input to resolution. Runtime may **not** bypass resolution and interpret authored fields with local rules.

---

# 5. Single Source of Truth

## 5.1 Source of truth statement

The single source of truth for **how a target is scored at runtime** is:

> **The Effective Scoring Definition produced by Canonical Resolution from the assessment’s pack context (`pack_snapshot` for assessments; pack document only when no freeze applies).**

For any in-flight or historical assessment, the pack context is the frozen `pack_snapshot` associated with that assessment—not a later edit of the live content pack.

## 5.2 What runtime consumers may access directly

Runtime consumers **may**:

1. Read the assessment’s pack context document as **input** to Canonical Resolution
2. Read Recorded Scores for the assessment/cycle
3. Consume **Effective Scoring** attributes
4. Consume Score Interpretations / aggregations that are themselves defined to depend only on Effective Scoring + Recorded Scores
5. Display structure metadata (domain titles, target titles, instructions, materials) that is not scoring-definition logic

## 5.3 What runtime consumers must never interpret themselves

Runtime consumers **must never**:

1. Derive allowed score values by reading authored `scale` alone when a named scale reference exists
2. Derive maximum score with a local formula that differs from Effective Scoring
3. Hardcode fallback scales (for example assuming `0–4`) except as defined inside Canonical Resolution itself
4. Implement a second “checkbox max” or “yes/no max” rule outside Canonical Resolution / the single interpretation layer that depends on it
5. Use Builder UI session state (default scale checkbox, draft CSV, etc.) for runtime meaning
6. Use the live content pack in place of an assessment’s frozen snapshot when resolving scoring for that assessment
7. Reimplement scale-label merging, type normalization, or “empty scale” behaviour locally

## 5.4 Prohibition of independent scoring logic

**Product law for Phase A:**

> No runtime consumer may implement independent scoring-definition logic.

All of the following are scoring-definition logic and must come from Effective Scoring (or from a single shared interpretation/aggregation layer that takes Effective Scoring as input):

- scoring type normalization for runtime behaviour
- allowed values
- max score
- scale labels used for scoring affordances
- checkbox / task-step cardinality used as max
- whether a recorded value is a member of the allowed scale

Surfaces may still implement **presentation** (layout, typography, print chrome) and **workflow** (permissions, cycle locks) without redefining scoring.

---

# 6. Canonical Resolution Rules (Phase A)

Phase A resolution operates on **current authored storage**, including optional named pack scales. It does **not** introduce pack-level default inheritance (Phase B).

## 6.1 Resolution inputs

- Pack context: `ContentPackData` equivalent (assessment `pack_snapshot` or pack document)
- Target identity and that target’s authored scoring fields

## 6.2 Resolution algorithm (product rules)

For each target:

1. Begin with the target’s authored scoring fields.
2. If the target references a named scale id:
   - If the id matches a pack catalog entry, use that entry to supply any scoring attributes not definitively provided inline.
   - Inline authored fields win over catalog fields when both are present (target override of a named scale).
   - If the id is unknown, resolve using inline authored fields only (do not invent catalog data).
3. If no named scale reference applies, Effective Scoring is the complete inline authored scoring definition, normalized by the shared type/value rules below.
4. Produce one Effective Scoring Definition with determinate type, allowed values (when applicable), max, labels, task steps, and flags.

## 6.3 Shared normalization rules (must be identical everywhere)

These rules are part of Effective Scoring, not per-surface policy:

| Case | Effective behaviour |
|------|---------------------|
| Yes/No types (including legacy aliases) | Allowed values `{0, 1}`; max `1` |
| Numeric with explicit scale values | Allowed values = that set; max = maximum of that set |
| Checkbox / task analysis with task steps | Max = number of steps; allowed values = `0..max` unless an explicit scale is defined |
| Checkbox without steps and without explicit scale | Effective max and allowed values follow the **single** Canonical Resolution fallback defined once for the product—not per consumer |
| Text scoring | No numeric allowed scale for button entry; max for aggregation follows the single canonical rule for text items |
| Empty / missing numeric scale with no named scale | Effective definition uses the **single** canonical fallback scale defined once—not divergent `0–4` assumptions per surface |
| Null recorded score | Always permitted as “clear / unscored”; not a scale member check failure |

Phase A requires that whatever fallback is chosen is **one** product fallback, applied identically by every consumer via Effective Scoring—not re-decided in Matrix vs Export vs Analytics.

## 6.4 Invariance

For a fixed pack context and target:

```text
EffectiveScoring(pack, target)
```

must return the same definition regardless of which runtime surface requests it.

---

# 7. Layered Runtime Model

```text
Authored pack / pack_snapshot
        │
        │  Canonical Resolution (Phase A rules)
        ▼
Effective Scoring Definition  ←── single runtime authority for scoring rules
        │
        ├── Score entry UI (allowed controls)
        ├── Score validation (membership)
        ├── Score Interpretation (competency / display)
        ├── Aggregations (domain %, points, analytics)
        └── Exports / Snapshot / Reports / Learner Map (all consume the above)
```

**Score Interpretation** remains a valid product layer, but it is **downstream** of Effective Scoring. It may not read authored scoring fields to decide max, scale membership, or type.

---

# 8. Runtime Contract by Consumer

For each consumer: Purpose · Inputs · Expected outputs · Allowed dependencies · Forbidden behaviour.

## 8.1 Assessment Matrix — score controls

| | Contract |
|--|----------|
| **Purpose** | Present the allowed scoring affordances for each target and capture Recorded Scores |
| **Inputs** | Assessment pack snapshot; target; current Recorded Score; permissions/cycle state |
| **Expected outputs** | Controls whose available values match Effective Scoring allowed values; labels from Effective Scoring |
| **Allowed dependencies** | Effective Scoring; Recorded Score; workflow permissions |
| **Forbidden** | Building button sets from authored `scale` without resolution; local yes/no or checkbox value invention |

## 8.2 Assessment Matrix — display, filters, detail views

| | Contract |
|--|----------|
| **Purpose** | Show scores, maxima, competency presentation, and filter states consistently with controls |
| **Inputs** | Pack snapshot; targets; Recorded Scores |
| **Expected outputs** | Displayed max, ratio, competency, and filter classification identical in meaning to interpretation based on Effective Scoring |
| **Allowed dependencies** | Effective Scoring; Score Interpretation layer; Recorded Scores |
| **Forbidden** | Using a different max or scale than score controls for the same target |

## 8.3 Assessment score validation / submission

| | Contract |
|--|----------|
| **Purpose** | Accept only Recorded Scores legal under Effective Scoring; enforce workflow submission rules |
| **Inputs** | Pack snapshot; target; proposed Recorded Score; workflow state |
| **Expected outputs** | Allow / reject consistently with Effective Scoring membership rules; null clear always allowed |
| **Allowed dependencies** | Effective Scoring; workflow/lifecycle rules |
| **Forbidden** | Validating against authored fields with different membership rules than Matrix controls |

## 8.4 Assessment Snapshot

| | Contract |
|--|----------|
| **Purpose** | Present a frozen clinical view of assessment structure and scores |
| **Inputs** | Assessment pack snapshot; Recorded Scores (and cycle context as product-defined) |
| **Expected outputs** | Per-target scoring meaning (max, scale display, competency) identical to Matrix interpretation for the same snapshot + scores |
| **Allowed dependencies** | Effective Scoring; Score Interpretation; structure display fields |
| **Forbidden** | Snapshot-specific scale/max logic; reading live pack instead of snapshot for scoring rules |

## 8.5 Learner Map

| | Contract |
|--|----------|
| **Purpose** | Longitudinal / map visualization of competency and progress |
| **Inputs** | Relevant pack snapshot(s); Recorded Scores across cycles as product-defined |
| **Expected outputs** | Competency and progress calculations that use Effective Scoring maxima/types per snapshot |
| **Allowed dependencies** | Effective Scoring per snapshot context; Score Interpretation; aggregations built on them |
| **Forbidden** | Cross-surface disagreement with Snapshot/Matrix for the same snapshot+score; authored-field max shortcuts |

## 8.6 Reports

| | Contract |
|--|----------|
| **Purpose** | Compose printable/shareable clinical report views |
| **Inputs** | Pack snapshot; Recorded Scores; report composition settings |
| **Expected outputs** | Score displays, maxima, and domain summaries consistent with Effective Scoring and shared interpretation/aggregation |
| **Allowed dependencies** | Effective Scoring; Score Interpretation; Domain Profiles / analytics that obey this spec |
| **Forbidden** | Report-local scoring definition rules |

## 8.7 Analytics

| | Contract |
|--|----------|
| **Purpose** | Compute domain/assessment statistics (points, percentages, coverage) |
| **Inputs** | Pack snapshot; Recorded Scores |
| **Expected outputs** | Statistics whose per-target maxima and type handling match Effective Scoring |
| **Allowed dependencies** | Effective Scoring; shared aggregation rules |
| **Forbidden** | Independent `get max from target.scoring` behaviour that can disagree with Matrix |

## 8.8 Domain Profiles

| | Contract |
|--|----------|
| **Purpose** | Summarize domain-level evidence and competency distributions |
| **Inputs** | Pack snapshot domain; targets; Recorded Scores |
| **Expected outputs** | Profile metrics consistent with Score Interpretation based on Effective Scoring |
| **Allowed dependencies** | Effective Scoring; Score Interpretation; Analytics aggregations |
| **Forbidden** | Domain-profile-specific scale interpretation |

## 8.9 CSV export (assessment results)

| | Contract |
|--|----------|
| **Purpose** | Export assessment results including score and max-score meaning |
| **Inputs** | Pack snapshot; Recorded Scores; export options |
| **Expected outputs** | Max score and related scoring columns reflect Effective Scoring for each target; same meaning as on-screen |
| **Allowed dependencies** | Effective Scoring; Recorded Scores; shared interpretation fields if exported |
| **Forbidden** | Export-local max formulas; blank/different max where UI shows a determinate Effective max |

## 8.10 JSON export (assessment results)

| | Contract |
|--|----------|
| **Purpose** | Machine-readable export of assessment results |
| **Inputs** | Pack snapshot; Recorded Scores; export options |
| **Expected outputs** | Any embedded scoring-definition or max fields reflect Effective Scoring; must not emit a contradictory authored-only definition labeled as effective |
| **Allowed dependencies** | Effective Scoring; Recorded Scores |
| **Forbidden** | Labeling authored storage fields as runtime-effective without resolution; consumer-specific resolution |

*Note: Pack-document authored JSON download for Builder interchange is out of Phase A redesign (§12). If a Phase A results export includes scoring rules, those rules must be Effective.*

## 8.11 Future reporting surfaces

| | Contract |
|--|----------|
| **Purpose** | Any new clinical/analytics view of scores |
| **Inputs** | Pack snapshot; Recorded Scores |
| **Expected outputs** | Identical Effective Scoring meaning for the same inputs |
| **Allowed dependencies** | Effective Scoring; shared interpretation/aggregation |
| **Forbidden** | New parallel scoring-definition logic of any kind |

---

# 9. Runtime Compliance Matrix

| Surface | Current behaviour (product) | Canonical Phase A behaviour | Status | Required behavioural change |
|---------|----------------------------|-----------------------------|--------|-----------------------------|
| Matrix score controls | Uses resolved scoring for allowed values | Effective Scoring for controls | 🟡 Near | Ensure definition is the shared Effective Scoring authority, not a parallel path |
| Matrix display / filters | Often uses authored/inline interpretation path | Same Effective Scoring as controls | 🔴 | Display/filter max, ratio, competency must match controls |
| Score validation | Uses resolved membership for writes | Effective Scoring membership | 🟡 Near | Must remain identical to Matrix allowed values |
| Snapshot | Interpretation from authored/inline path | Effective Scoring + shared interpretation | 🔴 | Align all snapshot score meaning to Effective Scoring |
| Learner Map | Interpretation/max from authored/inline path | Effective Scoring per snapshot | 🔴 | Align progress/competency inputs |
| Reports | Via profiles/analytics on authored path | Effective Scoring throughout composition | 🔴 | No report-specific definition drift |
| Analytics | Max/type from authored inline helpers | Effective Scoring maxima/types | 🔴 | Statistics must match Matrix meaning |
| Domain Profiles | Via interpretation on authored path | Effective Scoring + shared interpretation | 🔴 | Align distributions and summaries |
| CSV export | Local max logic from authored fields | Effective Scoring max/type columns | 🔴 | Export max must match on-screen Effective max |
| JSON results export | Not consistently Effective-scored | Effective Scoring when rules/max emitted | 🔴 | Do not emit contradictory scoring meaning |
| Future surfaces | N/A | Effective Scoring only | — | Bound by §8.11 |

**Phase A success condition:** every row is ✅ with no remaining independent scoring-definition behaviour.

---

# 10. Cross-Surface Consistency Guarantees

Phase A guarantees the following product invariants:

### G1 — Identical Effective Scoring

For the same pack snapshot and target, every runtime surface obtains the same Effective Scoring Definition.

### G2 — Controls ≡ Validation

Any value offered by Matrix controls is accepted by validation; any value rejected by validation is not offered as a normal allowed control value (null clear excepted).

### G3 — Controls ≡ Display

Displayed maximum, scale membership, and competency inputs for a target match the Effective Scoring used to render controls.

### G4 — On-screen ≡ Export

CSV/JSON result exports that include max or scale meaning match on-screen Effective Scoring for the same assessment snapshot.

### G5 — Snapshot ≡ Matrix

Snapshot score meaning matches Matrix for the same snapshot and Recorded Scores.

### G6 — Analytics ≡ Matrix maxima

Domain percentages and point totals use the same per-target maxima as Matrix/Effective Scoring.

### G7 — No authored bypass

No runtime consumer derives scoring-definition attributes from authored fields except through Canonical Resolution.

### G8 — Frozen Assessment Consistency

An assessment must always resolve Effective Scoring from its own frozen `pack_snapshot`. Changes to the live assessment pack must never alter the scoring interpretation of historical assessments.

This guarantee applies to Matrix, validation, Snapshot, Learner Map, Reports, Analytics, Domain Profiles, Exports, and any future runtime surface for that assessment. Re-opening, re-exporting, or re-aggregating a historical assessment must yield the same Effective Scoring Definitions as when the snapshot was frozen, regardless of later edits to the live content pack.

---

# 11. Acceptance Criteria (QA Checklist)

QA may validate Phase A without reference to implementation details.

## 11.1 Definitional

- [ ] Product glossary distinguishes Authored Scoring vs Effective Scoring vs Recorded Score vs Score Interpretation
- [ ] Resolved Scoring is documented as synonymous with Effective Scoring for Phase A
- [ ] Pack snapshot is documented as the pack context for assessment runtime resolution

## 11.2 Single authority

- [ ] No runtime surface documents or exhibits a private scoring-definition rule set
- [ ] Checkbox max, yes/no max, numeric max, and empty-scale fallback are identical across Matrix, Snapshot, Learner Map, Reports, Analytics, and Exports for fixture packs
- [ ] Named-scale reference packs: surfaces that show allowed values and maxima agree target-by-target
- [ ] Inline-only packs: same agreement target-by-target

## 11.3 Cross-surface identity fixtures

For at least one fixture assessment of each type below, compare Matrix, Snapshot, Learner Map (if applicable), Report, Analytics/domain %, and CSV export:

- [ ] Numeric explicit scale (e.g., `0,0.5,1`)
- [ ] Numeric classic scale (e.g., `0,1,2,3,4`)
- [ ] Yes/No
- [ ] Checkbox with task steps
- [ ] Checkbox without task steps (canonical fallback case)
- [ ] Target with named `scale_id` present in pack catalog
- [ ] Target with unknown `scale_id` and inline fallback fields
- [ ] Mixed-type domain

For each fixture and target:

- [ ] Allowed values match (where UI exposes them)
- [ ] Max score matches
- [ ] Competency/at-maximum behaviour matches for the same Recorded Scores
- [ ] Export max column matches on-screen max

## 11.4 Workflow

- [ ] Validation accepts exactly the Effective allowed set (+ null clear)
- [ ] Changing Recorded Score in Matrix updates Snapshot/Report/Analytics meaning without redefining the scale
- [ ] Runtime uses assessment `pack_snapshot`, not a subsequently edited live pack, for scoring rules of that assessment

## 11.4a Frozen Assessment Consistency (G8)

- [ ] After an assessment is created with a frozen `pack_snapshot`, editing the live content pack’s scoring definitions does not change Matrix allowed values, maxima, or competency meaning for that assessment
- [ ] Snapshot, Learner Map, Reports, Analytics, and Exports for the historical assessment continue to reflect the frozen snapshot’s Effective Scoring after live pack edits
- [ ] A second assessment created later from the edited live pack may differ; the original assessment must not

## 11.5 Prohibitions

- [ ] No runtime consumer uses Builder session default scale state
- [ ] No export uses a different max algorithm than Effective Scoring
- [ ] No surface treats authored storage as effective when a named scale would change the definition
- [ ] No runtime consumer resolves an assessment’s Effective Scoring from the live content pack when a `pack_snapshot` exists

## 11.6 Regression gate

- [ ] Existing Alpha assessments with dense inline scoring still display and score consistently (behaviour may change only where surfaces previously disagreed—disagreement resolution must be intentional and documented in release notes)
- [ ] Approval/immutability lifecycle behaviour unchanged except where it depended on incorrect maxima

---

# 12. Out of Scope (Later Phases)

Phase A **must not** be expanded to include:

| Topic | Phase |
|-------|-------|
| Pack-level default scoring as dynamic inheritance | B |
| Sparse override storage / normalize-on-save | B |
| Uniform mode as persisted pack mode / override clearing | B |
| Inherited vs Custom authoring badges | B |
| Editing sessions, dirty state, unload guards | C |
| Concurrent pack edit conflict UX | C |
| Sticky header, outline navigation, search, virtualization | D |
| Builder UX modernization generally | D |
| Authored vs Resolved **pack** export modes for interchange | E |
| Import mode inference / CSV↔JSON authoring contract redesign | E |
| Pack duplicate / version clone lifecycle | E |
| Enterprise libraries / org-level scales | F |
| Changing clinical competency band thresholds as a product redesign | Later (unless required only to consume Effective Scoring) |
| Assessment-specific renderers (VB-MAPP/PEAK-specific Builders) | Never (canonical rejection) |

Phase A may **expose** Effective Scoring in a way that later phases extend (inheritance), but Phase A acceptance does not require Builder behaviour changes.

---

# 13. Risks

## 13.1 Migration risks

| Risk | Description |
|------|-------------|
| Latent named-scale packs | JSON-imported packs with `scoring_scales` may **change** display/analytics once surfaces stop ignoring catalog resolution |
| Dense Alpha packs | Mostly stable, but surfaces that used divergent fallbacks will converge—exports may change |
| Historical assessments | Must remain keyed to their frozen snapshot; re-resolution must not pull live pack edits (G8) |

## 13.2 Behavioural risks

| Risk | Description |
|------|-------------|
| Visible number changes | Domain % or export max may change where Analytics/Export previously disagreed with Matrix |
| Checkbox fallback convergence | Unspecified checkbox items may shift max if export/UI previously disagreed |
| “No change” false confidence | Packs that look fine in Matrix may still drift in Snapshot/Export until Phase A is complete |

## 13.3 Regression risks

| Risk | Description |
|------|-------------|
| Partial adoption | If only some surfaces move to Effective Scoring, disagreement becomes subtler and harder to detect |
| Interpretation layer dual-read | Score Interpretation updated in place but still peeking at authored fields creates false green tests |
| Print/Snapshot chrome | Visual QA may pass layout while scoring meaning remains wrong |

## 13.4 Clinical risks

| Risk | Description |
|------|-------------|
| Care decisions on inconsistent maxima | Highest pre-Phase-A risk; Phase A exists to remove it |
| Mid-cycle meaning shift | If release notes do not explain intentional convergence, clinicians may distrust the product |
| Snapshot vs Matrix mismatch during rollout | Temporary split during partial deploy is clinically unacceptable—Phase A should ship as a consistency unit |

---

# 14. Rollout Product Rule

Phase A is a **consistency unit**.

Product rule:

> Do not release a partial Phase A in production where Matrix uses Effective Scoring but Snapshot, Analytics, or Exports still use authored-inline definitions for the same assessment.

If incremental delivery is required internally, production exposure requires G1–G8 for all clinician-facing surfaces in §8.

---

# 15. Relationship to Later Phases

```text
Phase A  Effective Scoring authority everywhere
    │
    ▼
Phase B  Extend resolution with pack default inheritance + sparse overrides + Uniform mode
    │      (Effective Scoring concept unchanged; resolution rules expand)
    ▼
Phase C+ Sessions, editor UX, interchange, enterprise
```

Phase A is successful when later phases can change **how** Effective Scoring is produced (inheritance) without revisiting **which** surfaces consume it.

---

# 16. Closing Contract Statement

**Phase A product contract:**

1. Authored Scoring is storage.
2. Effective Scoring is runtime truth.
3. Resolved Scoring means Effective Scoring in Phase A.
4. Every runtime consumer uses Effective Scoring for scoring-definition needs.
5. Score Interpretation and aggregations depend on Effective Scoring + Recorded Scores only.
6. No runtime consumer implements independent scoring-definition logic.
7. Matrix, validation, Snapshot, Learner Map, Reports, Analytics, Domain Profiles, and result Exports must agree for the same pack snapshot and scores.
8. An assessment always resolves Effective Scoring from its own frozen `pack_snapshot`; live pack edits never alter historical assessment scoring interpretation (G8).
9. Builder inheritance, Uniform mode, sparse storage, sessions, and editor UX are out of scope until later phases.

This document is the implementation contract for Builder, QA, and Overseer for Phase A.
