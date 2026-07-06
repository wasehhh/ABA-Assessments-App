# Evalis Alpha Validation Report

**Version:** 1.0  
**Date:** June 2026  
**Status:** Canonical Alpha validation record  
**Companion docs:** [`alpha_smoke_test_plan.md`](./alpha_smoke_test_plan.md) · [`alpha_runbook.md`](./alpha_runbook.md) · [`../roadmap/aim_alpha_readiness_plan.md`](../roadmap/aim_alpha_readiness_plan.md)

---

## 1. Purpose

Evalis Alpha validation was conducted to determine whether the platform can support a **real clinical assessment workflow** in a controlled pilot at AIM — without disrupting experienced staff or undermining clinical trust.

**What Alpha was intended to validate**

- End-to-end usability of the core therapist and supervisor path  
- Scoring integrity, notes persistence, and lifecycle controls (submit → review → approve)  
- Reporting and export artifacts suitable for supervision  
- Learner Map as a longitudinal competency record — in-app and printable  
- Absence of workflow **blockers** before inviting clinical users  

**Relationship to AIM pilot preparation**

This validation cycle closes the **pre-pilot engineering gate**. AIM Alpha is a **controlled deployment** with documented constraints (Chrome for print, numeric/yes-no packs only, trusted staff). This report is the authoritative record that those constraints are acceptable and that the product is ready to proceed to **live AIM sessions** and structured feedback collection.

Alpha validation is **not** a claim of production readiness, regulatory certification, or enterprise security hardening.

---

## 2. Scope Tested

### Core Assessment Workflow

| Area | What was exercised |
|------|-------------------|
| **Authentication** | Login, session persistence, org context, invite path |
| **Client management** | Create client, error visibility, assessment creation from client workflow |
| **Assessment execution** | Domain overview, numeric and yes/no scoring, persistence, domain navigation |
| **Target scoring** | Table and modal scoring, toggle/clear, save feedback |
| **Modal workflow** | Open/close, next/previous target, boundary behavior, score sync |
| **Assessment lifecycle** | Submit (complete and unscored warning), post-submit locks, reviewer edit, approve |

Additional coverage: **clinical notes** (per-target persistence, no cross-target leak), **roles & permissions**, and **cycle compare** workflow.

### Reporting

| Area | What was exercised |
|------|-------------------|
| **Assessment Report** | Chrome printable report; Save as PDF; client/pack/domain fidelity |
| **CSV Export** | Matrix export; scores and notes present in downloaded file |

### Learner Map

| Area | What was exercised |
|------|-------------------|
| **Native visualization** | L0 assessment rollup, L1 Domain Competency Summary, L2 cycle × target detail |
| **Standard export** | Supervision artifact without L2 appendix; default mode |
| **Selected Domains export** | Filtered L2 appendix; L1 remains assessment-wide |
| **Full export** | Complete L2 appendix with acknowledgment gate |
| **Print / Save PDF** | User-initiated browser print from export preview (Chrome) |

Validation combined **structured smoke execution** (Phase 1 Go/No-Go tier), **extended workflow passes**, **clinical export QA review** (PR9.11), and **production export implementation** (PR10).

---

## 3. Major Product Areas Validated

| Area | Status | Notes |
|------|--------|-------|
| **Authentication** | ✅ Validated | Login, session, and org context stable for Alpha accounts |
| **Assessment Execution** | ✅ Validated | Numeric and yes/no scoring; persistence across refresh |
| **Clinical Modal** | ✅ Validated | Target navigation, score sync, boundary controls |
| **Notes** | ✅ Validated | Per-target clinical notes; no cross-target contamination |
| **Lifecycle** | ✅ Validated | Submit locks therapist; reviewer edit on submitted; approve locks all |
| **Roles & Permissions** | ✅ Validated | Therapist/reviewer/viewer behavior matches Alpha policy |
| **Assessment Report** | ✅ Validated | Chrome print/PDF suitable for supervisor sign-off |
| **CSV Export** | ✅ Validated | Predictable export scope; scores and notes present |
| **Learner Map** | ✅ Validated | L0/L1/L2 hierarchy; target-based metrics; cycle dates |
| **Learner Map Export** | ✅ Validated | Standard, Selected Domains, and Full modes; print workflow |

---

## 4. Key Findings

### Learner Map

- **L1 distribution** migrated from cell-based to **target-based semantics** — distribution reflects latest target state per domain, not raw cell counts.  
- **Coverage** migrated to **target-based metrics** (Assessment Coverage, Targets Assessed) — aligned with clinical interpretation.  
- **Cycle dates** added to L2 and export appendix where available on record.  
- **Sparse domain handling** added — unscored domains show compact empty-state messaging instead of dash-only matrix pages.  
- **Selected Domains export** validated — appendix filtered correctly; L1 remains assessment-wide.  
- **Full export** validated — complete appendix with acknowledgment gate for large outputs.

### Export UX

- **Standard mode** confirmed as default — appropriate for routine supervision.  
- **Full export acknowledgment** added — explicit opt-in before large appendix generation.  
- **Export estimates** added — domain/target/segment counts before preview.  
- **Print / Save PDF** workflow validated — user-initiated print from preview toolbar in Chrome; no auto-print on load.

### Clinical Clarity

