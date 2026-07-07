# Assessment Snapshot Production Architecture

| Field | Value |
|-------|--------|
| **Document type** | Production architecture (implementation contract) |
| **Feature** | Assessment Snapshot |
| **Milestone** | PR13.0 |
| **Status** | Authoritative plan — governs PR13 implementation |
| **Supersedes as guide** | Exploratory PR11 concept selection; dev-only prototype assumptions |
| **Related** | [`assessment_snapshot_design_manifesto.md`](./assessment_snapshot_design_manifesto.md) · [`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) · [`assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) · [`assessment_builder_universal_architecture_plan.md`](./assessment_builder_universal_architecture_plan.md) |
| **Audience** | SPM, Builder, Overseer, QA, Documentation |

This document is the **production implementation contract** for Assessment Snapshot (PR13). It consolidates learnings from PR11 exploration, Target Threads V1, adaptive layout research, PR12 universal assessment structure, framework stress testing, QA findings, and Overseer recommendations.

**It does not authorize code.** Each PR13 milestone requires SPM approval before implementation.

---

## 1. Product objective

### 1.1 What Assessment Snapshot is

Assessment Snapshot is Evalis’s **longitudinal evidence record** — a dense, read-only artifact that answers one question:

> **What happened?** What score (or scale-appropriate label) was recorded for every target, in every cycle, organized by the assessment structure as authored in the pack?

Snapshot exists to replace external tools clinicians still maintain outside Evalis:

- ABLLS grids and update sheets  
- VB-MAPP visual scoring sheets  
- AFLS paper trackers  
- PEAK matrices  
- Clinic Excel score matrices  

Snapshot preserves the **paper-grid mental model** (complete target × cycle evidence) without copying publisher layouts, typography, or book structure.

### 1.2 What Snapshot is not

| Excluded forever | Rationale |
|------------------|-----------|
| Movement indicators | Interpretation — belongs to Learner Map |
| Coverage percentages | Interpretation |
| Distribution bars / rollups | Interpretation |
| Domain competency summaries | Interpretation |
| Narrative, recommendations, AI | Out of scope; clinical safety |
| Treatment planning | Out of scope |
| Analytics dashboards | Out of scope |
| Clinical notes (V1 production) | Separate artifact track if ever added |
| Edit functionality in export | Read-only artifact |

### 1.3 Artifact boundaries (four-way split)

Snapshot must remain visually and semantically distinct from every other assessment surface.

| Surface | Primary question | Mode | Cycle scope | Interpretation |
|---------|------------------|------|-------------|----------------|
| **Matrix / Scoreboard** | What should I score now? | Interactive, in-app | Current cycle (with optional compare) | Layer 0 competency colors only |
| **Assessment Snapshot** | What are all the scores across time? | Read-only artifact | **All included cycles** | **None** — raw evidence only |
| **Learner Map** | What does competency look like; where did it change? | In-app + export | All relevant cycles | Coverage, distribution, movement |
| **Assessment Data Report** | What is the formal single-cycle record? | Print report | **Current cycle** (longitudinal embed deferred) | Single-cycle distribution; not a grid replacement |

#### Snapshot vs Learner Map (critical)

| Dimension | Assessment Snapshot | Learner Map |
|-----------|---------------------|-------------|
| Verb | **Record** | **Interpret** |
| Default deliverable | Full evidence record | Supervision summary (Standard export) |
| Geometry | Target history horizontal (History Strip / Target Thread) | L1 domain table; L2 appendix uses cycles-as-rows for compactness |
| Movement | **Absent** — omit even if present in shared profile | Central (L1 + appendix) |
| Density | Maximum evidence density | Structured, card-framed supervision |
| Audience | “Show me the scores” | “Should I sign off?” |

**Rule:** Shared data normalization is required. Shared UI or interpretive semantics is forbidden.

#### Snapshot vs Report (coexistence)

- **Report** remains the single-cycle formal printable record until an explicit integration decision (PR13.6+).
- **Snapshot** replaces spreadsheet / external grid workflows — not the report’s sign-off narrative role.
- Snapshot must **not** be marketed as “Layer 2A” — that label belongs to **Assessment Landscape** (in-app Layer 2 map).

### 1.4 Governing presentation principle

