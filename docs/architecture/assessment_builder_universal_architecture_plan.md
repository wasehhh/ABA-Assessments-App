# Assessment Builder Universal Architecture Plan

| Field | Value |
|-------|--------|
| **Document type** | Architecture implementation plan (Overseer) |
| **Milestone** | PR12.0 |
| **Status** | Planning only — no implementation authorized by this document |
| **Related** | [`assessment_snapshot_design_manifesto.md`](./assessment_snapshot_design_manifesto.md) · [`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) · [`database_schema.md`](./database_schema.md) · [`../product/assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) |
| **Audience** | SPM, Builder, QA, Documentation |

This plan defines the **smallest meaningful expansion** of the Evalis Assessment Builder from a flat Alpha-level model into a **universal, assessment-agnostic** pack architecture.

It does **not** authorize code, migrations, or UI work.

---

## 1. Executive Summary

Evalis today stores assessment structure as JSONB:

```text
Assessment
  pack_snapshot.domains[]
    targets[]
      scoring { type, scale?, scale_labels, … }
```

Scores are stored relationally as `(assessment_id, cycle_id, domain_id, target_id, score)`.

This is sufficient for Alpha and ABLLS-style workflows. It is **not** sufficient for VB-MAPP (Level → Domain → Milestone), ESDM (Age Band → Domain → Item), PEAK (Module → Program), or large flat custom uploads without either:

- collapsing hierarchy into primary groups only, or  
- inventing assessment-specific renderers (rejected).

**Recommendation:** Expand `ContentPackData` **additively inside JSONB**. Do **not** introduce new relational tables for groups or scales in PR12.

### Minimal expansion (six capabilities)

| # | Capability | Approach |
|---|------------|----------|
| 1 | Optional secondary grouping | Optional fields on targets + optional domain-level group catalog |
| 2 | Configurable structural labels | Optional `structure_labels` on pack |
| 3 | Reusable scoring scales | Optional `scoring_scales[]` on pack; targets reference by id |
| 4 | Target-level scoring overrides | Existing per-target `scoring` remains authoritative; may override pack scale |
| 5 | Non-numeric display labels | Use existing `scale_labels`; wire through interpretation and Matrix UI |
| 6 | Oversized group warnings | Builder/import validation only — never force structure |

### Key principle

**Preserve Alpha stability.**

- Existing flat packs remain valid without migration.  
- Secondary grouping is **optional**.  
- No assessment-specific renderers.  
- No tertiary grouping in PR12.  
- Relational score rows stay `(domain_id, target_id)` — secondary group is pack structure, not a score key.

---

## 2. Current Builder Architecture

### 2.1 Data model (TypeScript)

Primary definitions live in `frontend/src/types/index.ts`:

| Type | Role |
|------|------|
| `ContentPackData` | Pack document: `pack_id`, `title`, `version`, `domains[]` |
| `Domain` | Primary group: `domain_id`, `title`, optional `description`, `targets[]` |
| `Target` | Item: `target_id`, `title`, criteria fields, `scoring` |
| `Target.scoring` | `type` (`numeric` \| `checkbox` \| `yesno` \| `text`), optional `scale`, `scale_labels`, optional `task_steps`, `no_opportunity_allowed` |
| `ContentPack` | DB row: `pack_data` JSONB |
| `Assessment` | DB row: `pack_snapshot` JSONB (frozen pack at assessment create) |
| `AssessmentScore` | Relational score: `domain_id`, `target_id`, `score`, cycle linkage |

### 2.2 Key files

