# Assessment Snapshot Architecture Review

| Field | Value |
|-------|--------|
| **Document type** | Architecture review (Overseer) |
| **Feature** | Assessment Snapshot V1 |
| **Milestone** | PR11.0A |
| **Primary source** | [`assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) |
| **Related** | Learner Map (`learnerMapProfile.ts`, export stack), Assessment Landscape, Assessment Data Report |
| **Status** | Review complete — SPM input for PR11.1 |
| **Reviewer role** | Overseer (product / UX / clinical / software / IA) |

---

## 1. Executive Summary

Assessment Snapshot addresses a **real and distinct clinical gap**: clinicians still maintain **dense, target-level, multi-cycle score matrices** outside Evalis (ABLLS grids, VB-MAPP sheets, AFLS trackers, PEAK matrices, Excel). Learner Map deliberately **does not** optimize for that job — its default export is supervision-first (L0 + L1), and its L2 appendix is segmented, interpreted, and movement-annotated.

**Verdict:** The **product direction is sound**. Snapshot should exist as a **separate artifact** from Learner Map, optimized for **raw longitudinal evidence density**, eventually delivered as **standalone HTML** with browser print as the near-term PDF path.

**However, the proposed architecture is not ready to implement verbatim.** Several assumptions need correction before PR11.1:

1. **Layer naming conflict** — Calling Snapshot “Layer 2A” collides with the frozen **Assessment Landscape** (already Layer 2A in product vocabulary). Snapshot is an **export/evidence artifact track**, not a replacement Layer 2 in-app surface.
2. **Learner Map overlap risk** — Full / Selected Domains Learner Map appendix is also a target × cycle matrix. Without **hard semantic and orientation boundaries**, clinicians will not reliably distinguish “Snapshot” from “Learner Map with appendix.”
3. **Pack structure gap** — VB-MAPP / PEAK / ESDM secondary grouping is **not** in `ContentPackData` today. V1 prototype on flat `domains[]` is acceptable; claiming universal framework support before PR11.5 is premature.
4. **Report replacement framing** — Snapshot + Learner Map replace **different parts** of legacy report value. Snapshot is longitudinal grid; Assessment Data Report is primarily **single-cycle formal record**. Demotion of the report should be staged, not implied as automatic.

**Final recommendation:** **APPROVE WITH ADJUSTMENTS** (see §8).

---

## 2. Architecture Assessment

### 2.1 Product positioning — Snapshot vs Learner Map

| Dimension | Assessment Snapshot (proposed) | Learner Map (shipped) | Sufficiently different? |
|-----------|-------------------------------|------------------------|-------------------------|
| Primary question | What are the scores across targets and cycles? | What does competency look like; where did it change? | **Yes — if enforced** |
| Default deliverable | Full assessment grid | L1 domain summary (Standard export) | **Yes** |
| Interpretation | None (raw evidence) | Rollups, distribution, movement % | **Yes** |
| Movement | Excluded per spec | Central (L1 + appendix markers) | **Yes — must stay excluded** |
| Density | Maximum | Structured, card-framed | **Yes** |
| Orientation | Targets × cycles (grid mental model) | Cycles × targets in L2 appendix | **Partially — use deliberately** |
| In-app vs export | Export-first artifact | In-app + print export | **Yes** |
| HTML standalone | Primary long-term format | Browser print PDF | **Yes** |

**Could clinicians clearly understand the split?**

- **In theory, yes** — if product copy and entry points are disciplined:
  - *“Snapshot — raw score grid across all cycles”*
  - *“Learner Map — supervision summary and competency record”*
- **In practice, risk is high** unless:
  - Learner Map **never** markets appendix export as “grid replacement”
  - Snapshot **never** adds summaries, movement, or coverage
  - Snapshot uses **traditional grid orientation** (targets as rows, cycles as columns) while Learner Map appendix keeps **cycles-as-rows** (already approved for vertical compactness in supervision appendix)

**Overlap to monitor:**

| Overlap area | Severity | Mitigation |
|--------------|----------|------------|
| Learner Map Full appendix | **High** | Position Full LM as “supervision record + evidence appendix,” not grid replacement; Snapshot as default grid artifact |
| Competency band colors | Medium | Shared Layer 0 semantics OK; Snapshot legend minimal, no band analytics |
| Shared `LearnerMapProfile` cells | Medium | Share normalization; separate view model / presentation contract |
| Assessment Data Report target lists | Medium | Report remains single-cycle; Snapshot is multi-cycle — different jobs |

**Challenge to spec:** The statement *“Assessment Snapshot is Layer 2A”* should be **removed or renamed**. Layer 2A is **Assessment Landscape** (frozen v1). Snapshot belongs to a **parallel export artifact family** (evidence layer), not the in-app Layer 2 map.

---

### 2.2 Information architecture — element classification

| Element | Classification | Rationale |
|---------|----------------|-----------|
| **Learner name** | **REQUIRED** | Artifact identity for clinical filing |
| **Organization name** | **REQUIRED** (org policy) | Context for multi-site clinics |
| **Assessment name / id** | **REQUIRED** | Distinguishes assessments for same learner |
| **Assessment pack name + version** | **REQUIRED** | Framework context without publisher layout |
| **Generated timestamp** | **REQUIRED** | Export provenance |
| **Clinical disclaimer (minimal)** | **REQUIRED** | Raw evidence ≠ diagnosis/treatment; short, not Learner Map prose |
| **Cycle numbers** | **REQUIRED** | Column/row headers for longitudinal grid |
| **Cycle dates** | **OPTIONAL** (show when available) | ABLLS/VB-MAPP users often date administrations; `start_date` exists on `AssessmentCycle` |
| **Cycle status** | **OPTIONAL** | Useful in-app; may clutter print — omit from dense export default |
| **Primary groups (domains)** | **REQUIRED** | Structural spine of all frameworks |
| **Secondary groups** | **OPTIONAL** (when pack supports) | VB-MAPP Level, PEAK Module — not in schema yet |
| **Configurable group labels** | **OPTIONAL** (future) | “Domain” vs “Level” vs “Module” — PR11.5 |
| **Targets** | **REQUIRED** | Row unit of grid |
| **Target display name** | **REQUIRED** | Clinical identification |
| **Target ID / code** | **OPTIONAL** | Compact column aid; full title must remain discoverable (tooltip, index, or subline) |
| **Exact scores** (`displayScoreWithMax`) | **REQUIRED** | Core evidence |
| **Score labels (non-numeric scales)** | **REQUIRED** | yes/no, labeled scales — via `interpretTargetScore` |
| **Competency state colors** | **REQUIRED** | Fast scan; shared Layer 0 palette |
| **Unscored distinction** | **REQUIRED** | `—` / empty cell — not scored-zero |
| **Minimal band legend** | **REQUIRED** | Decode colors without interpretation copy |
| **All included cycles** | **REQUIRED** (default) | Spec longitudinal intent |
| **Domain / group subtotals** | **SHOULD NOT EXIST** | Analytics — belongs in Learner Map |
| **Coverage %** | **SHOULD NOT EXIST** | Interpretation |
| **Movement markers** | **SHOULD NOT EXIST** | Interpretation — **critical boundary vs Learner Map** |
| **Movement summaries** | **SHOULD NOT EXIST** | Interpretation |
| **Distribution bars** | **SHOULD NOT EXIST** | Learner Map / Landscape |
| **Assessment rollup tiles** | **SHOULD NOT EXIST** | Dashboard noise in grid artifact |
| **Score band reference cards** | **OPTIONAL** | One-line legend preferred over cards for density |
| **Narrative summaries** | **SHOULD NOT EXIST** | Out of scope |
| **Clinical notes** | **SHOULD NOT EXIST** (V1) | Separate appendix track later if ever |
| **Recommendations / AI** | **SHOULD NOT EXIST** | Safety |
| **Trend arrows** | **SHOULD NOT EXIST** | Movement = Learner Map |
| **Points captured** | **SHOULD NOT EXIST** | Operational metric — Landscape / LM |
| **Pagination / segment labels** | **OPTIONAL** | Print aid only; keep minimal |
| **Target index page** | **OPTIONAL** | Full title lookup when headers compressed — valuable at ABLLS scale |

**Header philosophy:** Snapshot header should be **one compact block** (identity + cycles + legend), not Learner Map’s multi-card artifact framing.

---

### 2.3 Longitudinal representation

**Should Snapshot always display every cycle?**

- **Default: yes** — matches ABLLS/AFLS “running grid” practice and spec §6.
- **Exception (future, not V1):** optional **cycle range filter** when assessments accumulate many cycles (e.g. 6+). Clinicians rarely print 10 cycle columns; they still want **all data in file**, but print may need “Cycles 3–6” selection.

**Should there ever be filtering?**

| Filter type | V1 | Future |
|-------------|-----|--------|
| All cycles | **Default** | Default |
| Cycle range | Defer | Optional export setting |
| Single cycle | **Avoid as Snapshot** | That is Report R1 / Matrix view — not Snapshot’s job |
| Domain subset | Defer | Optional “selected groups” mode (mirror LM Selected Domains **only if** clearly labeled as partial grid) |
| Target subset | **No** | Breaks “full assessment evidence” promise |

**Strictly longitudinal?**

**Yes.** Snapshot is inherently multi-cycle. Single-cycle dense view is the **scoreboard / report** problem, not Snapshot.

**How clinicians use publisher tools (information value, not layout):**

| Tool | Longitudinal habit | Snapshot implication |
|------|-------------------|----------------------|
| **ABLLS** | One grid updated over time; often dates in cells | All cycles visible; dates optional in headers |
| **VB-MAPP** | Milestone grid per level; reassessment over months | Secondary grouping + all cycles |
| **AFLS** | Checklist grids by domain | Domain sections + full target rows |
| **PEAK** | Module matrices | Module as primary group when available |

---

### 2.4 Universal assessment architecture

**Can Snapshot support all frameworks without assessment-specific renderers?**

**Yes — architecturally — via `primary group → optional secondary group → target`.**

**Current structural gaps in Evalis:**

| Gap | Impact on Snapshot | Mitigation |
|-----|-------------------|------------|
| `ContentPackData.domains[]` only — no secondary group | VB-MAPP Level, PEAK Module collapse to flat domains | V1: treat each domain as primary group; document limitation |
| No configurable group labels in pack | Headers say “Domain” for all packs | V1: generic “Group” label or pack title inference; PR11.5 |
| No `scale_labels` enforcement in all packs | Non-numeric display inconsistent | Use `interpretTargetScore` — already scale-aware |
| Target overrides (future builder) | Per-target scale may differ within group | Snapshot must read interpretation per target, not per domain |
| Canonical taxonomy (future) | Group ordering may differ from pack order | Respect `pack_snapshot` order in V1 |

**Remaining risk:** Claiming PEAK/VB-MAPP fidelity **before** secondary grouping ships will disappoint clinicians who expect **level/module banding** in the visual structure. Prototype must label itself **“flat domain grouping”** until PR11.5.

---

### 2.5 HTML shareability

**Is standalone HTML the correct primary export format?**

**Yes — with compliance gates.**

| Criterion | HTML standalone | Browser print → PDF |
|-----------|-----------------|---------------------|
| Offline viewing | **Excellent** | Good (saved PDF) |
| No login | **Excellent** (when embedded) | Good |
| Sharing | **Excellent** (file transfer) | Good |
| Density / scrolling | **Excellent** — natural for wide grids | Good with print CSS |
| Preservation of layout | Good if inline CSS | Browser-dependent |
| PHI control | **Risk** — file is portable PHI | Same risk |
| Future portability | Importable, archivable | Standard |

**Recommendation:**

- **HTML = primary artifact** for Snapshot (spec §10 direction is correct).
- **PDF = browser print export** of same HTML (or “Save as PDF”), not a separate engine in V1.
- **Do not enable production HTML sharing** until org PHI policy + user confirmation (mirror Learner Map Full export warnings).

**Challenge:** HTML embeds PHI in plaintext JSON if scores are inlined. Architecture must support **optional de-identification** later; V1 can ship dev-only without sharing.

---

### 2.6 Information density

**Is the balance correct?**

**Directionally yes — bias slightly toward denser than current Learner Map L2 appendix.**

| Concern | Assessment |
|---------|------------|
| Too dense? | Risk at 500+ targets × 4+ cycles — mitigated by domain sectioning + horizontal scroll in HTML; print needs column splitting |
| Too sparse? | Spec correctly rejects cards, narratives, rollups |
| Missing cues? | Need **minimal legend**, **unscored vs zero**, **cycle headers**, **group headers** |
| Too much whitespace? | Learner Map export CSS is wrong reference — Snapshot needs tighter rhythm |
| BCBA immediate comprehension? | **Yes IF** orientation matches paper grids (targets ↓, cycles →) and colors match in-app scoring |

**Specific challenge:** If Snapshot reuses Learner Map appendix compact tables (cycles-as-rows), experienced BCBAs may find it **less familiar** than publisher grids. **Recommend targets-as-rows for Snapshot** even though Learner Map appendix uses the opposite — differentiation plus clinical familiarity.

---

### 2.7 Implementation risk (no time estimates)

**Can Builder construct Snapshot from Learner Map infrastructure?**

| Asset | Reuse | Do not reuse |
|-------|-------|--------------|
| `buildLearnerMapProfile()` / cell normalization | **Yes** — shared evidence data | Movement fields in UI |
| `interpretTargetScore` / `scoreInterpretation.ts` | **Yes** | — |
| `STATE_BUCKET_DISPLAY` / colors | **Yes** | Band analytics components |
| `LearnerMapDomainSection` | **Partial** — matrix primitive only | Appendix segmentation, movement markers, exportLayout=appendixCompact defaults |
| `LearnerMapExportView` | **No** — different document shape | L0, L1, cards, disclaimer length |
| `learnerMapPrint.css` | **No** — copy patterns only | Supervision pagination rules |
| `LearnerMapDisplayContext` | **Yes** — metadata pattern | — |

**Recommended abstraction:**

Introduce a thin **`AssessmentSnapshotProfile`** (or shared **`AssessmentEvidenceProfile`**) composed from the same inputs as `LearnerMapProfile`:

- **Shared:** cycles, groups, targets, cells (score, band, displayScoreWithMax, isUnscored)
- **Snapshot-only view:** strips movement, omits rollup stats
- **Learner Map-only:** adds movement, domain stats, assessment movement summary

Avoid forking score logic. **Do fork presentation** — `AssessmentSnapshotView` is not `LearnerMapView` with CSS changes.

**New components (expected):**

- `AssessmentSnapshotView` — grid-first layout
- `AssessmentSnapshotGroupSection` — primary (and future secondary) group wrapper
- `AssessmentSnapshotGrid` — targets × cycles orientation
- `AssessmentSnapshotCell` — score + color only (no movement glyph)
- `AssessmentSnapshotHeader` — minimal identity block
- HTML export serializer (PR11.4)

**Technical debt risk:**

- Reusing `LearnerMapDomainSection` without forking props will cause **movement leakage** and wrong orientation defaults — create Snapshot-specific grid wrapper early.
- Calling Snapshot “Layer 2A” in code comments will confuse future contributors — use `evidence-export` or `snapshot` namespace.

---

### 2.8 Future compatibility

| Future capability | Snapshot fit |
|-----------------|--------------|
| Optional secondary groups | **Natural** — nested group headers in grid |
| Assessment levels (VB-MAPP) | **Natural** — secondary or primary group |
| Custom scoring labels | **Natural** — via interpretation layer |
| Target-level scale overrides | **Required** — per-target `interpretTargetScore` |
| Canonical taxonomy | **Compatible** if mapping layer maps taxonomy → groups |
| HTML exports | **Primary design target** |
| Report R2 longitudinal embed | **Optional** — embed Snapshot grid as “Evidence Appendix” separate from Learner Map L1 narrative |
| De-identified export | Add field stripping in HTML serializer |
| Landscape in-app | **Orthogonal** — Landscape stays interactive current-cycle map |

---

## 3. Strengths

1. **Clear clinical job** — replaces external grids without publisher cloning.
2. **Correct pairing with Learner Map** — evidence vs interpretation is the right product split.
3. **Assessment-agnostic hierarchy** — primary/secondary/target maps to real frameworks.
4. **HTML-first** — matches density, offline sharing, and Alpha print strategy.
5. **Explicit exclusions** — no movement, no summaries, no AI — protects clinical safety and differentiation.
6. **Dev-first staging** — mirrors successful Learner Map PR pattern.
7. **Shared normalization** — `LearnerMapProfile` proves the cell model works across scales and cycles.
8. **IP-safe framing** — familiar grid mental model without ABLLS page layout.

---

## 4. Weaknesses

1. **Layer 2A label conflicts** with Assessment Landscape nomenclature.
2. **Learner Map Full appendix** is a competing dense matrix — positioning not sharp enough in spec.
3. **Secondary grouping absent** in current pack schema — universal claims ahead of data model.
4. **Report replacement oversimplified** — Snapshot is multi-cycle; current report is single-cycle formal record.
5. **No cycle filter strategy** documented for long histories (future pain).
6. **Target header strategy undefined** — ABLLS-scale needs index or truncated codes + lookup.
7. **PHI / HTML sharing** acknowledged but under-specified for production gate.
8. **Orientation unspecified** in spec — risk of copying Learner Map appendix layout and feeling “wrong” for grid users.

---

## 5. Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Snapshot vs Learner Map user confusion | **High** | Two exports with matrices |
| IP grid-clone appearance | **Medium–High** | Dense numeric cells — mitigate with Evalis palette, no publisher numbering |
| HTML PHI leakage | **High** | Standalone files leave org control |
| Flat domain grouping disappoints VB-MAPP/PEAK users | **Medium** | Until PR11.5 |
| Implementation coupling to Learner Map UI | **Medium** | Wrong reuse → movement bleed, wrong density |
| Report demotion backlash | **Medium** | Some clinics still want single-cycle PDF |
| Print unusable at ABLLS scale | **Medium** | HTML scroll OK; print needs column splits |
| Scope creep (movement, coverage) | **Medium** | Pressure to “just add ↑” — resist |

---

## 6. Recommended Adjustments

Before PR11.1, SPM should adopt these adjustments to the specification (documentation only — no spec edit in this PR):

### 6.1 Naming and positioning

1. **Rename “Layer 2A”** for Snapshot → **“Evidence Export Artifact”** or **“Assessment Snapshot (export track)”** — do not collide with Assessment Landscape Layer 2A.
2. **Add explicit clinician copy:**
   - Snapshot = *raw score grid*
   - Learner Map = *supervision competency record*
3. **Clarify report strategy:** Snapshot replaces **spreadsheet/grid** workflows; Learner Map replaces **supervision summary** workflows; Assessment Data Report remains **single-cycle formal record** until a merged export package is designed (PR11.6).

### 6.2 Visual and IA

4. **Snapshot grid orientation:** **Targets as rows, cycles as columns** (traditional grid). Do not default to Learner Map appendix orientation.
5. **Header:** single compact block — not Learner Map multi-section artifact header.
6. **Legend:** one inline row (4 bands + unscored) — not side-by-side cards.
7. **Hard exclude movement** from Snapshot data presentation (omit glyphs even if present in shared profile).

### 6.3 Data architecture

8. **Introduce `AssessmentSnapshotProfile`** (thin adapter over shared evidence normalization — may wrap or subset `LearnerMapProfile`).
9. **V1 prototype disclaimer:** “Grouped by domain; secondary grouping coming with Builder PR11.5.”
10. **Cycle dates:** include in column headers when `start_date` present.

### 6.4 Export

11. **HTML primary; PDF via print** — no PDF engine V1.
12. **Production gate:** explicit PHI warning before download (parallel Learner Map Full warnings).
13. **Defer cycle filtering** to post-V1; document as future export option.

### 6.5 PR sequence tweak

| PR | Adjusted scope emphasis |
|----|-------------------------|
| PR11.1 | Dev prototype + **orientation decision** + minimal header |
| PR11.2 | **`AssessmentSnapshotProfile` adapter** — not “reuse LearnerMapView” |
| PR11.3 | Density + **targets×cycles** grid + group sections |
| PR11.4 | HTML POC |
| PR11.5 | Secondary grouping in pack + Snapshot group nesting |
| PR11.6 | Production + report coexistence decision |

---

## 7. Implementation Guidance

### 7.1 For Builder (PR11.1)

- Route: `#/dev/assessment-snapshot` (mirror Learner Map dev pattern).
- Mock data: reuse `learnerMapMockData` scenarios or shared builder — Small / Medium / Large.
- **Do not** import `LearnerMapExportView`.
- **Do** call `buildLearnerMapProfile()` (or shared builder) for cells, then map to Snapshot presentation without movement.
- Prove **one domain section** at Medium density before Full assessment grid.

### 7.2 Shared vs separate

```
pack_snapshot + cycles + scores
        │
        ▼
buildLearnerMapProfile()  ← shared normalization (Layer 0)
        │
        ├──► LearnerMapProfile → LearnerMapView / Export (interpretation)
        │
        └──► AssessmentSnapshotProfile → AssessmentSnapshotView (evidence only)
```

### 7.3 Clinical review gates

- PR11.3: Overseer density / IP review (like Learner Map PR9.11).
- PR11.4: Security / PHI review before any non-dev HTML download.
- PR11.6: SPM production wiring + report coexistence.

### 7.4 Tests

- Snapshot profile excludes movement from rendered output (even if source has movement).
- Unscored vs scored-zero cells.
- Multi-scale targets in one group.
- Empty cycle / partial scoring.

---

## 8. Final Recommendation

### **APPROVE WITH ADJUSTMENTS**

Assessment Snapshot is the **correct long-term direction** for replacing external publisher grids and Excel matrices. It is **sufficiently differentiated from Learner Map** only if:

- Snapshot stays **raw, dense, and summary-free**
- Snapshot uses **grid-native orientation** (targets × cycles)
- Learner Map remains **supervision-first** with appendix as optional evidence, not the primary grid product
- Layer naming is **decoupled** from Assessment Landscape (Layer 2A)

**Do not revise the fundamental product thesis.** Adjust naming, orientation, data adapter boundary, and report-coexistence framing before Builder starts PR11.1.

**Not approved as proposed without:**

1. Removing or correcting the “Layer 2A” label for Snapshot  
2. Documenting Snapshot ↔ Learner Map ↔ Report three-way positioning  
3. Committing to targets-as-rows / cycles-as-columns for Snapshot grid  
4. Planning `AssessmentSnapshotProfile` (or equivalent) rather than reusing Learner Map export UI  

---

_Assessment Snapshot Architecture Review — PR11.0A Overseer. Read-only review; no code or spec modifications in this deliverable._