**Layout-adaptive but data-invariant.**

| Invariant (data) | Adaptive (presentation) |
|------------------|-------------------------|
| Assessment structure as authored in pack | Domain column packing (horizontal vs vertical rows) |
| Target order within groups | Domains per row |
| Exact scores and competency states | Visual splitting of oversized groups (presentation factoring) |
| Cycle history | Print pagination |
| Pack hierarchy | Layout tiers for screen vs print |

Presentation changes must **never** alter clinical meaning, target order, scores, or authored hierarchy.

---

## 2. Information architecture

### 2.1 Universal structure model (PR12)

All Snapshot rendering consumes the **universal pack structure** delivered in PR12. No assessment-specific renderers.

```text
ContentPackData (pack_snapshot)
├── structure_labels?          → configurable copy (Level, Domain, Milestone, …)
├── scoring_scales?            → pack-level scale catalog (interpretation only)
└── domains[]                  → primary groups (only group list in storage)
    ├── secondary_groups?[]    → authored secondary group catalog
    └── targets[]              → flat target list (sole storage for targets)
        └── secondary_group_id? → optional authored membership
```

**Core rule:** `domain.targets[]` is the only target list. Secondary grouping is **authored structure**, not nested storage.

| Level | Storage | Snapshot role |
|-------|---------|---------------|
| **Primary group** | `domains[]` | Domain Zone — top structural chapter |
| **Secondary group** | `domain.secondary_groups[]` + `target.secondary_group_id` | Sub-zone header inside primary group |
| **Target** | `domain.targets[]` | History Strip / Target Thread unit |

Configurable labels (`structure_labels`) drive UI copy:

| Label key | Alpha default | Example (VB-MAPP) |
|-----------|---------------|-------------------|
| `primary_group` | Domain | Level |
| `secondary_group` | (optional) | Domain |
| `target` | Target | Milestone |

### 2.2 Authored structure vs presentation structure

This distinction is **non-negotiable** for production.

| Type | Source | Mutates pack? | Example |
|------|--------|---------------|---------|
| **Authored structure** | Builder / CSV import | Yes (at authoring time) | VB-MAPP Level → Domain → Milestone |
| **Presentation structure** | Snapshot layout engine | **Never** | PEAK module split into “Part 1 · Targets 1–46” for print |

#### Authored structure (data)

- Primary groups in pack order  
- Secondary groups in catalog order (with orphan/unassigned handling per `groupTargetsForDisplay`)  
- Target order within each group as stored in `domain.targets[]` (reordered for display only via grouping helpers — never dropped)  
- Ungrouped targets preserved in an “Ungrouped” section when secondary catalog exists  

#### Presentation structure (layout only)

- **Presentation factoring** — splits an oversized *authored* group into neutral display Parts  
- **Domain packing** — places multiple Domain Zones side-by-side when width allows  
- **Layout tiers** — compact / standard / dense token sets for screen vs print  
- **Pagination breaks** — print page boundaries  

Presentation factoring labels must be **neutral**: `Part 1`, `Part 2`, `Targets 1–50`, `Targets 51–100`. They must **not** imply clinical subdomains that were not authored.

**Example (presentation-only):**

```text
Authored:  PEAK DT Module · Targets 1–184

Rendered:  PEAK DT Module
             Part 1 · Targets 1–46
             Part 2 · Targets 47–92
             …
```

The underlying group remains one authored module; scores and order are unchanged.

### 2.3 Target ordering

Production Snapshot must use a single canonical ordering pipeline:

```text
pack_snapshot.domains[]  (pack order = primary group order)
        │
        ▼
getPackDomainTargetOrder(domain)
  → flattenMatrixDisplayTargets(domain)
  → groupTargetsForDisplay order when secondary groups exist
  → flat domain.targets[] order when no secondary grouping
        │
        ▼
AssessmentSnapshotProfile.domains[].targets[]
  (+ optional targetSections[] for secondary headers)
```

**Invariants:**

- Never sort alphabetically  
- Never sort by score or competency  
- Never drop targets during grouping  
- Ungrouped targets appear after catalog-ordered groups  

### 2.4 Cycle ordering

