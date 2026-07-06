# Learner Map V1-PR6 Export & Print Product Specification

| Field | Value |
|-------|--------|
| **Document type** | Product specification |
| **Feature** | Learner Map — export and print |
| **Milestone** | V1-PR6 (specification only; no implementation in this PR) |
| **Baseline commit** | `1838a05` — *feat(learner-map): harden longitudinal artifact presentation* |
| **Status** | Approved for Builder planning pending SPM sign-off |
| **Primary source** | Overseer Learner Map Export & Print Strategy Review |
| **Revision** | SPM — L2 orientation & scroll strategy (no clinician-facing toggles in V1 export) |

---

## 1. Purpose

### Why Learner Map export exists

Learner Map export and print provides a **portable, supervision-ready longitudinal record** derived from the same **`LearnerMapProfile`** data model used in the in-app artifact. It exists to:

1. **Replace manual longitudinal assessment spreadsheets** — supervisors and leads should not need to export raw scores into Excel to answer “how is this learner progressing across cycles?”
2. **Support supervision review** — default output prioritizes **domain-level competency summary (L1)** suitable for team meetings and clinical oversight.
3. **Provide a printable longitudinal competency record** — a durable artifact (browser print / Save as PDF) that can be filed, shared internally per org policy, or referenced in supervision notes.
4. **Avoid publisher-grid cloning** — export uses **Evalis-native** rollup, bands, movement, and domain summary patterns; it does **not** reproduce ABLLS/AFLS-style numeric heatmap grids as the default deliverable.

### What export is not

- Not a substitute for the **single-cycle Assessment Report** (separate product surface).
- Not a **full in-app screen dump** by default (see §3–§4).
- Not a **compliance certification** or legal clinical record without org-specific governance.

### Current product state (pre-export)

| Area | State |
|------|--------|
| `LearnerMapProfile` architecture | Approved and implemented |
| L0 → L1 → L2 hierarchy | Approved in-app |
| L1 Domain Competency Summary | Primary supervision layer in UI |
| L2 Cycle × Target Detail | Supporting detail in UI |
| Artifact identity, metadata, clinical disclaimer | Implemented (PR5 hardening) |
| Export / print | **Not implemented** |
| Production wiring | **Not implemented** (dev-only preview at `#/dev/learner-map`) |

---

## 2. Export philosophy

| Principle | Definition |
|-----------|------------|
| **Supervision-first** | Default export answers supervisor questions at **assessment (L0)** and **domain (L1)** levels before exposing target × cycle matrices. |
| **Detail-on-demand** | Target-level **L2** detail is available only when the user **explicitly** chooses a mode that includes the appendix. |
| **L1 primary** | **Domain Competency Summary** is the core printable body in default modes. |
| **L2 appendix** | **Cycle × Target Detail** is structurally and visually separated as an **appendix**, not continuous scroll from L1. |
| **Export layout vs in-app interaction** | L2 **orientation** and **scroll** are **export-layout responsibilities**, not clinician-facing export options (see §6.1). |
| **Browser print first** | V1 delivery uses a **print-scoped export view** + browser **Print / Save as PDF** (Chrome per org runbook norms). No dedicated PDF engine in V1. |
| **Standalone before Report R2** | Learner Map export ships as a **standalone** feature before any **Report R2** embedding (see §11). |

**Strategic decision (Overseer):** Do **not** export the full in-app view by default. The in-app Learner Map combines L1 + L2 for interactive exploration; export defaults to **Standard Mode** without L2.

---

## 3. Export modes

Three modes are defined. All modes consume the same **`LearnerMapProfile`** + **`LearnerMapDisplayContext`**; modes differ only in **included sections** and **layout density**.

### Mode A — Summary Mode

**Intent:** Compact supervision handout when reference cards would waste space.

**Includes:**