| Path | Role |
|------|------|
| `frontend/src/types/index.ts` | Canonical pack/score types |
| `frontend/src/components/AssessmentBuilder.tsx` | Manual pack builder UI |
| `frontend/src/pages/ContentPacks.tsx` | Pack list / upload entry |
| `frontend/src/services/packs.ts` | Pack CRUD + CSV parse (`parseContentPackCsv`) |
| `frontend/src/services/assessments.ts` | Assessment create freezes `pack_snapshot`; seeds score rows |
| `frontend/src/utils/scoreInterpretation.ts` | Layer 0 score interpretation |
| `frontend/src/components/assessment/TargetScoreControls.tsx` | Matrix score buttons |
| `frontend/src/pages/AssessmentMatrix.tsx` | Domain navigation + scoring surface |
| `frontend/src/services/domainProfile.ts` | Layer 1 domain profiles |
| `frontend/src/services/learnerMapProfile.ts` | Longitudinal profile |
| `frontend/src/services/assessmentSnapshotProfile.ts` | Snapshot evidence profile (wraps Learner Map) |
| `frontend/src/services/reportProfile.ts` | Report composition |
| `docs/architecture/database_schema.md` | `content_packs.pack_data`, `assessments.pack_snapshot` JSONB |

### 2.3 Pack flow

```text
Builder UI / CSV upload
        │
        ▼
content_packs.pack_data  (JSONB ContentPackData)
        │
        │  assessmentService.create(packSnapshot)
        ▼
assessments.pack_snapshot  (frozen copy)
        │
        ├── assessment_scores rows (domain_id + target_id)
        ├── Matrix / Domain Profile / Landscape
        ├── Learner Map / Snapshot / Report
        └── Exports
```

### 2.4 Current gaps

| Gap | Today |
|-----|--------|
| Secondary grouping | None — only `domains[]` |
| Structural labels | Hard-coded “Domain” / “Target” in UI copy |
| Reusable scales | Builder has a **session-local** default scale + optional global labels injected at save; not a named pack-level catalog |
| Target overrides | Per-target `scoring` exists, but no shared scale reference |
| Non-numeric labels | `scale_labels` stored but **not used** in `interpretTargetScore` or Matrix buttons (numeric digits / Yes-No only) |
| Oversized groups | No warning; Snapshot manifesto expects Builder guidance later |
| CSV import | Always forces `numeric` `0–4`; ignores scoring columns |

### 2.5 What already works well

- JSONB pack documents allow additive fields without DB migrations.  
- Frozen `pack_snapshot` isolates in-flight assessments from pack edits.  
- Layer 0 (`scoreInterpretation`) is scale-aware for max / competency bands.  
- Flat `domain.targets` iteration is universal across Matrix, profiles, and exports.  
- Scores do not embed pack hierarchy beyond `domain_id` + `target_id`.

---

## 3. Proposed Minimal Data Model Expansion

All expansions are **optional fields** on `ContentPackData` / `Domain` / `Target`. Absent fields mean “Alpha flat pack.”

### 3.1 Conceptual hierarchy

```text
Pack
  structure_labels?          # how UI names levels
  scoring_scales?[]          # reusable named scales
  domains[]                  # primary groups (always)
    secondary_groups?[]      # optional catalog (order + titles)
    targets[]                # always present (flat list)
      secondary_group_id?    # optional membership
      scoring
        scale_id?            # optional reference to pack scale
        …existing fields…    # override or inline definition
```

### 3.2 Why targets stay flat under domains

**Recommended:** keep `domain.targets[]` as the **only target list**.

Secondary grouping is expressed as **optional membership metadata on targets**, not a second nested target array.

| Approach | Verdict |
|----------|---------|
| Nested `domain.secondary_groups[].targets[]` | Rejected for PR12 — breaks every `domain.targets` consumer; dual-list ambiguity |
| New relational tables for groups | Rejected for PR12 — overbuild; pack is already JSONB |
| **Target metadata (`secondary_group_id`)** | **Accepted** — additive; existing loops unchanged |

**Invariant:** Every consumer that does:

```text
for domain in domains:
  for target in domain.targets:
```

continues to work for flat and nested packs.

Secondary-aware surfaces **optionally** group targets by `secondary_group_id` for display/navigation only.

### 3.3 Proposed TypeScript shapes (illustrative)

