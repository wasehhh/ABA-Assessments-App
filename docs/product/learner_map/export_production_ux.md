# Learner Map PR9.12 Production Export UX Specification

| Field | Value |
|-------|--------|
| **Document type** | Product specification — production UX |
| **Feature** | Learner Map — production export & print access |
| **Milestone** | PR9.12 (specification only); **PR10** = implementation |
| **Validation basis** | PR9.11 Clinical Export QA Review — *Ready for PR10 with minor comments* |
| **Parent specs** | [`export_foundation.md`](./export_foundation.md); Selected Domains: see §7 (PR9.8 archived) |
| **Status** | Approved for PR10 Builder planning pending SPM sign-off |

---

## Milestone context

Learner Map export has passed **clinical/product validation** through:

| PR | Focus |
|----|--------|
| PR7 | Export view foundation |
| PR8 | Print foundation |
| PR9 | Appendix print viability |
| PR9.5 | Appendix density & continuity |
| PR9.6 | Print polish + movement semantics |
| PR9.7 | Assessment-wide movement rollup |
| PR9.8 | Selected Domains specification |
| PR9.9 | Selected Domains mode (dev) |
| PR9.10 | Appendix density & orientation clarity |
| PR9.11 | Clinical export QA review |

**Validated export modes:** **Standard**, **Selected Domains**, **Full** — all implemented and QA-reviewed in dev/export preview.

**PR9.12** defines **how clinicians access and use** export in **production**. **PR10** implements this spec.

---

## 1. Purpose

PR9.12 specifies **production UX** for **Export Learner Map** after validation of:

- **Standard Mode** — supervision artifact without L2
- **Selected Domains Mode** — Standard + filtered L2 appendix
- **Full Mode** — Standard + complete L2 appendix

This document answers:

1. Where export lives in the product  
2. When it is available  
3. Which modes are shown  
4. Default mode and warnings  
5. Validation rules  
6. Post-confirm flow (preview → browser print)  
7. What remains deferred  

It does **not** redefine print layout, L2 orientation, or appendix rendering (see PR6, PR9.x).

---

## 2. Production entry point

### Recommended placement

| Element | Specification |
|---------|----------------|
| **Location** | **Assessment / Learner Map action area** — secondary action alongside viewing the in-app Learner Map (exact screen: assessment detail, matrix toolbar, or dedicated Learner Map view — SPM may choose one primary surface in PR10) |
| **Label** | **Export Learner Map** |
| **Visibility** | Shown only when availability rules pass (§3) |
| **Not in scope** | Primary app navigation, org dashboard, global header |

### Rationale

- Export is **assessment-scoped** and **longitudinal** — it belongs on the assessment workflow, not as a top-level nav item.
- Clinicians already context-switch to Learner Map for L1/L2 review; export sits adjacent to that mental model.

### Dev route (unchanged)

- `#/dev/learner-map-export` remains **development-only** (`import.meta.env.DEV`).
- Production uses a **real-data preview route** (§11) without scenario controls.

---

## 3. Availability rules

Export Learner Map is **available** when **all** conditions hold:

| Rule | Requirement |
|------|-------------|
| **A1 — Cycle count** | Assessment has **≥ 2 cycles** (longitudinal record meaningful) |
| **A2 — Profile build** | `buildLearnerMapProfile(...)` succeeds with current assessment + cycle score data |
| **A3 — Scored data** | At least **some scored targets** exist across represented cycles (no export for entirely empty longitudinal record) |
| **A4 — Permission** | User belongs to assessment org and has permission to **view** assessment data (same gate as matrix/report viewing; export is not a separate elevated permission in V1 unless SPM defines one) |
| **A5 — Environment** | Production route — not dev harness |

### When export is **not** shown or is disabled

| Condition | UX |
|-----------|-----|
| **Only 1 cycle** | Hide export **or** show disabled control with tooltip: *“Learner Map export is available after a second assessment cycle.”* |
| **No scored data** | Hide or disable with: *“Score at least one target before exporting a Learner Map.”* |
| **Profile build failure** | Disable; show error if user attempts (§13) |
| **Permission denied** | Hide export or show standard unauthorized pattern for org |

**Learner Map in-app view** may use the same ≥2-cycle rule; export must not appear when longitudinal export would be misleading.

---

## 4. Export dialog

### Dialog shell

| Element | Value |
|---------|--------|
| **Title** | **Export Learner Map** |
| **Type** | Modal dialog (or dedicated slide-over — modal preferred for PR10) |

### Dialog contents

