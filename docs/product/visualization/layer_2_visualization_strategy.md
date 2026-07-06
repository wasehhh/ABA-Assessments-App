# Evalis Layer 2 Visualization Strategy

**Status:** Strategy document (pre-implementation)  
**Primary source:** Overseer Layer 2 Visualization Architecture Review (read-only, post–PR8)  
**Related:** Layer 0 (`scoreInterpretation.ts`), Layer 1 (`domainProfile.ts`, Assessment Overview, Domain Profile components)  
**Audience:** SPM, product, Builder, QA, Documentation  

This document defines **what Layer 2 is** and **what it is not**. It does **not** authorize implementation until SPM approves a scoped **Layer 2A** build.

---

## 1. Executive Summary

**Layer 2 = Assessment Landscape.**

Layer 2 answers one primary question:

> **“What does the entire assessment look like, and how is it changing over time?”**

**Layer 0** (Score Interpretation) made scores **mean the same thing everywhere**.  
**Layer 1** (Domain Profile) made **each domain** reviewable without exporting to a spreadsheet.  
**Layer 2** makes the **whole assessment** legible at a glance and supports **bounded longitudinal review** across cycles—without recreating publisher assessment grids.

Layer 2 is **not** part of AIM Alpha scope. Alpha success should be judged on the **core clinical workflow** and **Layer 1** as the in-product visualization surface unless SPM explicitly expands scope later.

---

## 2. Relationship to Layer 1

| Layer | Metaphor | Question | Unit of focus |
|-------|----------|----------|----------------|
| **Layer 1** | **Microscope** | “Where are we **in this domain**?” | Single domain |
| **Layer 2** | **Map** | “Where are we **across the whole assessment**?” | All domains + assessment rollup |

**Layer 1 solves:** domain-level review (coverage, points captured, score bands, cycle delta, sequence strip, domain cards in Assessment Overview).

**Layer 2 solves:** whole-assessment understanding and longitudinal review—the remaining reasons clinicians still open spreadsheets **after** domain-level questions are answered in Evalis.

**Boundary rule:** Layer 2 must **not** become “more Layer 1 inside Overview.” Assessment Overview remains the **Layer 1 executive entry point**; Layer 2 is a **separate in-assessment surface** optimized for cross-domain orientation.

---

## 3. Core user questions

### Therapists

- Which domains still need attention before I submit?
- Am I missing whole sections of the assessment?
- What changed since I last worked on this cycle?
- Is my work “complete enough” to submit without opening Excel?

### Supervisors / senior therapists

- Can I see the **whole assessment** before I drill into one domain?
- Where are gains concentrated since the prior cycle?
- Which domains drive low points captured or incomplete coverage?
- Is this assessment ready for my review pass?

### Clinical leads (Alpha-adjacent; fuller support post-Alpha)

- How does this assessment compare **cycle-over-cycle** at a summary level?
- Where should training or supervision focus across domains?
- Do I still need a spreadsheet for leadership review?

Layer 2 should make these questions answerable **in product** for the **current assessment and bounded cycle comparison**—not replace formal reporting or external analytics platforms in v1.

---

## 4. Primary Layer 2 surface

**Name:** **Assessment Landscape**

**Recommendation:** A **dedicated in-assessment view / mode / tab** reachable from the assessment workflow (e.g. alongside Matrix and Overview), scoped to **one assessment**.

**Assessment Landscape is:**

- Per-assessment, per-org workspace (same tenancy as today)
- A **read-mostly orientation** surface with **row drill-down** into Layer 1 / domain scoreboard
- Focused on **rollup + domain rows**, not target-by-target editing

**Assessment Landscape is not:**

- An **org-wide dashboard** (multi-client, multi-assessment fleet view)
- A **report-only** substitute (print/PDF remains a separate channel)
- **More content crammed into Assessment Overview** (Overview stays Layer 1; avoid duplicate executive cards at two navigation depths)

---

## 5. Assessment Landscape concept

A single screen composed of:

### Assessment rollup header

- Assessment identity (client, pack title, cycle context, status)
- Whole-assessment **points captured** and **coverage**
- Optional **readiness-for-review** signal (e.g. completeness threshold—copy TBD, not a clinical score)
- **Cycle delta summary** at assessment level (aggregated from domain profiles, not recomputed from raw scores ad hoc)

### Domain rows (one row per domain)

Each row is a **compact Layer 1 digest**, not a full Domain Profile card:

| Row element | Purpose |
|-------------|---------|
| Domain title | Orientation |
| **Points captured** | Quick strength signal |
| **Coverage** | Scored vs total targets |
| **Compact band summary** | Score-band distribution at a glance (Evalis-native bands, not numeric grid) |
| **Mini-sequence or compact strip** | Order/frontier hint without full Domain Sequence Strip height |
| **Cycle delta snippet** | Movement vs comparison cycle (when baseline exists) |

### Interaction

- **Row click** → navigate to **Layer 1** context: domain scoreboard / matrix with domain pre-selected
- No requirement for per-target editing on the Landscape itself in **Layer 2A**

### Visual density

- **Landscape rows**, not cards stacked like Overview
- Prioritize **scannability** across 5–15+ domains typical in custom packs

---

## 6. Visualization types

### Include now (Layer 2A / early Layer 2B)

| Type | Description |
|------|-------------|
| **Domain-row landscape** | Primary surface; one row per domain |
| **Compact band summaries** | Reuse Layer 1 band semantics in row-sized form |
| **Domain comparison** | Within assessment: rank or highlight high/low points captured, coverage gaps |
| **Bounded cycle comparison** | Current cycle vs **one** selected prior cycle (same model as Layer 1 delta, rolled up) |

### Defer (Layer 2B / 2C+)

| Type | Rationale |
|------|-----------|
| **Full multi-cycle history** | Needs cycle picker UX, performance, and clarity work |
| **Assessment-wide sequence strip** | Risk of ABLLS-grid mimicry and visual noise |
| **Acquisition/regression ledger** | Valuable but report-grade; not first interactive surface |
| **Export/report parity** | Consumers of Layer 2 concepts, not the first delivery vehicle |

### Reject (explicit non-goals)

| Type | Rationale |
|------|-----------|
| **Numeric heatmap grid** | Publisher-grid analogue; IP and UX risk |
| **Publisher-style layouts** | ABLLS/AFLS visual cloning |
| **Full ABLLS-style clone** | Legal and product positioning conflict |
| **Developmental age estimates** | Out of scope; implies normative claims |
| **AI predictions** | Not Layer 2; separate future layer if ever |

---

## 7. Data architecture

### Reuse (do not reinterpret scores in UI)

| Module | Role in Layer 2 |
|--------|-----------------|
| **`scoreInterpretation.ts`** (Layer 0) | Single truth for competency state, max score, unscored vs zero |
| **`domainProfile.ts`** (Layer 1) | `buildDomainProfiles()` → `DomainProfile[]` per cycle |
| **`analytics.ts`** | Domain/assessment rollups (`calculateDomainStats`, cycle stats) already used by Overview |

**Rule:** Layer 2 UI components consume **aggregated structures**. They must **not** re-derive bands, deltas, or points from raw `AssessmentScore[]` in presentation code.

### Conceptual future structure: `AssessmentProfile`

Introduce (in a future PR, not necessarily named exactly in code yet):

```text
AssessmentProfile
├── assessmentId, cycleId, comparisonCycleId?
├── rollup: pointsCaptured, coverage, cycleDeltaSummary
└── domains: DomainProfile[]   // composed, not re-interpreted
```

**`AssessmentProfile` composes `DomainProfile[]`** and adds assessment-level rollups. Building it should call existing `buildDomainProfiles()` (or a thin wrapper), then reduce for header metrics—**never** bypass Layer 0/1 interpretation.

### Cycle comparison

- **Layer 2A:** optional single comparison cycle (mirror Matrix compare behavior)
- **Layer 2B:** explicit comparison cycle selector with guardrails when prior cycles lack scores

---

## 8. IP / copyright-safe design principles

Evalis targets **clinical equivalence**, not **visual duplication**.

| Principle | Practice |
|-----------|----------|
| **Universal assessment model** | Domains, targets, packs, cycles—content-agnostic engine |
| **No numeric grids** | No cell-per-target heatmap matrices resembling publisher books |
| **No publisher layouts** | No row/column conventions that mimic ABLLS/AFLS page structure |
| **Evalis-native patterns** | **Points Captured**, **Score Bands**, **Sequence Strip** (domain scope), **Landscape Rows**, **Cycle Delta** |
| **Language** | Avoid trademarked assessment names as UI templates; packs remain user-provided content |

Layer 2 extends **Evalis vocabulary**, not a third-party book’s visual grammar.