```typescript
interface StructureLabels {
  primary_group: string;   // e.g. "Domain", "Level", "Module", "Age Band"
  secondary_group?: string; // e.g. "Domain", "Program", "Skill Area"
  target: string;          // e.g. "Target", "Milestone", "Item", "Program"
}

interface ScoringScaleDefinition {
  scale_id: string;
  title: string;
  type: ScoringType;                 // numeric | yesno | checkbox | text
  scale?: number[];                  // for numeric
  scale_labels?: Record<number, string>;
  task_steps?: string[];             // for checkbox / task analysis
  no_opportunity_allowed?: boolean;
}

interface SecondaryGroupCatalogEntry {
  secondary_group_id: string;
  title: string;
  description?: string;
}

interface Domain {
  domain_id: string;
  title: string;
  description?: string;
  /** Optional explicit order/titles for secondary groups in this primary group. */
  secondary_groups?: SecondaryGroupCatalogEntry[];
  targets: Target[];
}

interface Target {
  target_id: string;
  title: string;
  // …existing fields…
  /** Optional secondary group membership within parent domain. */
  secondary_group_id?: string;
  scoring: {
    type: ScoringType;
    /** Optional reference into ContentPackData.scoring_scales */
    scale_id?: string;
    scale?: number[];
    scale_labels?: Record<number, string>;
    task_steps?: string[];
    no_opportunity_allowed: boolean;
  };
}

interface ContentPackData {
  pack_id: string;
  org_id: string;
  title: string;
  description: string;
  version: string;
  structure_labels?: StructureLabels;
  scoring_scales?: ScoringScaleDefinition[];
  domains: Domain[];
}
```

### 3.4 Resolution rules

| Rule | Definition |
|------|------------|
| **Flat pack** | No `secondary_group_id` on any target; `secondary_groups` absent |
| **Secondary membership** | Target with `secondary_group_id` belongs to that subgroup within its domain |
| **Catalog optional** | If `domain.secondary_groups` is present, it defines order and titles; otherwise derive order from first appearance of each `secondary_group_id` in `targets[]` |
| **Orphan secondary id** | Target references unknown id → treat as unlabeled secondary section or fall back to “Ungrouped” display section (never drop target) |
| **Ungrouped targets** | Targets without `secondary_group_id` in a mixed domain appear in an “Ungrouped” display section **after** catalogued groups (or before — pick one and document; recommend **after**) |
| **Scale resolution** | See §8 |

---

## 4. Database / Schema Implications

### 4.1 No required relational migration for PR12

| Table / column | Change |
|----------------|--------|
| `content_packs.pack_data` | None — JSONB accepts new keys |
| `assessments.pack_snapshot` | None — frozen JSONB accepts new keys on **new** assessments |
| `assessment_scores` | **None** — continue `domain_id` + `target_id` |
| New tables | **None** in PR12 |

### 4.2 Why scores do not need `secondary_group_id`

Secondary group is **pack structure**, not a scoring identity. Score identity remains:

```text
(assessment_id, assessment_cycle_id, target_id)
```

`domain_id` remains denormalized for query convenience and RLS patterns. Secondary group can always be resolved from `pack_snapshot` via `target_id`.

Adding `secondary_group_id` to `assessment_scores` is **deferred** (optional future denormalization only if query performance requires it).

### 4.3 Existing assessments

Assessments created before PR12 keep flat `pack_snapshot` documents. Readers must treat missing optional fields as defaults:

| Missing field | Default |
|---------------|---------|
| `structure_labels` | `{ primary_group: "Domain", target: "Target" }` |
| `scoring_scales` | `[]` |
| `secondary_group_id` | absent → no secondary grouping |
| `scoring.scale_id` | resolve inline `scoring` only |

### 4.4 Documentation updates (when implementing)

- `docs/architecture/database_schema.md` — document optional JSONB keys  
- Pack format / CSV template docs  
- Snapshot manifesto already anticipates authored secondary groups vs presentation Parts

---

## 5. Import / Upload Implications

### 5.1 CSV (primary Alpha import)

**Current required columns:** `domain_id`, `domain_title`, `target_id`, `title`, `success_criteria`

**Additive optional columns (PR12.2):**

| Column | Purpose |
|--------|---------|
| `secondary_group_id` | Optional subgroup id |
| `secondary_group_title` | Title on first row of that subgroup |
| `primary_group_label` | Pack-level or first-row structure label (optional; prefer pack metadata UI) |
| `secondary_group_label` | Pack-level label for secondary tier |
| `target_label` | Pack-level label for target tier |
| `scoring_type` | `numeric` \| `yesno` \| `checkbox` \| `text` |
| `scale` | e.g. `0,1,2,3,4` |
| `scale_id` | Reference to a named scale (if scales defined in JSON upload) |
| `scale_labels` | Encoded labels (see below) |