| # | Element | Purpose |
|---|---------|---------|
| 1 | **Short explanation** | 1–2 sentences: e.g. *“Create a printable longitudinal competency record for supervision or review. Choose how much target-level detail to include.”* |
| 2 | **Mode selection** | Radio group or segmented control: Standard · Selected Domains · Full |
| 3 | **Selected-domain checklist** | Visible **only** when Selected Domains mode active (§7) |
| 4 | **Warning messages** | Contextual: Full confirmation, all-domains-selected nudge, large assessment (§8–§9) |
| 5 | **Size summary** | Optional domain/target/segment counts when appendix applies (§9) |
| 6 | **Primary action** | **Continue to Export Preview** (recommended label — §10) |
| 7 | **Cancel** | Closes dialog; no navigation |

### Dialog behavior

- Opens from **Export Learner Map** action (§2).
- **Standard** preselected on open (§6).
- Primary action **disabled** when validation fails (§7, §13).
- Cancel / backdrop dismiss returns to prior screen without side effects.

---

## 5. Export modes

Three **production** modes — same semantics as validated dev export:

### Standard Mode

**Default.** Supervision artifact without target-level appendix.

**Includes:**

- Artifact header  
- Record metadata  
- Clinical disclaimer  
- Assessment rollup (L0)  
- Score Bands card  
- Movement Key card  
- L1 Domain Competency Summary  

**Excludes:** L2 appendix.

---

### Selected Domains Mode

**Standard body** + **L2 appendix for selected domains only.**

**Includes:** Everything in Standard, plus:

- Appendix — **Selected Domain Detail**  
- L2 cycle × target blocks per selected domain (assessment order)

**Requires:** ≥1 domain selected in checklist (§7).

---

### Full Mode

**Standard body** + **L2 appendix for all domains.**

**Includes:** Everything in Standard, plus:

- Appendix — **Cycle × Target Detail** (or established Full appendix title)  
- L2 for **every** domain in assessment order  

**Requires:** Explicit confirmation after Full warning (§8).

---

## 6. Default mode

| Decision | **Standard Mode** |
|----------|-------------------|
| **Preselection** | Standard selected whenever dialog opens |
| **Rationale** | Safest; shortest document; clinically sufficient for most supervision; avoids accidental long exports and appendix print load |

Full and Selected Domains require ** deliberate** user choice.

---

## 7. Selected Domains UX

When user selects **Selected Domains** mode:

| Rule | Behavior |
|------|----------|
| **Checklist visibility** | Domain checklist appears below mode selection |
| **Order** | Domains listed in **assessment pack order** (profile `domains` order) |
| **Labels** | Domain title (human-readable) |
| **Select all / Clear all** | **Available** in production (PR9.8 optional → **required** for PR10 per this spec) |
| **Zero selected** | Primary action **disabled** |
| **Helper text (zero)** | *“Select at least one domain to include target-level detail.”* |
| **All domains selected** | Show **informational nudge** (non-blocking): *“You selected all domains. Full export may be more appropriate and may produce a long document.”* — **Do not** force switch to Full |
| **L1 in output** | Remains **assessment-wide** (all domains) — per PR9.8 §6 |

---

## 8. Full Mode warning

Full Mode requires **explicit acknowledgment** before continuing.

### Standard Full warning (all assessments with L2)

**Copy (suggested):**

> Full export includes target-level detail for **every domain** and may create a **long document**. Use this for audit, deep review, or complete records.  
>  
> **Continue with Full Export?**

**UX:** Secondary confirm step **or** checkbox “I understand this may be a long document” + enabled Continue — Builder choice; acknowledgment required.

### Large assessment warning (additional)

When assessment exceeds **large** thresholds (align with dev `large` mock scenario or SPM-defined counts — domain count, target count, or product):

**Additional copy (suggested):**

> This assessment contains **many domains and targets**. Full export may generate a **long PDF**.

Show **in addition to** standard Full warning, not instead of it.

### Selected Domains

- **No** mandatory large warning for Selected Domains by default.  
- **All-domains-selected nudge** only (§7) — not a blocking Full redirect.

---

## 9. Page count / size warning

### Goal

Help users anticipate appendix length **before** opening preview.

### PR10 implementation (choose one tier)

| Tier | Behavior |
|------|----------|
| **Preferred (if easy)** | Show estimate: domains selected, total targets in appendix, approximate **appendix segments** (column-split segments from PR9.10) |
| **Fallback (minimum)** | Show counts without page estimate |

**Example (fallback or preferred):**

> Selected appendix: **3 domains** · **105 targets** · approximately **7 segments**

**When shown:**