| Rule | Detail |
|------|--------|
| Order source | `cycle_number` ascending |
| Default scope | **All cycles** on the assessment |
| Header content | Cycle number required; `start_date` when available |
| Cycle status | Omit from dense export default (optional in-app) |
| Future | Optional cycle-range filter for export (post-V1 production) — philosophy unchanged |

Global cycle axis: **left-to-right** on every History Strip / Target Thread. Cycle headers align marks across targets within a Domain Zone.

### 2.5 Data profile contract

Production Snapshot reads evidence through a thin adapter — no forked scoring logic.

```text
pack_snapshot + cycles + scores
        │
        ▼
buildLearnerMapProfile()          ← shared normalization (Layer 0)
        │
        ▼
buildAssessmentSnapshotProfile()  ← evidence-only projection
        │
        ├── structureLabels
        ├── cycles[] (summaries)
        └── domains[]
              ├── targets[] (ordered, with cells per cycle)
              └── targetSections? (secondary group display sections)
```

**Snapshot profile must expose:**

| Field | Include | Exclude from UI |
|-------|---------|-----------------|
| `displayScoreWithMax` | ✓ | — |
| `competencyState` / Layer 0 color | ✓ | — |
| `isUnscored` | ✓ | — |
| `rawScore` / `normalizedRatio` | Available in profile | Do not emphasize ratio in Snapshot UI |
| `movementFromPrevious` | May exist in source | **Never render** |
| Rollups / totals | — | **Never** |

Shared helpers (PR12.4):

- `getPackStructureLabels(pack)`  
- `buildReadSurfaceTargetSections(domain, targetsById)`  
- `getPackDomainTargetOrder(domain)`  

---

## 3. Layout engine

### 3.1 Production geometry: Target Threads → Evalis Record

PR11 exploration produced ten concept prototypes and three synthesis candidates (A Strip First, B Zone First, C Record First). **Target Threads V1** (dev preview) is the validated implementation direction:

- **Candidate A** contributed strip-first evidence density  
- **Candidate B** contributed strong Domain Zone chapter boundaries  
- **Candidate C** contributed continuous Evalis Record document framing  

Production geometry is **not a spreadsheet**. It is:

```text
Evalis Record (continuous document)
├── Record Header
├── [Adaptive domain row(s)]
│   ├── Domain Zone (primary group)
│   │   ├── [optional Secondary Group header]
│   │   │   ├── Target Thread 1  [bead][bead][bead]…
│   │   │   ├── Target Thread 2
│   │   │   └── …
│   │   └── …
│   └── Domain Zone (may sit beside prior zone)
└── Record Footer
```

Each **Target Thread** = one target’s **History Strip**: a horizontal sequence of **Evidence Marks** (one per cycle).

PR11.1 Table grid is a **reference data path only** — not the production visual target.

### 3.2 Adaptive packing

The layout engine computes placement from assessment shape and viewport — never from hard-coded domain counts.

| Input signal | Layout response |
|--------------|-----------------|
| Cycle count | Wider strips → wider domain columns → fewer domains per row |
| Domain count | Additional rows as needed |
| Targets per domain | May trigger presentation factoring |
| Available width | Screen scroll vs print column budget |
| Layout tier | Token density (compact / standard / dense) |

**Dev prototype baseline** (`resolveThreadsLayout`):

| Tier | Trigger (approximate) | Effect |
|------|----------------------|--------|
| `compact` | ≤35 targets, ≤4 domains, ≤5 cycles | Larger beads, generous spacing |
| `standard` | Default middle band | Balanced density |
| `dense` | >75 targets, >7 domains, or >8 cycles | Minimal bead size, tight gaps |

Production must extend this with:

- Explicit **print tier** (may differ from screen tier)  
- **Domain column width** derived from cycle count × bead slot width + label column  
- **Row packing algorithm** that greedily fills available row width before wrapping  

**Rule:** Domains per row is **computed**, not configured.

### 3.3 Adaptive widths

Within a Domain Zone:

| Element | Width behavior |
|---------|----------------|
| Domain column | `f(cycleCount, layoutTier)` — fixed per zone in a row |
| Bead slot | Fixed rem per tier — guarantees score legibility |
| Target label column | Fixed narrow column; truncation allowed |
| Thread connector | Decorative continuity between beads — must not obscure scores |

