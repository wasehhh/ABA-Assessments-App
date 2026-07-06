# Learner Map Alpha Readiness Summary

**Scope:** Learner Map Export V1 (post–PR10.3B)  
**Date:** June 2026  
**Companion docs:** [`alpha_validation_report_2026_06.md`](./alpha_validation_report_2026_06.md) · [`../product/learner_map/README.md`](../product/learner_map/README.md) · [`alpha_smoke_test_plan.md`](./alpha_smoke_test_plan.md) §I2

---

## 1. Status

**Learner Map Export V1 is Alpha-ready with minor limitations.**

Production export workflow, clinical semantics, and print path are validated. Remaining gaps are documented, non-blocking, and appropriate for controlled AIM Alpha use.

---

## 2. Validated Capabilities

The following were validated for Alpha:

| Capability | Validated |
|------------|-----------|
| Native Learner Map route | ✅ |
| Production export workflow | ✅ |
| Standard export | ✅ |
| Selected Domains export | ✅ |
| Full export | ✅ |
| Print / Save PDF | ✅ |
| Target-based coverage | ✅ |
| Latest target-state distribution | ✅ |
| Latest target movement | ✅ |
| Cycle dates | ✅ |
| Sparse domain empty-state | ✅ |
| Domain identity colors | ✅ |
| Competency color consistency | ✅ |
| Export gating | ✅ |
| Full export acknowledgment | ✅ |
| Export URL hardening | ✅ |
| Error / availability messaging | ✅ |
| Print hardening | ✅ |

---

## 3. Clinical Semantics

Approved semantics for Alpha (in-app and export must match):

| Metric | Definition |
|--------|------------|
| **Coverage** | Unique targets with at least one score ÷ total targets in scope |
| **Score Distribution** | Latest **scored state** per target; never-scored targets count as **Unscored** |
| **Movement** | Latest movement per target (target-level, not cell-based) |

**Export availability**

- Requires **≥ 2 cycles** and **≥ 1 target assessed** (scored data must exist somewhere in the longitudinal record).

**Latest cycle blank**

- Export remains valid when **historical scored data exists**, even if the newest cycle is partially or entirely unscored.
- **Reason:** Learner Map is a **longitudinal record**, not a current-cycle-only artifact. (Founder / SPM decision.)

---

## 4. Export Modes

| Mode | Contents | When to use |
|------|----------|-------------|
| **Standard** | L0 rollup + L1 Domain Competency Summary + reference cards; **no** target-level appendix | **Default** supervision artifact |
| **Selected Domains** | Standard body + L2 target-level appendix for **chosen domains only** | Focused deep-dive on specific domains |
| **Full** | Standard body + L2 appendix for **all domains** | Complete longitudinal detail; requires explicit acknowledgment |

**Hierarchy rationale:** Progressive disclosure — most supervision needs are met by Standard; Selected Domains adds focused detail; Full is an explicit opt-in for large outputs.

---

## 5. Known Non-Blocking Limitations

| Limitation | Notes |
|------------|-------|
| Browser print only | No in-app or server PDF engine |
| No exact page count | Segment estimates are indicative |
| Chrome recommended | Primary sign-off path for print / Save as PDF |
| Full acknowledgment is session-scoped | Re-entering export may require acknowledgment again |
| Selected Domains malformed URL | May safely fall back to **Standard** |
| Latest state semantics | Uses latest **scored** cycle per target, not necessarily the newest calendar cycle |
| No Report R2 integration | Planned; Learner Map profile reuse deferred |
| No target index | Appendix uses existing target identifiers; no separate index page |

---

## 6. Alpha Monitoring Items

During AIM Alpha, observe and capture feedback on:

- Whether BCBAs understand **Standard vs Selected Domains vs Full**
- Whether **target codes in the appendix** are sufficient for clinical reference
- Whether **cycle dates** are meaningful enough for supervision context
- Whether **print length** is acceptable in real sessions (especially Full mode)
- Whether **L1 alone** answers typical supervision questions without appendix
- Whether users **actually need Full mode** often — or rarely
- Whether **Selected Domains** becomes the preferred workflow over Full

Record observations in the Alpha feedback channel; do not treat single-user preference as a product mandate without pattern confirmation.

---

## 7. Recommendation

**Proceed to AIM Alpha use and validation with Learner Map enabled**, subject to broader Alpha workflow sign-off for notes, lifecycle, roles, Assessment Report, and CSV/PDF artifacts (see [`alpha_validation_report_2026_06.md`](./alpha_validation_report_2026_06.md)).

**Do not add new Learner Map features before Alpha** unless a **blocker** is found during live use.

---

_Last reviewed: June 2026 (post–PR10.3B)._