- Selected Domains: after ≥1 domain selected  
- Full: always before confirm (domain count = all, target count = all scored targets in appendix scope)  
- Standard: omit (no appendix)

**Deferred:** Accurate page-count prediction — see §18.

---

## 10. Export action

### Primary button label (recommended)

**Continue to Export Preview**

Alternates acceptable if consistent: **Open Export Preview**.

### Flow after confirm

```text
1. User completes dialog (mode + selection + warnings).
2. Navigate to production export preview route/view (§11).
3. User reads print guidance (§12).
4. User invokes browser Print / Save as PDF manually.
```

### Explicit PR10 constraints

| Rule | Specification |
|------|----------------|
| **Preview first** | Always open **export preview route/view** before print |
| **No PDF engine** | No server/client PDF generation in PR10 |
| **No auto-print** | **Do not** force `window.print()` on preview load in first production pass (optional explicit “Print” button that calls `window.print()` is acceptable if labeled) |
| **No download** | No automatic file download in V1 production |

---

## 11. Export preview (production)

Production export preview **reuses** `LearnerMapExportView` with production data wiring.

| Requirement | Specification |
|-------------|----------------|
| **No dev chrome** | No scenario picker, mock banners, or dev-only controls |
| **Real profile** | `buildLearnerMapProfile` from live assessment + cycles + scores |
| **Real display context** | Production `LearnerMapDisplayContext` (§14) |
| **Mode indicator** | Show active mode (Standard / Selected Domains / Full) in preview chrome **outside** print document (`.no-print` region) |
| **Selected domains indicator** | When Selected Domains: list selected domain titles in `.no-print` region |
| **Print document** | Same `data-learner-map-export-document` structure as validated dev export |
| **Navigation** | Back link to assessment / Learner Map; does not appear in print |
| **Route** | Production hash route (e.g. `#/assessment/:id/learner-map/export?mode=...`) — exact path is Builder/SPM choice; must not use `#/dev/*` |

---

## 12. Print guidance

Display a **small, visible note** in the export preview **non-print** toolbar area:

**Suggested copy:**

> For best results, use your browser’s **Print** or **Save as PDF** option. **Disable browser headers and footers** if your browser adds extra page text. **Google Chrome** is recommended for printing.

Align with org runbook Chrome preference where applicable.

---

## 13. Validation / error states

| Condition | Behavior |
|-----------|----------|
| **Only one cycle** | Export action hidden/disabled (§3); if deep-linked: full-page message explaining 2-cycle requirement |
| **No domains in pack** | Disable export; error: *“This assessment has no domains to export.”* |
| **Selected Domains, zero selected** | Dialog primary disabled; helper text §7 |
| **Profile build failure** | Dialog error banner or toast: *“Unable to build Learner Map for this assessment. Try again or contact support.”* Log detail server-side/console in dev |
| **Missing learner metadata** | Preview may show **—** for missing optional fields; if **learner name** required by SPM: block with *“Client record is incomplete for export.”* |
| **Permission denied** | Standard app unauthorized / redirect; no export preview |
| **Invalid query params** | Unknown mode → default Standard or safe error page |
| **Empty scores (edge)** | Treat as §3 A3 — disable export |

---

## 14. Production metadata

`LearnerMapDisplayContext` (and header metadata) must populate from **live data**:

| Field | Source (conceptual) |
|-------|---------------------|
| **Learner name** | Client record (`first_name` + `last_name` or org convention) |
| **Organization name** | Current org |
| **Assessment name** | Assessment label or client + date convention |
| **Assessment pack title** | From `LearnerMapProfile.metadata.packTitle` (+ version) |
| **Cycle range** | From profile cycles (e.g. `Cycles 1–3`) |
| **Generated date** | Export preview generation timestamp (locale-formatted) |

**No** `isMockData: true` in production. Mock banner must not render.

---

## 15. Non-goals

PR10 must **not** include:

| Non-goal |
|----------|
| Dedicated **PDF engine** |
| **Report R2** embedding |
| **Parent-friendly** export variant |
| **Compact matrix** mode |
| **Target × Cycle** orientation toggle |
| **Changed-targets-only** appendix |
| **Unscored-targets-only** appendix |
| **AI narratives** or **treatment recommendations** |
| **L2 orientation / scroll** clinician toggles (PR6 §6.1) |

---

## 16. PR10 implementation scope

**PR10 — Production export UX & real data wiring**