| # | Section | Maps to |
|---|---------|---------|
| 1 | Artifact header (identity block) | `LearnerMapArtifactHeader` — title + primary identity |
| 2 | Record metadata | Metadata block in header |
| 3 | Clinical disclaimer | `LEARNER_MAP_CLINICAL_DISCLAIMER` |
| 4 | **L0** Assessment Rollup | `LearnerMapAssessmentRollup` |
| 5 | Compact inline legend | Minimal score-band + movement key (single combined block, not full cards) |
| 6 | **L1** Domain Competency Summary | `LearnerMapDomainSummary` |
| 7 | Footer | Export footer (org line, generated timestamp, page placeholder per §7) |

**Excludes:**

- Full **Score Bands** reference card
- Full **Movement Key** reference card
- **L2** Cycle × Target Detail (all domains)

---

### Mode B — Standard Mode *(default)*

**Intent:** Default supervision and review export; replaces spreadsheet summary for most use cases.

**Includes:**

| # | Section | Maps to |
|---|---------|---------|
| 1 | Artifact header | Full identity block |
| 2 | Record metadata | Full metadata grid |
| 3 | Clinical disclaimer | Clinical framing section |
| 4 | **L0** Assessment Rollup | Totals across cycles |
| 5 | **Score Bands** card | `LearnerMapScoreBandsCard` |
| 6 | **Movement Key** card | `LearnerMapMovementKey` |
| 7 | **L1** Domain Competency Summary | Primary supervision table |
| 8 | Footer | Per §7 |

**Excludes:**

- **L2** Cycle × Target Detail

**Rationale:** Supervisors need interpretive keys (bands, movement) alongside L1 without printing large target matrices.

---

### Mode C — Full Mode

**Intent:** Complete longitudinal record including target-level detail for audit, deep review, or archival when length is acceptable.

**Includes:**

- **Everything in Standard Mode**, plus:
- **Appendix section** (clear visual and structural break)
- **L2 Cycle × Target Detail** — one appendix block **per domain** (`LearnerMapDomainSection`)
- **Optional target index** (if needed for navigation in very large domains — implementation may defer index to a later PR within Full Mode if not required for V1-PR9)

**Requires warning when large** (see §8): user must confirm before generating/printing when assessment size exceeds defined thresholds.

**Excludes:** Nothing from Standard; L2 is additive only.

---

## 4. Default mode decision

| Decision | Rule |
|----------|------|
| **Default export mode** | **Standard Mode** |
| **Preselected in UI** | Standard Mode when export dialog opens |
| **Full Mode** | **Explicit opt-in only** — never default; requires acknowledgment of length warning when applicable |
| **Summary Mode** | Optional compact alternative; not default |

**Product rationale:** Standard Mode balances interpretability (reference cards) with length (no L2). Defaulting to Full would recreate spreadsheet-like bulk and undermine supervision-first positioning.

---

## 5. Section structure

Document order is **fixed per mode** to support predictable print layout and future Report R2 embedding.

### Summary Mode — section order

1. Artifact header (Evalis · Clinical Artifact / Learner Map title)
2. Record metadata
3. Clinical disclaimer
4. L0 Assessment Rollup
5. Compact inline legend
6. L1 Domain Competency Summary
7. Footer

### Standard Mode — section order

1. Artifact header
2. Record metadata
3. Clinical disclaimer
4. L0 Assessment Rollup
5. Score Bands card
6. Movement Key card
7. L1 Domain Competency Summary *(labeled: Primary supervision layer)*
8. Footer

### Full Mode — section order

1–8. Same as Standard Mode
9. **Appendix divider page** (title: e.g. “Appendix — Cycle × Target Detail” + short scope note)
10. For each domain in profile order:
    - Domain appendix header (domain title)
    - L2 grid (`LearnerMapDomainSection`)
    - Optional target index (if implemented)
11. Footer on each printed page (implementation)

**Note:** In-app section labels (“Primary supervision layer”, “Supporting detail”) may be adapted for print copy but must preserve meaning.