**Label encoding (CSV-friendly):** prefer simple form:

```text
0:Not Yet|1:Emerging|2:Mastered
```

Parser writes `scale_labels: { 0: "Not Yet", 1: "Emerging", 2: "Mastered" }`.

**Backward compatibility:** CSV without new columns behaves exactly as today (numeric 0–4). **Fix opportunity:** today CSV always forces numeric 0–4 even when Builder supports more — PR12.2 should honor optional scoring columns when present, without changing default.

### 5.2 JSON upload

If JSON packs are accepted (Builder save / future import), accept full `ContentPackData` including optional fields. Validate:

- Unique `target_id` across pack  
- Unique `domain_id`  
- Unique `scale_id` within `scoring_scales`  
- `secondary_group_id` references catalog when catalog present  
- `scoring.scale_id` references known scale when set  

### 5.3 Oversized group warnings (import + Builder)

Emit **non-blocking** warnings when:

| Condition | Warning |
|-----------|---------|
| Primary group target count ≥ 80 | Large group may reduce export readability |
| Primary group target count ≥ 120 | Extreme group — consider secondary grouping |
| Secondary group target count ≥ 80 | Same guidance at secondary tier |

Warnings must **not** block save/upload. Align copy with Snapshot manifesto §5.10.

---

## 6. UI Implications

### 6.1 Assessment Builder

| Area | Change |
|------|--------|
| Pack settings | Optional structure labels (primary / secondary / target) |
| Pack settings | Optional scoring scale library (create/edit named scales) |
| Domain editor | Optional secondary group catalog (id + title list) |
| Target editor | Optional secondary group assignment (select or create) |
| Target scoring | Select pack scale **or** custom override |
| Target scoring | Edit `scale_labels` for display |
| Validation panel | Oversized group warnings |

Flat Alpha UX remains default: hide secondary grouping until user enables “Use secondary groups” or adds a secondary group.

### 6.2 Content Packs page

- Show structure summary: e.g. “12 domains · secondary groups · 3 scales”  
- Preserve upload CSV path with extended template download  

### 6.3 Matrix

See §8 impact section and architecture Q8 below.

### 6.4 No assessment-specific UIs

Labels come from `structure_labels`. Navigation uses primary → optional secondary → targets. No VB-MAPP / PEAK special cases.

---

## 7. Scoring Scale Architecture

### 7.1 Goals

- Define a scale once; reuse across many targets.  
- Allow per-target override without forking interpretation logic.  
- Support display labels for non-numeric presentation while storing **numeric** scores.

### 7.2 Storage

Scores remain `assessment_scores.score: number | null`.

Display labels never replace stored values. Mapping is always:

```text
stored number  ↔  scale_labels[number]  (optional)
```

### 7.3 Resolution algorithm

Given `target` and pack `scoring_scales`:

1. Start with `target.scoring` as base.  
2. If `target.scoring.scale_id` is set and found in `scoring_scales`:  
   - Merge scale definition as defaults.  
   - Target-inline fields **override** scale definition field-by-field (`type`, `scale`, `scale_labels`, `task_steps`, `no_opportunity_allowed`).  
3. If `scale_id` missing or unknown: use inline `target.scoring` only (Alpha behavior).  
4. Pass **resolved scoring view** into `interpretTargetScore` / Matrix controls.

Implement as a pure helper, e.g. `resolveTargetScoring(target, pack): ResolvedTargetScoring`, used by Layer 0 and UI — **do not** mutate pack data at read time.

### 7.4 Non-numeric labels

