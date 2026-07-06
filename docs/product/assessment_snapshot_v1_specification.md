# Assessment Snapshot V1 Specification

| Field | Value |
|-------|--------|
| **Document type** | Product specification |
| **Feature** | Assessment Snapshot V1 |
| **Milestone** | PR11.0 (specification only) |
| **Status** | Approved for dev prototype planning |
| **Related** | [`learner_map/README.md`](./learner_map/README.md) · [`visualization/layer_2_visualization_strategy.md`](./visualization/layer_2_visualization_strategy.md) |

---

## 1. Purpose

**Assessment Snapshot** exists to replace the **external assessment-specific visuals** clinicians still rely on outside Evalis — familiar artifacts such as:

- ABLLS grids  
- VB-MAPP visual / scoring grids  
- AFLS tracking sheets  
- PEAK matrices  

These tools provide **rapid visual scan value**: a dense matrix of targets × cycles that clinicians can read at a glance. Evalis needs an equivalent that is **assessment-agnostic**, **IP-safe**, and **longitudinal** — without cloning publisher-specific layouts, typography, or book structure.

Snapshot preserves the **paper-grid mental model** while keeping Evalis a content-agnostic assessment engine.

---

## 2. Product Role

Assessment Snapshot is:

| Role | Description |
|------|-------------|
| **Layer 2A** | First Layer 2 visualization track — dense raw evidence, not supervision analytics |
| **Dense raw assessment evidence layer** | Exact scores and competency-state colors across all cycles |
| **Shareable assessment visual** | Eventually exportable as standalone HTML (see §10) |
| **Replacement for Assessment Data Report** | Over time, supersedes the legacy report-style artifact’s practical value |
| **Complement to Learner Map** | Parallel surface with distinct job; not a duplicate or “lite” version |

**Assessment Snapshot is not a Lite Learner Map.**

---

## 3. Relationship to Learner Map

| Dimension | Assessment Snapshot | Learner Map |
|-----------|---------------------|-------------|
| **Primary question** | *“What are the learner’s scores across the assessment over time?”* | *“What does the learner’s longitudinal competency profile look like, and how has it changed?”* |
| **Evidence type** | Raw assessment evidence | Clinical supervision layer |
| **Density** | Extremely compressed | Structured summaries + optional L2 appendix |
| **Cycles** | All included cycles | All relevant cycles (rollup, L1, optional appendix) |
| **Granularity** | Target-level scores | Target-level in appendix; domain rollups in L1 |
| **Interpretation** | None | Coverage, distribution, movement |
| **Summaries** | None | L0 rollup, L1 domain competency |
| **Sharing** | HTML-friendly standalone artifact (future) | Print / Save PDF export |
| **Audience** | Quick scan, familiar grid replacement | Supervision, review, sign-off depth |

**Rule:** Implementations must not merge these surfaces. Shared **data normalization** is encouraged; shared **UI or semantics** is not.

---

## 4. Relationship to Current Assessment Data Report

The **current Assessment Data Report** (printable report from the assessment workflow) is a **legacy report-style artifact**. It does not provide meaningful narrative, recommendations, treatment planning, parent explanation, or formal sign-off documentation — and it is **mostly redundant** after Learner Map for supervision use cases.

**Direction:**

- **Assessment Snapshot + Learner Map** together should replace the current report’s **practical value** for clinicians.  
- **Do not remove** the current Assessment Data Report in V1. Demotion or replacement is a **later integration decision** (see PR11.6).

---

## 5. Data Scope

### Include

- Learner / assessment metadata (identifiers, labels appropriate to org policy)  
- Assessment pack name  
- Cycle dates (when available)  
- Domains / primary groups  
- Optional secondary groups (when pack structure supports them)  
- Targets  
- Exact scores (or score labels for non-numeric scales)  
- Competency-state colors  
- **All included cycles** in the assessment  

### Exclude

- Clinical notes  
- Recommendations  
- Treatment planning  
- AI interpretation  
- Narrative summaries  
- Movement analytics  
- Coverage percentages  
- Domain competency summaries  
- Predictions  

---

## 6. Longitudinal Scope

Assessment Snapshot is **not current-cycle-only**.

Traditional assessment grids are often **updated across repeated administrations**. Snapshot must show the **compressed longitudinal history** of target scores across **all relevant assessment cycles** in one scannable view.

A clinician opening Snapshot should see the full score matrix for the assessment — not a single-cycle slice.

---

## 7. Supported Assessment Structures

Snapshot must support common pack hierarchies through **configurable grouping**, not framework-specific renderers in V1.

| Framework | Primary group | Secondary group | Target unit |
|-----------|---------------|-----------------|-------------|
| **ABLLS / AFLS** | Primary Group | — | Target |
| **VB-MAPP** | Level | Domain | Milestone |
| **ESDM** | Age Band | Domain | Item |
| **PEAK** | Module | Program Area / Relation Type | Program |