---

## 6. L2 appendix strategy

| Rule | Specification |
|------|----------------|
| **Not included by default** | Standard and Summary modes **never** render L2. |
| **Full Mode only** | L2 appears **only** when user selects Full Mode and confirms warnings if shown. |
| **Appendix break** | L2 content starts **after** a clear appendix break (new page in print; distinct heading in export view). |
| **Per-domain appendix** | Each domain is a **separate appendix section** with its own heading — not one continuous mega-table across domains. |
| **Large domains** | Handled through **warnings**, **appendix structure**, **column splitting**, and (future) **selected-domain appendix** or **print-only orientation variant** — not through user scroll toggles (see §6.1). |
| **Default orientation** | **Cycle × Target** remains the approved default for in-app L2 and Full Mode export appendix (matches `LearnerMapDomainSection`). |

**IP / design alignment:** Appendix L2 is **Evalis Cycle × Target Detail**, not a third-party assessment book layout.

### 6.1 L2 orientation and scroll strategy *(SPM decision)*

Founder question: should export add (1) a button to flip L2 between **Cycle × Target** and **Target × Cycle**, and (2) an option to disable/enable scroll for large domains?

**SPM decision:** Do **not** add either as **clinician-facing controls** in the first export implementation.

#### L2 orientation

| Topic | Decision |
|-------|----------|
| **Default** | **Cycle × Target** remains the approved L2 orientation in-app and in Full Mode export appendix. |
| **V1 export UX** | **No** user-facing orientation toggle, flip button, or mode setting. |
| **Treatment** | Orientation is an **export-layout strategy** decided by product/engineering for print quality — not a clinician preference in V1. |
| **Target × Cycle (future)** | May be evaluated **later** as a **print-only Full Mode appendix variant** if Full Mode print QA shows it is **clinically useful** (see §10, §13 OQ8–OQ9). Not in V1 scope. |

#### Scroll behavior

| Topic | Decision |
|-------|----------|
| **V1 export UX** | **No** “disable scroll” / “enable scroll” option for clinicians. |
| **In-app vs print** | In-app L2 may use horizontal scroll for exploration; **print-scoped export views must not rely on scroll containers** that clip content when printed. |
| **Treatment** | Scroll is a **print-layout responsibility**: export views **automatically remove or neutralize** scroll wrappers (`overflow: visible`, unwrapped tables, or paginated segments) so **printed output is not clipped**. |
| **Large domains** | Usability is handled through **appendix pagination**, **column splitting**, **Full Mode warnings**, and (deferred) **selected-domain appendix** or **print-only orientation variant** — not scroll toggles. |

**Preserved decisions:** **Standard Mode** remains default; **Full Mode** remains explicit opt-in only.

---

## 7. Pagination rules

Product-level rules for print-scoped CSS and layout (implementation detail deferred to Builder; requirements are binding):

| Rule ID | Rule |
|---------|------|
| **P1** | **Cover block cohesion:** Artifact header + metadata + disclaimer should stay together on the **first page(s)** when possible; avoid orphaning disclaimer alone on a prior page from title. |
| **P2** | **L1 table headers:** If L1 Domain Competency Summary spans multiple pages, **repeat table column headers** on each continued page. |
| **P3** | **Domain row integrity:** Avoid breaking a **single domain row** across pages where layout permits (best-effort; not required for MVP if technically blocked). |
| **P4** | **Appendix start:** L2 appendix section **starts on a new page** in Full Mode. |
| **P5** | **Per-domain L2:** Each L2 domain appendix **starts on a new page** in Full Mode. |
| **P6** | **Footer:** Footer (generated date, artifact id line, optional page numbers) appears on **every printed page** in production export (feasibility subject to browser print — see §13). |
| **P7** | **Large-domain splitting:** **Column splitting** for wide L2 domains is **required before** broad production rollout of Full Mode on large assessments; until then, warn and/or restrict Full Mode by size class. |
| **P8** | **No clipped scroll regions:** Print-scoped export views must **not** print content trapped inside scroll containers. Layout must expand or segment so all intended appendix cells appear in the printed document (via pagination/column splitting, not user scroll). |
| **P9** | **Default L2 orientation in print:** Full Mode appendix uses **Cycle × Target** unless a future approved print-only variant is specified (§6.1). |