| Surface | Behavior |
|---------|----------|
| Matrix buttons | Show `scale_labels[value]` when present; else numeric digit / Yes-No |
| `displayScore` | Prefer label when present for human-facing single-value display |
| `displayScoreWithMax` | Prefer `Label` or `Label (n/max)` policy — **recommend:** show `label` when labeled, with numeric tooltip; or `n/max` in evidence surfaces for auditability |
| Snapshot / Learner Map evidence | **Default evidence surfaces keep numeric `n/max`** for audit density; labels available via tooltip / aria |
| Competency bands | Still derived from numeric value + max (Layer 0) — labels do not redefine bands |

**Important:** Labels are **display**, not a second scoring system. Invalid to store label strings in `assessment_scores.score`.

### 7.5 Yes/No and checkbox

- `yesno`: labels may override button text (default No/Yes).  
- `checkbox`: continue `task_steps`; optional labels for step counts if needed later (out of PR12 minimum).

---

## 8. Target-Level Override Architecture

| Override | Mechanism |
|----------|-----------|
| Different scale than pack default | Target `scoring.scale_id` points to alternate scale, or inline `scale` |
| Custom labels on one target | Target `scoring.scale_labels` overrides scale definition labels |
| Different type | Target `scoring.type` overrides (rare; allow) |
| No shared scale | Omit `scale_id`; fully inline (Alpha) |

**Authority order (highest wins):**

1. Target inline field explicitly set  
2. Referenced `scoring_scales` entry  
3. System defaults (`[0,1,2,3,4]`, empty labels)

Builder UI should make “Using pack scale X” vs “Custom override” visible to authors.

---

## 9. Secondary Grouping Architecture

### 9.1 Answers to architecture questions

**Where should optional secondary grouping live?**  
In pack JSONB, as optional target membership (`secondary_group_id`) plus optional domain-level catalog (`domain.secondary_groups`).

**Subdomain field vs new table vs metadata on targets?**  
**Metadata on targets** (+ optional catalog). Not a new table. Not a required nested target list.

**Configurable labels?**  
`ContentPackData.structure_labels`:

| Field | Examples |
|-------|----------|
| `primary_group` | Domain, Level, Module, Age Band, Protocol |
| `secondary_group` | Domain, Program, Skill Area, Subdomain |
| `target` | Target, Milestone, Item, Program |

UI strings use these labels; code uses neutral terms (`domain`, `secondary_group`, `target`).

### 9.2 Framework mapping (no special renderers)

| Framework | Primary (`domains[]`) | Secondary (`secondary_group_id`) | Target |
|-----------|----------------------|----------------------------------|--------|
| ABLLS / AFLS (typical) | Domain / Skill area | — | Target |
| VB-MAPP | Level | Domain | Milestone |
| ESDM | Age Band | Domain | Item |
| PEAK | Module | Program area | Program / item |
| Custom | Clinic-defined | Optional | Clinic-defined |

### 9.3 Display grouping helper

Introduce a pure helper used by Matrix, Snapshot, and optionally Learner Map:

```text
groupTargetsForDisplay(domain) →
  [{ secondary_group_id?, title, targets[] }, ...]
```

- Preserves target order within each secondary group.  
- Preserves secondary group order from catalog or first-seen order.  
- Flat domains return a single section with all targets (no secondary header).

### 9.4 Presentation factoring vs authored secondary groups

| Kind | Source | Label style |
|------|--------|-------------|
| Authored secondary group | Pack data | Pack titles / `structure_labels.secondary_group` |
| Presentation Part | Snapshot layout only | Neutral `Part N · Targets X–Y` |

Snapshot must **never** write presentation Parts into pack data. Builder secondary groups **reduce** need for presentation factoring but do not replace it for extreme flat groups.

---

## 10. Backward Compatibility Plan

| Scenario | Behavior |
|----------|----------|
| Existing `content_packs` rows | Load as-is; optional fields undefined |
| Existing `pack_snapshot` on live assessments | Unchanged; readers use defaults |
| Existing scores | Unchanged |
| Existing Matrix / LM / Snapshot code paths | Continue iterating `domain.targets` |
| New packs with secondary groups | Old code that ignores secondary metadata still scores correctly |
| New packs with `scale_id` | Must use resolution helper; until PR12.1 ships, Builder should still write resolved inline `scale` / `scale_labels` onto targets at save time for safety |

**Save-time denormalization (recommended for Alpha safety):**