**V1 principle:** Map any pack to **primary group → optional secondary group → target** using Evalis-native labels. Avoid hard-coded “VB-MAPP layout” or “ABLLS page” templates.

---

## 8. Dependency on Future Builder Architecture

Snapshot V1 will benefit from the future **Assessment Builder** evolution:

- Optional secondary grouping  
- Configurable structural labels (primary / secondary group names)  
- Reusable scoring scales  
- Target-level scoring overrides  
- Non-numeric scoring labels (display labels without implying publisher semantics)  

**V1 prototype constraint:** Initial dev prototype may use **existing flattened domains** where secondary grouping is not yet available. Prototype should not block on full Builder upgrades; production maturity should not ship without structural alignment where packs require it.

---

## 9. Visual Principles

Assessment Snapshot should be:

- Dense  
- Compact  
- Grid-like  
- Scannable  
- Low-text  
- Color-driven  
- Raw-data oriented  
- Familiar to clinicians  
- Assessment-agnostic  
- IP-safe  

### Avoid

- Copying ABLLS / VB-MAPP / PEAK visual layouts exactly  
- Explanatory cards  
- Narrative sections  
- Charts  
- Interpretation copy  
- Large spacing  
- Dashboard-like UI  

---

## 10. HTML Sharing Strategy

### Future artifact goal

Standalone **HTML file** that:

- Opens **without Evalis login**  
- Is **read-only** — no editing  
- Makes **no network calls** after open  
- Embeds **data** and **styles** inline  
- Is **scrollable** and **printable**  
- Is **timestamped** (generation time visible)  
- Can be shared like a **paper grid / matrix** (org-controlled distribution)  

### Privacy caution

- Exported HTML must be treated as a **clinical document** containing assessment data.  
- **PHI sharing policy** must be explicit before any production HTML export is enabled.  
- **De-identification option** may be considered in a later milestone — not V1.  
- **Production sharing is not approved** by this specification; HTML export remains a **future goal** subject to SPM and compliance review.

---

## 11. Print Strategy

Snapshot is **HTML-first** and **print-compatible**.

Unlike Learner Map Full export (supervision artifact with appendix pagination), Snapshot optimizes for:

- Compressed pages  
- Minimal headers  
- Visual density  
- Paper-friendly layout  
- Fast clinical scanning  

Print may use browser print (consistent with Evalis Alpha print strategy). No dedicated PDF engine in V1.

---

## 12. Non-Goals

Assessment Snapshot V1 must **not**:

- Replace Learner Map  
- Add AI summaries  
- Add clinical recommendations  
- Generate treatment goals  
- Replicate publisher grids exactly  
- Support automatic public sharing  
- Implement a PDF engine  
- Include clinical notes  
- Include edit functionality in the exported artifact  

---

## 13. Success Criteria

Assessment Snapshot V1 succeeds if:

- A clinician can **scan assessment status quickly**  
- **All targets** are represented  
- **All cycles** are represented  
- **Scores** are visible or inferable from cells  
- **Color states** are clear and consistent with in-app competency semantics  
- The artifact feels **familiar enough** to replace paper grids for day-to-day reference  
- The design **avoids publisher-specific cloning**  
- The architecture can **eventually** support standalone HTML export  

---

## 14. Recommended Implementation Path

Staged development (documentation planning only — not authorized until SPM approves each PR):

| PR | Scope |
|----|--------|
| **PR11.1** | Dev-only Assessment Snapshot prototype — `#/dev/assessment-snapshot`, mock data, no production wiring |
| **PR11.2** | Snapshot data adapter — reuse normalized profile (e.g. `LearnerMapProfile` or shared builder); support current domain–target structure |
| **PR11.3** | Snapshot visual density iteration — compressed target × cycle grid, domain grouping, color rules |
| **PR11.4** | HTML export proof-of-concept — static HTML artifact, embedded data/styles, no login |
| **PR11.5** | Builder structural upgrades — optional secondary grouping, configurable labels |
| **PR11.6** | Production integration decision — replace or demote Assessment Data Report; production route and sharing policy |

Follow the **Learner Map pattern**: dev-only prototype first, clinical/product review before production wiring.

---

## 15. Final Recommendation

**Assessment Snapshot should become the next visualization track** after Learner Map Alpha readiness.

- Develop in **dev-only mode first**, as Learner Map was.  
- **Eventually replace** the current Assessment Data Report as the clinician-facing **dense assessment visual** artifact.  
- **Learner Map remains** the higher-order **longitudinal supervision** artifact.  

Together, Snapshot (raw grid) and Learner Map (competency profile) cover the two distinct reasons clinicians still reach for spreadsheets and external grid tools.

---

_Document steward: Documentation / Product. Update when PR11.1 scope is approved or implementation learnings require revision._