**Browser constraint:** Exact page-break behavior varies by browser; **Chrome** is the supported print target (consistent with Evalis Alpha runbook).

**Layout note:** Horizontal scroll acceptable in **in-app** Learner Map preview only; **export/print path** must implement §6.1 scroll neutralization.

---

## 8. Export UX rules

### Entry point (future production)

- User action: **Export Learner Map** (or **Print Learner Map**) from assessment context when learner map is available (see §9 access rule).

### Mode selection dialog

| UX element | Behavior |
|------------|----------|
| **Dialog title** | “Export Learner Map” or “Print Learner Map” |
| **Mode list** | Summary · **Standard (recommended)** · Full |
| **Preselection** | **Standard Mode** |
| **Mode descriptions** | Each mode shows a **plain-language bullet list** of included sections (from §3) so users know exactly what they will get. |
| **Summary Mode** | Available as compact option; not highlighted as default. |
| **Full Mode** | Secondary/destructive-styled or clearly marked “Long document”. |
| **Full warning** | When selected (and when size thresholds met): *“This export includes target-level detail for every domain and may produce a very long document. Use Standard Mode for supervision review unless you need full cycle × target detail.”* |
| **Confirm** | Primary action: **Continue to print view** (or **Print**); cancel returns without navigation. |
| **Dev chrome** | Export view must **not** include dev harness, scenario picker, or mock banners when `isMockData` is false. |
| **No L2 layout toggles** | Export dialog must **not** offer orientation flip (Cycle × Target ↔ Target × Cycle) or scroll enable/disable controls in V1 (§6.1). |
| **Print view behavior** | Print-scoped view presents **full printable L2 appendix content** through layout/pagination — not interactive scroll regions. |

### Post-selection flow

1. Open **print-scoped export view** (dedicated route or modal shell without app nav).
2. User invokes browser **Print** / **Save as PDF**.
3. No automatic download of non-PDF formats in V1.

---

## 9. Production readiness gates

Export must **not** ship to production users until **all** gates pass:

| Gate | Requirement |
|------|-------------|
| **G1** | Export **mode selection** implemented per §8 |
| **G2** | **Print-scoped export view** — layout tuned for print; app chrome hidden |
| **G3** | **Real `LearnerMapDisplayContext` wiring** — learner name, assessment name, organization from live data (not mock builder) |
| **G4** | **Production access rule** — Learner Map export available when learner/assessment has **≥ 2 cycles** (same rule as in-app eligibility unless SPM revises) |
| **G5** | **Print QA** completed on **small**, **medium**, and **large** mock/real profiles (align with dev scenario sizes) |
| **G6** | **No dev harness chrome** in export output |
| **G7** | **Clinical disclaimer** present on every mode |
| **G8** | **Standard Mode default** verified in UX and QA |

Optional gate before **Full Mode in production**:

| Gate | Requirement |
|------|-------------|
| **G9** | L2 **column splitting** or documented restriction for large domains (§7 P7) |

---

## 10. Deferred items

Explicitly **out of scope** for V1 export (do not implement without new spec):