When saving a pack, Builder may **materialize** resolved `scale` and `scale_labels` onto each target even when `scale_id` is set. That way older readers that only understand inline scoring remain correct.

`scale_id` remains for authoring/edit UX and future updates to shared scales (with explicit “update linked targets” action — post-PR12 if needed).

---

## 11. Impact on Learner Map

| Area | Impact |
|------|--------|
| `buildLearnerMapProfile` | **Minimal** — continue flat `domain.targets`; secondary metadata can be ignored in V1 LM |
| L1 Domain Competency Summary | Unchanged (primary group rollup) |
| L2 / appendix | Optional secondary headers inside domain appendix (PR12.4) — not required for correctness |
| Movement / coverage | Unchanged |
| Export modes | Unchanged |

**Can remain unchanged initially:** Learner Map may treat secondary groups as invisible. Primary domain remains the supervision unit.

**Optional enhancement (PR12.4):** appendix sections show secondary group headers using `structure_labels.secondary_group`.

---

## 12. Impact on Assessment Snapshot

| Area | Impact |
|------|--------|
| `AssessmentSnapshotProfile` | Pass through domains/targets; optional secondary metadata |
| Domain Zones | Primary group = zone |
| Authored secondary groups | Nest strips under secondary headers **when present** |
| Presentation factoring | Still applies to oversized primary **or** secondary groups |
| Evidence marks / scores | Unchanged (Layer 0) |
| Structure labels | Zone titles use pack titles; UI chrome uses `structure_labels` |

Snapshot benefits most from authored secondary grouping (PEAK modules, VB-MAPP levels). Implementation should use `groupTargetsForDisplay` and must not invent clinical subgroups.

---

## 13. Impact on Reports / Exports

| Surface | Impact |
|---------|--------|
| Assessment Data Report / `reportProfile` | Primary domain sections unchanged; optional secondary subheads |
| Learner Map export | Same as LM impact |
| Snapshot HTML/print | Secondary headers + factoring |
| CSV score export (if any) | Keep `domain_id`, `target_id`; optional `secondary_group_id` column later |

No report should require secondary grouping to render.

---

## 14. Migration Strategy

### 14.1 Data migration

**None required** for existing rows.

### 14.2 Code migration

1. Extend types with optional fields.  
2. Add resolvers/helpers with defaults for missing fields.  
3. Update Builder/import to write new fields.  
4. Update Matrix navigation/display.  
5. Update Snapshot (and optionally LM/Report) to display secondary groups.  
6. Wire `scale_labels` into interpretation/UI.  
7. Add oversized-group warnings.

### 14.3 Dual-write safety

During PR12.1–12.2, Builder save should:

- Write `scale_id` when using library scales **and**  
- Materialize inline `scale` / `scale_labels` / `type` on each target  

This protects in-flight code paths not yet using `resolveTargetScoring`.

### 14.4 Assessment freeze semantics

Changing a content pack **never** mutates existing `pack_snapshot`. Secondary groups and scales appear only on assessments created after pack update (existing behavior).

---

## 15. Implementation Phases

### PR12.1 — Data model + type foundation

- Extend `ContentPackData`, `Domain`, `Target` types  
- Add `StructureLabels`, `ScoringScaleDefinition`, catalog types  
- Implement `resolveTargetScoring(target, pack)`  
- Implement `groupTargetsForDisplay(domain)`  
- Implement default label helpers  
- Unit tests for resolution, flat packs, mixed secondary membership, orphan ids  
- **No UI required** beyond types/helpers

### PR12.2 — Builder / import support

- Builder: structure labels, scale library, secondary group assignment  
- Save-time materialization of inline scoring from `scale_id`  
- CSV: optional secondary + scoring columns; extended template  
- Oversized group warnings (non-blocking)  
- Pack validation tests  

### PR12.3 — Matrix rendering support

- Domain list uses `structure_labels.primary_group`  
- Within-domain navigation/sections for secondary groups when present  
- `TargetScoreControls` shows `scale_labels` when present  
- Score interpretation uses resolved scoring  
- Regression: flat packs identical to Alpha behavior  