| # | Deliverable |
|---|-------------|
| 1 | **Production export action** — “Export Learner Map” in assessment/Learner Map area (§2) |
| 2 | **Availability gating** — ≥2 cycles, scored data, profile build, permissions (§3) |
| 3 | **Export dialog** — mode selection, explanations, warnings (§4–§9) |
| 4 | **Selected Domains checklist** — select all / clear all, validation (§7) |
| 5 | **Full Mode confirmation** — warning copy §8 |
| 6 | **Production export preview route** — real profile + displayContext (§11) |
| 7 | **Print guidance** — §12 copy in preview chrome |
| 8 | **Error states** — §13 |
| 9 | **Reuse** — `LearnerMapExportView`, `LearnerMapExportMode`, appendix components unchanged in semantics |

**Out of PR10:** PDF engine, Report integration, deferred §18 items.

---

## 17. Acceptance criteria for PR10

PR10 is complete when:

### Visibility & gating

- [ ] **Export Learner Map** visible only when assessment has **≥ 2 cycles** and profile can be built with scored data  
- [ ] Export **hidden/disabled** for single-cycle assessments with clear messaging  
- [ ] Dev route remains dev-only; production uses separate preview route  

### Dialog & modes

- [ ] **Standard** is default on dialog open  
- [ ] All three modes available with accurate include/exclude descriptions  
- [ ] **Selected Domains:** checklist in assessment order; **Select all / Clear all** work  
- [ ] **Selected Domains:** export disabled with helper text when zero domains selected  
- [ ] **All domains selected:** nudge shown; user **not** forced to Full  
- [ ] **Full Mode:** warning shown; user must acknowledge before preview  
- [ ] **Large assessment:** stronger Full warning when thresholds met  

### Preview & data

- [ ] Export preview uses **real** `LearnerMapProfile` and **real** `LearnerMapDisplayContext`  
- [ ] **No dev chrome** or mock banners in production preview  
- [ ] Preview shows mode + selected domains in non-print UI  
- [ ] Print guidance §12 visible in preview  
- [ ] Printed document matches validated Standard / Selected / Full layouts  

### Quality

- [ ] Build passes  
- [ ] Existing Learner Map / export tests pass  
- [ ] Manual QA: small + large assessment × three modes in **Chrome** print  

---

## 18. Deferred roadmap

Post-PR10 enhancements (separate specs/PRs):

| Item | Notes |
|------|--------|
| **Appendix target index** | Navigation aid for large Full exports |
| **Page estimate improvements** | Predict PDF page count |
| **Direct export from L1 domain row** | “Export this domain” shortcut → Selected Domains prefill |
| **Saved export presets** | Remember mode + domain selection |
| **Dedicated PDF engine** | Server or client library |
| **Report R2 embed** | Summary/Standard blocks in unified report |
| **Summary Mode** (PR6) | Compact export without full reference cards — if still desired |
| **Changed / unscored appendix filters** | PR9.8 §11 |

---

## 19. Final recommendation

| Question | Answer |
|----------|--------|
| **Should PR10 proceed after this spec?** | **Yes.** PR10 should implement **production export UX** and **real data wiring** exactly as specified here, reusing validated export view and appendix components from PR7–PR9.11. |
| **Clinical readiness** | PR9.11 validated export content; PR10 is **access and wiring**, not a redesign. |
| **Default user promise** | **Standard Mode** — supervision-ready export without accidental full appendix. |
| **Risk** | Large Full exports — mitigated by warnings §8–§9 and Chrome guidance §12. |

### SPM sign-off checklist

- [ ] Entry point location confirmed (assessment vs Learner Map screen)  
- [ ] ≥2-cycle rule confirmed  
- [ ] Dialog copy §7–§8 approved  
- [ ] Continue to Export Preview flow approved (no auto-print on load)  
- [ ] PR10 scope §16 confirmed; §15 non-goals acknowledged  

---

## Appendix A — End-to-end production flow

```text
Assessment (≥2 cycles, scored)
    → Export Learner Map
    → Dialog (Standard default)
         → [Optional: select domains / confirm Full]
    → Continue to Export Preview (real data)
    → User: Print / Save as PDF (Chrome)
```

## Appendix B — Related documents

- [`export_foundation.md`](./export_foundation.md) — export philosophy, pagination, L2 orientation  
- [`../../archive/product/learner_map_pr9_8_domain_selected_appendix_specification.md`](../../archive/product/learner_map_pr9_8_domain_selected_appendix_specification.md) — PR9.8 (superseded; see §7)  
- [`../../operations/alpha_runbook.md`](../../operations/alpha_runbook.md) — Chrome print expectations  

---

_Document steward: Documentation / Overseer. Update after PR10 ships or UX learnings from AIM/production pilot._
