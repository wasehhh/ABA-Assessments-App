# Learner Map documentation

Longitudinal competency visualization and **export/print** specifications for Evalis.

**Code:** `frontend/src/services/learnerMapProfile.ts`, `frontend/src/components/learnerMap/`, export under `components/learnerMap/export/`.

**Dev preview:** `#/dev/learner-map`, `#/dev/learner-map-export` (development only).

---

## Architecture (layers)

| Layer | Purpose | Key artifacts |
|-------|---------|----------------|
| **L0** | Assessment rollup | `LearnerMapAssessmentRollup`, totals |
| **L1** | Domain Competency Summary (primary supervision) | `LearnerMapDomainSummary` |
| **L2** | Cycle × Target detail (supporting) | `LearnerMapDomainSection` / appendix export |

Data model: **`LearnerMapProfile`** built by `buildLearnerMapProfile()` — single source for in-app and export.

---

## Export specifications (canonical)

| Document | When to use |
|----------|-------------|
| [**export_foundation.md**](./export_foundation.md) | Export philosophy, Standard/Full modes, pagination, L2 orientation/scroll, browser print |
| [**export_production_ux.md**](./export_production_ux.md) | **PR10** production dialog, availability (≥2 cycles), three modes including Selected Domains |

**Export modes (production):**

1. **Standard** (default) — L0 + L1 + reference cards, no L2  
2. **Selected Domains** — Standard + L2 appendix for chosen domains only  
3. **Full** — Standard + L2 for all domains (explicit opt-in + warnings)

**Superseded milestone spec (archive):** [PR9.8 Selected Domains](../../archive/product/learner_map_pr9_8_domain_selected_appendix_specification.md) — content merged into production UX spec §7.

---

## Related product docs

- [`../assessment_lifecycle.md`](../assessment_lifecycle.md) — assessment workflow (separate from Learner Map)  
- [`../visualization/layer_2_visualization_strategy.md`](../visualization/layer_2_visualization_strategy.md) — Assessment Landscape (different feature)  
- [`../../operations/alpha_runbook.md`](../../operations/alpha_runbook.md) — Chrome print guidance  

---

_Last reviewed: 2026-06-10._