### PR12.4 — Learner Map / Snapshot / Report compatibility

- Snapshot: authored secondary headers inside Domain Zones  
- Learner Map appendix: optional secondary headers (minimal)  
- Report: optional secondary subheads  
- Confirm presentation factoring still treats authored secondary groups correctly (factor within secondary or primary per Snapshot rules)  
- No movement/summary changes  

### PR12.5 — QA + migration hardening

- Fixtures: ABLLS-flat, VB-MAPP-like, PEAK-like module, 250-target flat custom  
- Golden tests: profile builds, Matrix score entry, exports  
- Docs: pack format, CSV template, Builder author guide  
- Verify existing Alpha assessments untouched  

### Phase adjustments

| If needed | Adjustment |
|-----------|------------|
| Labels-only needed sooner | Split PR12.2 labels before secondary UI |
| Snapshot not ready | Ship PR12.1–12.3; defer PR12.4 Snapshot portion |
| Scale labels block Matrix | Keep numeric buttons; labels as `title` tooltips first |

---

## 16. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Nested target arrays break consumers | High | **Do not nest targets**; metadata-only secondary grouping |
| `scale_id` without materialization breaks old readers | High | Save-time inline materialization |
| Secondary groups mistaken for Snapshot presentation Parts | Medium | Distinct label grammar; docs |
| CSV complexity | Medium | All new columns optional; defaults preserve Alpha |
| Matrix UX clutter for flat packs | Medium | Progressive disclosure — secondary UI only when used |
| Overbuilding tertiary hierarchy | Medium | Explicit non-goal for PR12 |
| Competency bands vs custom labels confusion | Medium | Bands stay numeric Layer 0; labels are display-only |
| Large PEAK module still hard to navigate | Low | Warnings + Snapshot factoring; secondary groups help when authored |

---

## 17. Architecture Question Answers (Summary)

| # | Question | Answer |
|---|----------|--------|
| 1 | Where does secondary grouping live? | Pack JSONB: target `secondary_group_id` + optional `domain.secondary_groups` catalog |
| 2 | Field vs table vs metadata? | **Metadata on targets** (not new tables, not nested target arrays) |
| 3 | Configurable labels? | `ContentPackData.structure_labels` (`primary_group`, `secondary_group`, `target`) |
| 4 | Reusable scales? | `ContentPackData.scoring_scales[]`; targets reference `scoring.scale_id` |
| 5 | Target overrides? | Inline `target.scoring` fields override referenced scale; materialize on save |
| 6 | Non-numeric labels? | `scale_labels: Record<number,string>`; store numeric scores; display labels in UI |
| 7 | Oversized warnings? | Non-blocking Builder/import warnings at ~80 / ~120 targets |
| 8 | Matrix changes? | Labels, secondary sections, labeled score controls; flat path unchanged |
| 9 | Learner Map changes? | None required for correctness; optional appendix headers |
| 10 | Snapshot changes? | Nest authored secondary groups; keep presentation factoring separate |
| 11 | Unchanged for now? | DB schema, score row shape, Layer 0 band logic, LM L1, assessment freeze model, tertiary grouping |

---

## 18. Final Recommendation

**Proceed with PR12 as an additive JSONB pack expansion.**

Do:

- Keep `domains[].targets[]` as the universal target list  
- Add optional secondary membership + labels + scale library  
- Materialize scoring onto targets at save for Alpha safety  
- Teach Matrix and Snapshot to *display* secondary structure  
- Warn on oversized groups without forcing structure  

Do not:

- Add relational group/scale tables in PR12  
- Nest targets under secondary groups in a way that breaks flat iteration  
- Require secondary grouping  
- Build assessment-specific renderers  
- Implement tertiary grouping  
- Migrate existing assessments  

This is the smallest expansion that unlocks VB-MAPP / ESDM / PEAK-like authorship while preserving Alpha flat packs and the current scoring pipeline.

**Suggested first build:** **PR12.1** (types + resolvers + tests) immediately after SPM approval of this plan.

---

_Assessment Builder Universal Architecture Plan — PR12.0 Overseer. Read-only planning deliverable; no code or schema changes._