Domain columns in the same row should share cycle header alignment so marks scan vertically across targets.

### 3.4 Screen vs print behavior

| Context | Behavior |
|---------|----------|
| **Screen** | Horizontal scroll within domain row acceptable; vertical scroll primary; interactive tooltips for truncated labels |
| **Print** | `@media print` rules; zone-aware page breaks; presentation factoring more aggressive; suppress dev-only chrome |
| **HTML export** | Inline CSS; single self-contained file; scroll + print from same render tree |

Print must not be the design driver — **HTML canonical render** first; print CSS follows.

### 3.5 Presentation factoring rules

Trigger when a single authored group exceeds readability thresholds.

| Category | Target count | Production action |
|----------|-------------|-------------------|
| Typical group | 20–60 | No factoring |
| Large group | 80–120 | Factoring likely for print; optional on screen |
| Extreme group | 180–250+ | Factoring required for print; strongly recommended on screen |

**Builder alignment:** PR12 oversized-group warnings (`OVERSIZED_GROUP_LARGE_THRESHOLD = 80`, `EXTREME = 120`) inform clinics at authoring time. Snapshot must still render flat uploads safely.

**Factoring algorithm (production contract):**

1. Input: ordered target list for one primary group (after secondary grouping headers applied)  
2. Split into sequential Parts of ≤N targets (default N tuned by QA — start with 46–50)  
3. Label: `{primaryGroupTitle} · Part {k} · Targets {start}–{end}`  
4. Preserve: exact target order, all scores, all cycles, group title on each Part  
5. Never create new pack entities  

**Do not confuse** presentation Parts with authored secondary groups.

### 3.6 Global cycle axis

Every Domain Zone in a row shares:

- Cycle column headers (number + optional date)  
- Left-to-right cycle index on every thread  
- Consistent bead column alignment across targets  

When presentation factoring splits a group across print pages, cycle axis repeats on continuation pages with explicit continuation label — **never drop marks**.

### 3.7 Layout invariants (checklist)

Production layout engine must guarantee:

- [ ] Pack primary group order preserved  
- [ ] Target order preserved within groups (including across Parts)  
- [ ] Every target rendered exactly once  
- [ ] Every cycle rendered for every target (bead or explicit unscored)  
- [ ] Authored secondary groups shown when present; omitted when flat pack  
- [ ] Presentation factoring uses neutral Part labels only  
- [ ] No hard-coded domains-per-row  
- [ ] Renderer never mutates `pack_snapshot`  
- [ ] Movement fields never surface  
- [ ] Single group ≥250 targets remains usable (scroll + factor + paginate — not one-page mandate)  

---

## 4. Visual language

Production visual language follows **Target Threads V1** as implemented in dev preview, aligned to **Concept 11 (Evalis Record)** in the Design Manifesto. This section documents direction — **not a redesign mandate**.

### 4.1 Evidence geometry

| Primitive | Production definition |
|-----------|----------------------|
| **Evidence Mark** | Circular bead: competency fill + exact score text (or em dash if unscored) |
| **Target max ring** | Distinct ring on bead when score equals target maximum — separate from competency green |
| **History Strip / Target Thread** | Horizontal bead sequence; fixed slot width; optional thread connector line |
| **Domain Zone** | Columnar chapter: domain title, meta count, cycle header row, stacked threads |
| **Secondary group header** | Compact uppercase subheading within zone — authored title only |

**Rejected geometries (do not ship):**

- Spreadsheet gridlines as identity  
- Cycle-primary rows (Learner Map appendix orientation)  
- Spatial / canvas target packing  
- Glyph-only marks hiding scores  
- Decorative thread ornament consuming evidence space  

### 4.2 Typography

| Use | Style |
|-----|-------|
| Scores in beads | Tabular nums; 8–11px by tier |
| Domain titles | Bold uppercase; 9–10px by tier |
| Target labels | Sans; truncated code + subtitle pattern |
| Secondary group headers | Semibold uppercase; muted gray |
| Record header/footer | Compact; 9–11px |

Monospace or tabular figures required for score alignment across columns.

### 4.3 Spacing and density

Layout tiers control vertical and horizontal rhythm:

| Token class | Purpose |
|-------------|---------|
| `threadRowGapClass` | Vertical gap between target threads |
| `domainGapClass` | Gap between domain columns in a row |
| `beadGapClass` | Horizontal gap between cycle beads |
| `domainZoneClass` | Zone vertical padding |

Production default bias: **denser than Learner Map L2 appendix**, sparser than PR11.1 spreadsheet.

### 4.4 Hierarchy

```text
1. Record identity (header)
2. Domain Zone title (primary group)
3. Secondary group header (when authored)
4. Target label + thread
5. Individual bead (score evidence)
6. Record footer (provenance)
```

Color hierarchy uses **Layer 0 competency semantics only** (`STATE_BUCKET_DISPLAY`) — no domain rainbow, no zone color coding unrelated to score state.

### 4.5 Labels and legend

| Element | Rule |
|---------|------|
| Structure labels | From `structureLabels` — never hard-code “Domain” / “Target” in production |
| Legend | Single inline row: four competency bands + unscored + target-max ring |
| Disclaimer | Minimal clinical note: raw evidence ≠ diagnosis/treatment — shorter than Learner Map export prose |
| Target truncation | Code from title/id; full title in `title` attribute / optional index (ABLLS-scale) |

### 4.6 Secondary group headers

When `domain.targetSections` is present (PR12.4):

- Render authored secondary group title above its target threads  
- Preserve ungrouped section when applicable  
- Flat packs: no secondary header row — identical to pre-PR12 rendering  

Secondary headers are **structural**, not interpretive.

### 4.7 Document framing

| Block | Content |
|-------|---------|
| **Header (compact variant)** | Assessment Snapshot label, assessment name, learner, pack, cycle count, generated timestamp |
| **Body** | Adaptive domain grid |
| **Footer** | Evalis · pack version · target count · cycle count · generated timestamp |

No multi-card artifact framing (Learner Map pattern). No L0 rollup tiles. No movement key.

---

## 5. Large assessment strategy

Snapshot production must remain clinically usable across real-world framework shapes without assessment-specific code paths.

### 5.1 Framework stress matrix

| Framework | Primary → Secondary → Target | Typical group size | Production stress |
|-----------|------------------------------|--------------------|-------------------|
| **ABLLS** | Domain → Target | 20–60 per domain | Domain C (~57) is **not** the ceiling; multi-domain adaptive rows |
| **VB-MAPP** | Level → Domain → Milestone | Small natural groupings | Secondary grouping reduces factoring need |
| **ESDM** | Age Band → Domain → Item | Manageable | Standard layout tiers |
| **AFLS** | Skill area → Target | Usually manageable | **Flat full-protocol uploads** may reach 180–250+ in one group |
| **PEAK** | Module → Program → Target | Module ~184 items possible | Presentation factoring required |
| **Custom clinic packs** | Clinic-defined | Unbounded | Must handle 250+ single group |

### 5.2 Strategy by stress type

| Stress | Production response |
|--------|---------------------|
| Many domains, moderate targets | Adaptive domain packing; dense tier; multi-row grid |
| Few domains, extreme targets (PEAK, flat AFLS) | Presentation factoring; dense tier; vertical scroll; print Parts |
| Many cycles (6–10+) | Wider domain columns; fewer domains per row; optional future cycle-range export |
| Mixed scales in one group | Per-target `interpretTargetScore` — bead shows `displayScoreWithMax` |
| Non-numeric scales | Label text in bead; same geometry |
| Poorly factored flat upload | Render as-is; factoring at presentation layer only |

### 5.3 250-target single-group requirement

When one authored primary group contains **≥250 targets**, production must ensure:

- Target order visually continuous (including Part boundaries)  
- History Strip / bead readability at dense tier  
- HTML vertical scroll performant (virtualization acceptable for screen — not for print/export DOM)  
- Print produces predictable multi-page output with repeating cycle headers on continuations  
- No silent target omission  

**Not required:** fit on one page.

### 5.4 QA stress fixtures (production gate)

Before production route ships, QA must sign off on mock profiles covering at minimum:

| Fixture | Shape |
|---------|-------|
| Small Alpha | 3 domains × ~10 targets × 2 cycles |
| ABLLS-like | ~15 domains × ~40 targets × 4 cycles |
| VB-MAPP-like | 3 levels × secondary groups × 15 milestones × 3 cycles |
| PEAK module | 1 domain × 184 targets × 3 cycles |
| Flat AFLS | 1 domain × 200+ targets × 2 cycles |
| Extreme custom | 1 domain × 250 targets × 6 cycles |