| Item | Notes |
|------|--------|
| Dedicated **PDF engine** (server-side or client library) | Browser print only in V1 |
| **Report R2** embedding | Standalone export first (§11) |
| **Parent-friendly** variant | Simplified copy/layout for caregivers |
| **Selected-domain appendix** | Export subset of domains only |
| **L2 orientation toggle (Cycle × Target ↔ Target × Cycle)** | Clinician-facing control — **rejected for V1**; see §6.1 |
| **Scroll enable/disable for L2** | Clinician-facing control — **rejected for V1**; print layout handles scroll (§6.1, §7 P8) |
| **Target × Cycle print-only appendix variant** | Future evaluation after Full Mode print QA (§13 OQ8–OQ9) |
| **Changed-only appendix** | L2 filtered to movement ≠ flat/none |
| **Unscored-only appendix** | L2 filtered to incomplete targets |
| **AI narratives** | No generated clinical commentary |
| **Canonical taxonomy** views | VB-MAPP chapter alignment, etc. |
| **Multi-assessment learner timeline** | Cross-assessment learner history |

---

## 11. Relationship to Report R2

| Topic | Position |
|-------|----------|
| **Delivery order** | **Standalone Learner Map export** ships **before** Report R2 consumes Learner Map sections. |
| **Report R2 embedding** | Report R2 may later embed a **Summary** or **Standard-equivalent** section block for unified reporting. |
| **Logic reuse** | Report R2 must **consume `LearnerMapProfile`** (and display context builders) — **no duplicate** longitudinal aggregation logic in report code. |
| **Full L2 in reports** | **Full L2 appendix must not** be embedded in Report R2 **by default**; if ever offered, it is opt-in and separately specified. |
| **Assessment Report (current)** | Unchanged by this spec; Learner Map export is additive. |

---

## 12. Acceptance criteria for V1 export implementation

Future Builder work (PR7–PR11) satisfies V1 export when:

### Functional

- [ ] User can open export flow from production-eligible assessment context (when ≥ 2 cycles).
- [ ] **Standard Mode** is default and produces sections in §5 order without L2.
- [ ] **Summary Mode** produces compact export without full reference cards or L2.
- [ ] **Full Mode** requires explicit selection; shows §8 warning; includes L2 appendix per §6.
- [ ] Export view uses **`buildLearnerMapProfile`** output only — no parallel score math in export components.
- [ ] **`LearnerMapDisplayContext`** populated from real client/org/assessment data in production.

### Print / quality

- [ ] Print-scoped view hides navigation, dev controls, and mock banners.
- [ ] Chrome print QA passed for small/medium/large profiles (Standard Mode minimum).
- [ ] L1 repeating headers on multi-page print (best-effort per §7 P2).
- [ ] Full Mode: appendix and per-domain page breaks per §7 P4–P5 (best-effort).
- [ ] Print export: **no clipped scroll regions** in Full Mode L2 (§7 P8).
- [ ] **No** orientation or scroll toggles in export UX (§6.1, §8).

### Safety / product

- [ ] Clinical disclaimer on all modes.
- [ ] Full Mode blocked or strongly warned for large assessments until splitting ready (SPM decision per §13).
- [ ] Export does not introduce publisher-style numeric grid layouts beyond existing L2 cell semantics.

### Non-goals (must remain true)

- [ ] No dedicated PDF server in V1.
- [ ] No Report R2 changes in export PRs unless separately scoped.

---

## 13. Open questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| **OQ1** | Exact **print page-break** implementation (`break-before`, `@media print` regions) — component-level vs wrapper | Builder | Pagination quality |
| **OQ2** | Is **Summary Mode** required in **first production release**, or can V1-PR7–PR8 ship Standard + Full only? | SPM | Scope of PR8 |
| **OQ3** | Should **Full Mode** be **delayed entirely** until L2 **column splitting** exists? | SPM | G9 / production safety |
| **OQ4** | **Large-pack warning** thresholds — target count, domain count, or cycle × target product? (Suggest: align with mock `small` / `medium` / `large` scenarios) | SPM + QA | Warning UX |
| **OQ5** | **Footer page numbers** — feasible with browser print alone or accept “Generated at …” only in V1? | Builder | §7 P6 |
| **OQ6** | Production **entry point** location — assessment detail, matrix, or reports hub? | SPM | IA |
| **OQ7** | Minimum **cycle count** for export eligibility — confirm **2+** matches clinical expectation | SPM | G4 |
| **OQ8** | Should **Target × Cycle** be evaluated as a **future print-only** Full Mode appendix variant (not in-app default)? | SPM + QA | L2 print usability |
| **OQ9** | What **conditions** would justify building Target × Cycle print variant? (e.g. repeated Full Mode QA failure on wide domains despite column splitting; supervisor feedback that cycle-as-rows is unreadable in print) | SPM | Scope gate for post-V1 |