---

## 9. Export / report relationship

**Reports and exports are future consumers of Layer 2 concepts—not the first Layer 2 surface.**

Rationale:

- Interactive Landscape validates **usability** before locking print layouts
- Printable report has known Alpha constraints (browser, scoring display); parity work is **Layer 2C**

**Future reports / exports may include (conceptual):**

- Assessment rollup (points captured, coverage, cycle)
- Domain summary table (landscape rows rendered for print)
- Compact band summaries per domain
- Cycle movement summaries
- Acquisition/regression appendices (ledger-style, deferred from interactive v1)

**Near-term:** Continue improving report accuracy via Layer 0 interpretation (separate track). Layer 2C aligns report sections to **AssessmentProfile** shape when SPM prioritizes it.

---

## 10. Out-of-scope boundaries

Explicitly **defer** from Layer 2 (any phase unless SPM reopens):

- Canonical clinical **taxonomy** alignment (VB-MAPP chapters, etc.)
- **AI insights** or narrative generation
- **Benchmarking** across orgs or normative samples
- **Developmental age** or age-equivalent estimates
- **Prediction** / forecasting
- **Native assessments** (Evalis-owned copyrighted item banks)
- **Org-wide dashboards** (multi-assessment analytics)
- **Full multi-cycle analytics** explorer (timeline scrubber, all cycles at once)

---

## 11. Conceptual roadmap

### Layer 2A — Assessment Landscape (first build)

- Single-cycle (plus optional **one** comparison cycle) **whole-assessment** view
- Domain rows + rollup header
- Drill-down to Layer 1 / matrix
- **Gate:** SPM approval of Layer 2A scope after this document

### Layer 2B — Bounded longitudinal comparison

- Comparison cycle UX hardened
- Assessment-level delta narrative (still bounded, not full history)
- Row-level trend emphasis without full ledger

### Layer 2C — Report / export parity

- Map `AssessmentProfile` sections to report and CSV summaries
- Acquisition/regression appendix where appropriate

### Beyond Layer 2

- Full **historical explorer** (many cycles, many assessments)
- Taxonomy-aligned views (if product strategy requires)
- **AI layer** (separate strategy; not implied by Layer 2)

---

## 12. Alpha relationship

| Topic | Position |
|-------|----------|
| **Alpha scope** | Core workflow + **Layer 1** visualization; Layer 2 **excluded** |
| **Parallel development** | Layer 2 may be built **in parallel** on non-Alpha branches if capacity exists |
| **Alpha success criteria** | Must **not** depend on Layer 2 unless SPM adds it explicitly |
| **Trainings / runbook** | Continue to describe Overview + matrix; do not promise Landscape to AIM staff without SPM sign-off |

Layer 1 product review concluded domain review is **Alpha-sufficient**; the spreadsheet gap for **assessment-wide** view is acknowledged and **scheduled** for Layer 2—not a reason to delay Alpha.

---

## 13. Final product decision

1. **Layer 2 should proceed only after this strategy is documented and approved** (this document satisfies the documentation step).
2. **Implementation must not begin** until SPM approves a **specific Layer 2A scope** (surface placement, comparison cycle rules, MVP row fields, accessibility bar).
3. **Builder work** should follow a sequenced PR plan analogous to Layer 0→1 (data layer before UI; no heatmap shortcuts).
4. **QA** should validate Landscape against the user questions in §3 and the reject list in §6.

---

## Appendix A — Layer dependency stack (reference)

```text
Layer 0  Score Interpretation     → interpretTargetScore, bands, max scores
Layer 1  Domain Profile           → DomainProfile, Overview, Sequence Strip
Layer 2  Assessment Landscape    → AssessmentProfile, domain rows, rollup
Layer 3+ Reports / AI / Fleet     → explicit future strategies
```

---

## Appendix B — Completed foundation (context)

Layer 1 stabilization sequence (complete):

- PR1 — Score Interpretation Layer  
- PR2 — Report + Analytics Adoption  
- PR3 — Domain Profile Data Layer  
- PR4 — Domain Profile UI Components  
- PR5 — Assessment Overview Integration  
- PR6 — Domain Sequence Strip  
- PR7 — Layer 1 Stabilization  
- PR8 — Audit Logging Sanitization  

---

_Document steward: Documentation / Overseer. Update when Layer 2A scope is approved or implementation learnings require strategy revision._