---

## 6. Export strategy

### 6.1 Primary artifact: standalone HTML

Production long-term format is **standalone HTML**:

| Property | Requirement |
|----------|-------------|
| Offline | Opens without Evalis login |
| Self-contained | Inline CSS; embedded data; no runtime network calls |
| Read-only | No editing affordances |
| Scroll | Natural wide-grid scrolling |
| Timestamp | Generation time visible |
| PHI | Treated as clinical document — org policy governs distribution |

**PDF:** Browser print → Save as PDF of the same HTML. No dedicated PDF engine in PR13.

### 6.2 Production gate (PHI)

Mirror Learner Map Full export discipline:

- Explicit user acknowledgment before download  
- Org PHI policy compliance documented  
- De-identification option deferred post-production  
- Dev-only routes must not expose production download without gate  

Overseer review required before any non-dev HTML download ships.

### 6.3 Pagination and print

| Rule | Detail |
|------|--------|
| Page breaks | Prefer breaks between Domain Zones or presentation Parts — not mid-target |
| Mid-strip break | If unavoidable: continuation label repeats cycle axis; all beads present |
| Headers | Minimal repeating header optional on print pages — avoid Learner Map multi-page prose |
| `@page` | Size and margin tuned for clinical filing (letter/A4 — org default) |

Print CSS lives alongside screen CSS in the same component tree — not a separate document layout.

### 6.4 Standalone viewing

Exported HTML must render identically to in-app production Snapshot view (same React tree serialized or same layout rules in static HTML generator — implementation choice in PR13.4).

Minimum metadata block in export:

- Learner name (org policy)  
- Assessment / pack name and version  
- Cycle range  
- Generated timestamp  
- Structure labels in legend copy  

### 6.5 Export modes (production scope)

| Mode | V1 production | Future |
|------|---------------|--------|
| Full assessment (all domains, all cycles) | **Default** | — |
| Selected primary groups | Defer | Mirror Learner Map selected-domains pattern with clear partial-grid labeling |
| Cycle range | Defer | Export setting |
| De-identified | Defer | Strip learner name / identifiers |

---

## 7. Implementation roadmap

PR13 implements production Snapshot in dependency order. Each milestone is independently reviewable.

### 7.1 Current state (post-PR12.4)

| Delivered | Location / notes |
|-----------|------------------|
| Design manifesto + Overseer review | `docs/architecture/` |
| Dev preview route | `#/dev/assessment-snapshot` |
| Target Threads V1 visual | `components/assessmentSnapshot/v1/` |
| Evidence profile adapter | `assessmentSnapshotProfile.ts` |
| Universal structure on read surfaces | PR12.4 — labels + secondary sections in profile |
| Adaptive layout tiers (partial) | `threadsLayout.ts` — screen tier selection |
| Concept Lab archive | PR11 candidates + concepts remain dev-only toggles |

| Not yet production | Gap |
|--------------------|-----|
| Production assessment route | Dev-only |
| Presentation factoring engine | Manifesto only |
| Domain row packing algorithm | Partial (flex wrap — not width-aware) |
| HTML export serializer | Not started |
| PHI download gate | Not started |
| Print CSS hardening at scale | Dev preview baseline only |
| Target index for truncated labels | Not started |

### 7.2 Recommended PR13 sequence

| PR | Milestone | Scope | Exit criteria |
|----|-----------|-------|---------------|
| **PR13.1** | Layout engine core | Width-aware domain row packing; presentation factoring helper; print tier; layout invariants unit-tested | PEAK + 250-target fixtures pack correctly; no data mutation |
| **PR13.2** | Production view shell | `AssessmentSnapshotView` production variant; wire production route on assessment; remove movement leakage audit; compact header/footer finalization | Clinician can open Snapshot from assessment; passes governing rules checklist |
| **PR13.3** | Print + scale hardening | `@media print` rules; page-break strategy; Chrome print QA on stress fixtures; target label truncation + optional index | ABLLS + PEAK print sign-off |
| **PR13.4** | HTML export | Serializer POC → production; inline CSS; PHI acknowledgment gate; download flow | Offline HTML opens correctly; Overseer security review |
| **PR13.5** | Production integration | Export entry point in assessment UI; documentation; QA regression; dev Concept Lab quarantined | Alpha-ready production Snapshot |
| **PR13.6** | Ecosystem alignment | Report / Learner Map copy audit; clinician-facing three-way positioning; optional cycle-range spike | No user confusion between artifacts in UX copy |