- Removed **record/cell** terminology from user-facing Learner Map surfaces.  
- Replaced with **target-oriented language** (coverage, movement, distribution).  
- Distribution semantics aligned with **latest target state** per domain — consistent between in-app and export.

---

## 5. Issues Identified During Validation

### Resolved During Alpha

| Issue | Resolution |
|-------|------------|
| L1 distribution denominator issue | Migrated to target-based semantics |
| Coverage terminology issue | Target-based coverage metrics; removed “Scored Cells/Records” labels |
| Domain identity visibility | Improved domain headers and L1 identity in map and export |
| Cycle labeling noise | Cycle number + date display; cleaner L2 row labels |
| Competency color inconsistencies | Domain competency color mapping aligned across surfaces |
| Sparse export pages | Empty-state handling for unscored domains in appendix |
| Export UX gaps | Production dialog, mode hierarchy, estimates, acknowledgment, and preview routes |

### Deferred / Future

All items below are **non-blocking** for AIM Alpha:

| Item | Notes |
|------|-------|
| Full export deep-link acknowledgment bypass | Bookmarked `?mode=full` URL may skip dialog checkbox — document and fix post-Alpha |
| Exact page estimation | Segment estimates are indicative; no page-count guarantee |
| In-app PDF engine | Browser print remains the Alpha path |
| Report R2 integration | Learner Map profile reuse planned; not in Alpha scope |
| Future Learner Intelligence layers | Assessment Landscape (Layer 2 visualization) and advanced analytics deferred |

---

## 6. Important Product Decisions

### Learner Map Export Availability

**Decision:** Export remains available when **historical scored data exists** across a meaningful longitudinal record (≥2 cycles with at least some scored targets), even if the **newest cycle is partially or entirely unscored**.

**Reason:** Learner Map is a **longitudinal record**, not a current-cycle-only artifact. Supervisors may need a printable competency summary while a new cycle is still in progress.

**Authority:** Founder / SPM decision — documented for Alpha and PR10 production export.

---

### Learner Map Orientation

**Decision:** Native Learner Map retains **horizontal scrolling** for L2 interactive exploration.

**Reason:** Better for on-screen review of cycle × target matrices during supervision.

**Corollary:** Export appendix remains **paginated** for print — interactive scroll does not carry to paper.

---

### Export Hierarchy

**Standard → Selected Domains → Full**

| Mode | Intent |
|------|--------|
| **Standard** | Default supervision artifact — L0 + L1 + reference cards; no target-level appendix |
| **Selected Domains** | Standard body + L2 appendix for chosen domains only — focused deep-dive |
| **Full** | Standard body + complete L2 appendix — explicit opt-in with size warning |

**Rationale:** Progressive disclosure protects clinicians from accidental large prints while preserving access to full longitudinal detail when needed.

---

## 7. Alpha Readiness Assessment

| Area | Ready for Alpha |
|------|-----------------|
| Assessment Workflow | **Yes** |
| Reporting | **Yes** |
| Learner Map | **Yes** |
| Export Workflow | **Yes** |
| Permissions | **Yes** (app-enforced; trusted Alpha users) |
| Clinical Review | **Yes** |

**Operational constraints for AIM Alpha** (unchanged):

- Google Chrome required for printable reports and Learner Map export  
- Numeric and yes/no packs only  
- No checkbox / task-analysis packs  
- Reviewer edits submitted assessments directly; no return-to-therapist flow  
- Alpha Supabase environment smoke-tested before sessions  

---

## 8. Known Non-Blocking Limitations

- Browser print headers/footers depend on user Chrome settings  
- PDF generation uses **browser print** — no server-side PDF engine  
- Exact page counts not available for Learner Map export  
- Export presets and history not implemented  
- Lifecycle and role rules are **app-enforced** — not full RLS hardening  
- Mobile optimization and full phone workflows out of scope  
- Manual invite link delivery (no automated email in Alpha)  

---

## 9. Final Alpha Recommendation

### **ALPHA READY**

Evalis is **ready to proceed with the AIM Alpha pilot**.

**Basis:**

- **No known blockers** remain in the validated scope  
- **Core workflow** (auth → client → assessment → score → notes → submit → review → approve) validated  
- **Learner Map** and **Learner Map export** (Standard, Selected Domains, Full) validated through clinical export QA and production implementation  
- **Assessment Report** and **CSV export** validated for supervisor use in Chrome  
- Open items are **documented, deferred, and non-blocking**  

Appropriate to invite AIM clinical staff under the documented Alpha constraints and collect structured feedback via the Alpha runbook.

---

## 10. Next Phase

Focus shifts from **pre-pilot validation** to **live Alpha execution**:

| Priority | Description |
|----------|-------------|
| **AIM Alpha execution** | Controlled sessions with 2 experienced AIM staff |
| **Real-user feedback** | Usability, workflow fit, and trust signals from clinicians |
| **PR10+ refinement** | Production export UX learnings from pilot usage |
| **Roadmap continuation** | Report R2, Learner Intelligence / Assessment Landscape, and post-Alpha security hardening per roadmap |

---

_Validation recorded: June 2026. For test procedure detail see [`alpha_smoke_test_plan.md`](./alpha_smoke_test_plan.md). For clinician-facing guidance see [`alpha_runbook.md`](./alpha_runbook.md)._