**Resolved by SPM (not open):** L2 orientation flip and scroll enable/disable as **clinician-facing export controls** — **out of scope for V1** (§6.1).

---

## 14. Recommended PR sequence

Per Overseer recommendation — **specification only**; sequencing is normative for Builder planning:

| PR | Scope | Deliverable |
|----|--------|-------------|
| **V1-PR7** | Export view + print scope | Print-scoped layout component(s); mode-driven section inclusion; `@media print` baseline; **scroll-container neutralization** for print (§7 P8); no production route |
| **V1-PR8** | Export UX in dev/staging | Mode selection dialog; Standard default; wire to dev/staging preview; Summary optional; **no** orientation/scroll toggles |
| **V1-PR9** | L2 appendix print rules | Full Mode appendix structure; **Cycle × Target** default orientation; per-domain page breaks; large-domain warnings; column-split spike; **no clipped print output** |
| **V1-PR10** | Production wiring | Real profile + display context; access rule (≥2 cycles); production entry point; remove mock-only restrictions |
| **V1-PR11** | Export QA | Structured QA matrix small/medium/large × modes; Chrome print sign-off; documentation update |

**V1-PR6 (this document)** does not include implementation.

---

## 15. Final recommendation

| Question | Answer |
|----------|--------|
| **Is the product ready for Builder implementation after this spec?** | **Yes — with SPM confirmation on open questions (§13), especially OQ2–OQ4.** |
| **Is export ready for production users?** | **No** — implementation PRs V1-PR7–PR11 and gates §9 remain. |
| **Is Full Mode ready for broad production day one?** | **Recommend no** until column-splitting or explicit SPM waiver with strong warnings (OQ3). |
| **Default user-facing promise** | **Standard Mode** — supervision-ready L0 + keys + L1, no L2. |

### SPM sign-off checklist

- [ ] Default mode = Standard confirmed
- [ ] Full Mode = opt-in with warning confirmed
- [ ] Summary Mode in or out of first release (OQ2)
- [ ] Full Mode production gate (OQ3)
- [ ] Access rule ≥ 2 cycles confirmed (OQ7)
- [ ] L2 orientation/scroll: **no clinician toggles** in V1 (§6.1) confirmed
- [ ] PR sequence V1-PR7–PR11 approved

---

## Appendix A — Layer mapping (in-app ↔ export)

| Layer | In-app component | Export role |
|-------|------------------|-------------|
| **Header** | `LearnerMapArtifactHeader` | All modes — identity, metadata, disclaimer |
| **L0** | `LearnerMapAssessmentRollup` | All modes |
| **Reference** | `LearnerMapScoreBandsCard`, `LearnerMapMovementKey` | Standard + Full; Summary uses inline legend only |
| **L1** | `LearnerMapDomainSummary` | All modes — primary body |
| **L2** | `LearnerMapDomainSection` | Full Mode appendix only |

## Appendix B — Related documents

- [`../visualization/layer_2_visualization_strategy.md`](../visualization/layer_2_visualization_strategy.md) — Assessment Landscape (separate from Learner Map; do not conflate)
- [`../../operations/alpha_runbook.md`](../../operations/alpha_runbook.md) — Chrome print expectations

---

_Document steward: Documentation / Overseer. Revision when SPM resolves §13 or implementation learnings require spec amendment._