### 7.3 PR13.1 layout engine (detail)

Deliverables:

- `snapshotLayoutEngine.ts` — pure functions: row packing, factoring, tier resolution  
- Inputs: `AssessmentSnapshotProfile`, viewport width, mode (`screen` \| `print`)  
- Outputs: render plan (rows → zones → parts → threads → beads)  
- Tests: flat pack unchanged; PEAK factoring; 250-target order; secondary groups preserved across Parts  

### 7.4 PR13.2 production view (detail)

Deliverables:

- Production route: `/assessments/:id/snapshot` (exact path per routing conventions)  
- Gate: at least one scored target + one cycle (mirror sensible export availability)  
- Reuse `buildAssessmentSnapshotProfile(buildLearnerMapProfile(...))` — no fork  
- Strip dev-only concept switcher from production shell  
- Secondary group headers via existing `targetSections`  

### 7.5 PR13.4 HTML export (detail)

Deliverables:

- `serializeAssessmentSnapshotHtml(profile, renderPlan)`  
- Embedded JSON optional for audit — scores visible in DOM regardless  
- Content-Disposition download; filename includes assessment id + date  
- Gate component shared pattern with Learner Map export acknowledgment  

### 7.6 Dependencies

| Dependency | Status |
|------------|--------|
| PR12 universal pack structure | ✅ Complete |
| PR12.4 read surface structure labels | ✅ Complete |
| Layer 0 score interpretation | ✅ Shared |
| Builder secondary grouping | ✅ Authoring complete |
| Learner Map export PHI pattern | ✅ Reference for PR13.4 gate |

### 7.7 Explicit non-goals for PR13

- Assessment Builder changes  
- Matrix / scoring changes  
- Learner Map movement or coverage changes  
- Assessment Data Report redesign  
- AI summaries or recommendations  
- Dedicated PDF server  
- Automatic public sharing  
- In-app Assessment Landscape (Layer 2 map) — orthogonal track  

---

## 8. Governing rules (production merge checklist)

Every PR13 merge must verify:

- [ ] Every target appears  
- [ ] Every cycle appears for every target  
- [ ] Exact scores visible at default density  
- [ ] No movement indicators  
- [ ] No coverage, distribution, or rollup analytics  
- [ ] No narrative interpretation  
- [ ] Authored domain + secondary structure visible when pack provides it  
- [ ] Pack order and target order preserved  
- [ ] Presentation factoring uses neutral Part labels only  
- [ ] Layout adapts — no hard-coded domains-per-row  
- [ ] Single group ≥250 targets remains usable  
- [ ] Renderer does not mutate assessment data  
- [ ] Layer 0 competency colors only  
- [ ] Distinguishable from Learner Map at a glance  
- [ ] Structure labels from pack — not hard-coded Alpha defaults in production copy  
- [ ] PHI gate before HTML download (when export ships)  

---

## 9. Document stewardship

| Event | Action |
|-------|--------|
| PR13 milestone starts | Cite this document in PR description |
| Layout threshold tuning | Update §3.5, §5 — QA + SPM approval |
| HTML PHI policy change | Update §6.2 |
| Report integration decision | Update §1.3, §7.2 PR13.6 |
| New framework stress case | Add to §5.1 fixture table |

---

## 10. Final statement

Assessment Snapshot production is **the Evalis Record** — a layout-adaptive, data-invariant, evidence-only longitudinal document built on PR12 universal structure and Target Threads V1 visual language.

**Build the record. Not the grid. Not the dashboard. Not the interpretation layer.**

PR13 executes this architecture in six milestones: layout engine → production shell → print hardening → HTML export → integration → ecosystem alignment.

---

_Assessment Snapshot Production Architecture — PR13.0. Documentation only. No application code authorized by this document._
