# Documentation Housekeeping Execution Report

**Date:** 2026-06-10  
**Source plan:** [`documentation_housekeeping_audit_2026_06_10.md`](./documentation_housekeeping_audit_2026_06_10.md)  
**Scope:** Documentation only — no application code modified.

---

## Executive summary

Documentation housekeeping for Evalis is **complete**. The repository now has a lean, development-focused structure with **22 active canonical documents** (plus this report = 23 in the active tree) and **38 archived** historical files under `docs/archive/`.

Key outcomes:

- **Architecture truth pass:** Obsolete Next.js / FastAPI / Server Actions / Vercel docs moved to archive; new Vite + Supabase canonical docs in `architecture/`.
- **Learner Map export path:** Single index at `product/learner_map/README.md` with two active specs (`export_foundation`, `export_production_ux`); PR9.8 archived.
- **Operations consolidation:** Alpha runbook and smoke plan under `operations/`.
- **Business/strategy demotion:** `strategy/system_risk_and_readiness.md` archived per SPM (commercialization belongs outside repo).
- **Zero deletions:** All files preserved in `docs/archive/`.

---

## 1. Canonical structure created

| Path | Status |
|------|--------|
| [`../README.md`](../README.md) | **Created** — master index + governance |
| [`../archive/`](../archive/) | **Created** — read-only history with [`../archive/README.md`](../archive/README.md) |
| [`../roadmap/README.md`](../roadmap/README.md) | **Created** — phase status snapshot |
| [`../architecture/overview.md`](../architecture/overview.md) | **Created** — current Vite + Supabase stack |
| [`../architecture/data_access.md`](../architecture/data_access.md) | **Created** — merged from `api_reference` + client patterns |
| [`../architecture/security_and_roles.md`](../architecture/security_and_roles.md) | **Created** — merged from archived auth doc + lifecycle roles |
| [`../product/learner_map/README.md`](../product/learner_map/README.md) | **Created** — Learner Map + export index |
| [`../product/ip_and_content_policy.md`](../product/ip_and_content_policy.md) | **Created** — engineering guardrails (extract from research) |
| [`../audits/README.md`](../audits/README.md) | **Created** — current vs superseded audits |
| [`../operations/qa_regression_checklist.md`](../operations/qa_regression_checklist.md) | **Created** — living QA pointers |

---

## 2. Files moved (archive)

All moves preserve subpaths under `docs/archive/`. **No files deleted.**

### Missions → `archive/missions/` (7 files)

| From | To |
|------|-----|
| `docs/missions/mission_002_pivot_builder.md` | `docs/archive/missions/mission_002_pivot_builder.md` |
| `docs/missions/mission_003_qa.md` | `docs/archive/missions/mission_003_qa.md` |
| `docs/missions/mission_004_docs.md` | `docs/archive/missions/mission_004_docs.md` |
| `docs/missions/mission_005_cycle_schema.md` | `docs/archive/missions/mission_005_cycle_schema.md` |
| `docs/missions/mission_006_score_criteria.md` | `docs/archive/missions/mission_006_score_criteria.md` |
| `docs/missions/mission_007_remediation.md` | `docs/archive/missions/mission_007_remediation.md` |
| `docs/missions/mission_008_resilience.md` | `docs/archive/missions/mission_008_resilience.md` |

### Reports → `archive/reports/` (3 files)

| From | To |
|------|-----|
| `docs/reports/system_audit_20251211.md` | `docs/archive/reports/system_audit_20251211.md` |
| `docs/reports/qa/qa_report_builder_pivot.md` | `docs/archive/reports/qa/qa_report_builder_pivot.md` |
| `docs/reports/security/security_review_2025-12-10.md` | `docs/archive/reports/security/security_review_2025-12-10.md` |

### QA → `archive/qa/` (6 files)

| From | To |
|------|-----|
| `docs/qa/README.md` | `docs/archive/qa/README.md` |
| `docs/qa/architecture_consistency_report.md` | `docs/archive/qa/architecture_consistency_report.md` |
| `docs/qa/assessment_workflow_test_plan.md` | `docs/archive/qa/assessment_workflow_test_plan.md` |
| `docs/qa/bug_report_scoring_hardcoding.md` | `docs/archive/qa/bug_report_scoring_hardcoding.md` |
| `docs/qa/bug_report_unsecured_backend.md` | `docs/archive/qa/bug_report_unsecured_backend.md` |
| `docs/qa/framework_upload_test_plan.md` | `docs/archive/qa/framework_upload_test_plan.md` |

### Research → `archive/research/` (7 files)

| From | To |
|------|-----|
| `docs/research/aba_assessments.md` | `docs/archive/research/aba_assessments.md` |
| `docs/research/competitor_analysis.md` | `docs/archive/research/competitor_analysis.md` |
| `docs/research/copyright_and_ip.md` | `docs/archive/research/copyright_and_ip.md` |
| `docs/research/legal_compliance.md` | `docs/archive/research/legal_compliance.md` |
| `docs/research/strategic_recommendations.md` | `docs/archive/research/strategic_recommendations.md` |
| `docs/research/technical_security.md` | `docs/archive/research/technical_security.md` |
| `docs/research/ux_guidelines.md` | `docs/archive/research/ux_guidelines.md` |

### Specs → `archive/specs/` (3 files)

| From | To |
|------|-----|
| `docs/specs/master_app_specification.md` | `docs/archive/specs/master_app_specification.md` |
| `docs/specs/app_page_breakdown.md` | `docs/archive/specs/app_page_breakdown.md` |
| `docs/specs/agent_roles_and_interactions.md` | `docs/archive/specs/agent_roles_and_interactions.md` |

### Architecture (obsolete stack) → `archive/architecture/` (4 files)

| From | To |
|------|-----|
| `docs/architecture/system_overview.md` | `docs/archive/architecture/system_overview.md` |
| `docs/architecture/frontend_architecture.md` | `docs/archive/architecture/frontend_architecture.md` |
| `docs/architecture/api_architecture.md` | `docs/archive/architecture/api_architecture.md` |
| `docs/architecture/auth_and_security.md` | `docs/archive/architecture/auth_and_security.md` |

### Other archive moves

| From | To | Notes |
|------|-----|-------|
| `docs/guides/getting_started.md` | `docs/archive/guides/getting_started.md` | Superseded by `setup_guide.md` |
| `docs/roadmap/phase_1_tracker.md` | `docs/archive/roadmap/phase_1_tracker.md` | Phase 1 complete |
| `docs/audits/current_state_audit_2026_05_02.md` | `docs/archive/audits/current_state_audit_2026_05_02.md` | Superseded by June audit |
| `docs/strategy/system_risk_and_readiness.md` | `docs/archive/strategy/system_risk_and_readiness.md` | SPM: commercialization out of repo |
| `docs/project_handoff.md` | `docs/archive/project_handoff.md` | Stale overseer prompt |
| `docs/api/api_reference.md` | `docs/archive/api/api_reference.md` | Folded into `data_access.md` |
| `docs/product/learner_map_pr9_8_domain_selected_appendix_specification.md` | `docs/archive/product/learner_map_pr9_8_domain_selected_appendix_specification.md` | Merged into PR9.12 §7 |

**Total archived moves: 38 files** (including archive README).

---

## 3. Files relocated (active tree reorganization)

These remain **active** but moved to canonical locations:

| From | To |
|------|-----|
| `docs/alpha/alpha_runbook.md` | `docs/operations/alpha_runbook.md` |
| `docs/alpha/alpha_smoke_test_plan.md` | `docs/operations/alpha_smoke_test_plan.md` |
| `docs/visualization/layer_2_visualization_strategy.md` | `docs/product/visualization/layer_2_visualization_strategy.md` |
| `docs/product/learner_map_v1_pr6_export_print_specification.md` | `docs/product/learner_map/export_foundation.md` |
| `docs/product/learner_map_pr9_12_production_export_ux_specification.md` | `docs/product/learner_map/export_production_ux.md` |

**Removed empty top-level folders:** `alpha/`, `visualization/`, `missions/`, `reports/`, `research/`, `specs/`, `strategy/`, `qa/`, `api/`, `packs/`.

---

## 4. Consolidations performed

| Sources | Canonical result | Action on sources |
|---------|------------------|-------------------|
| `guides/getting_started.md` | `guides/setup_guide.md` | getting_started → archive |
| `architecture/system_overview.md` + `frontend_architecture.md` | `architecture/overview.md` | Both → archive |
| `architecture/api_architecture.md` + `api/api_reference.md` | `architecture/data_access.md` | Both → archive |
| `architecture/auth_and_security.md` + role matrix in `assessment_lifecycle.md` | `architecture/security_and_roles.md` | auth doc → archive; lifecycle retained |
| `research/copyright_and_ip.md` + viz strategy §8 themes | `product/ip_and_content_policy.md` | Full research → archive |
| `learner_map_v1_pr6` + `pr9_8` + `pr9_12` | `product/learner_map/README.md` + 2 specs | PR9.8 → archive; renamed foundation + production UX |
| `roadmap/phase_0` + `phase_1` | `roadmap/README.md` | phase_1 → archive |
| `qa/assessment_workflow_test_plan.md` + `alpha_smoke_test_plan.md` | `operations/qa_regression_checklist.md` | workflow plan → archive |
| `audits/current_state` + `complete_codebase` | `audits/README.md` | May audit → archive |
| `specs/master_app_specification.md` | Banner only (no wholesale merge) | → archive with superseded banner |

---

## 5. Files retained (active canonical set)

```
docs/README.md
docs/architecture/data_access.md
docs/architecture/database_schema.md          # conceptual banner added
docs/architecture/overview.md
docs/architecture/security_and_roles.md
docs/architecture/supabase_setup.md
docs/audits/README.md
docs/audits/complete_codebase_audit_2026_06_10.md
docs/audits/documentation_housekeeping_audit_2026_06_10.md
docs/audits/documentation_housekeeping_execution_report.md
docs/guides/setup_guide.md
docs/operations/alpha_runbook.md
docs/operations/alpha_smoke_test_plan.md
docs/operations/qa_regression_checklist.md
docs/product/assessment_lifecycle.md
docs/product/ip_and_content_policy.md
docs/product/learner_map/README.md
docs/product/learner_map/export_foundation.md
docs/product/learner_map/export_production_ux.md
docs/product/visualization/layer_2_visualization_strategy.md
docs/roadmap/README.md
docs/roadmap/aim_alpha_readiness_plan.md     # Immediate Next Step refreshed
docs/roadmap/phase_0_cleanup_tracker.md
```

**Count:** 23 active markdown files (including this report and pre-execution audit).

---

## 6. Architecture truth pass

| Obsolete concept | Disposition |
|------------------|-------------|
| Next.js App Router / Server Actions | Archived in `archive/architecture/` |
| FastAPI / Python backend | Archived in `archive/reports/`, `archive/qa/` |
| Vercel deployment assumptions | Archived with frontend/system overview docs |
| `@supabase/ssr` / wrong table names in auth doc | Replaced by `security_and_roles.md` |

**Current canonical architecture:** Vite SPA → `@supabase/supabase-js` → Supabase Auth + Postgres RLS. See [`../architecture/overview.md`](../architecture/overview.md).

---

## 7. Learner Map documentation pass

| Document | Role |
|----------|------|
| [`../product/learner_map/README.md`](../product/learner_map/README.md) | Single entry point — layers, code paths, export index |
| [`../product/learner_map/export_foundation.md`](../product/learner_map/export_foundation.md) | PR6 foundation — modes, pagination, L2 orientation |
| [`../product/learner_map/export_production_ux.md`](../product/learner_map/export_production_ux.md) | PR9.12 / PR10 production dialog UX |
| [`../archive/product/learner_map_pr9_8_...`](../archive/product/learner_map_pr9_8_domain_selected_appendix_specification.md) | Archived — content in production UX §7 |

Internal cross-links in export specs updated to `operations/`, `product/visualization/`, and renamed sibling files.

---

## 8. Light content updates

| File | Change |
|------|--------|
| `architecture/database_schema.md` | Banner: conceptual; `supabase_setup.md` is apply truth |
| `roadmap/aim_alpha_readiness_plan.md` | Immediate Next Step → `roadmap/README.md` + PR10 spec |
| `archive/specs/master_app_specification.md` | Historical superseded banner |
| `product/learner_map/export_foundation.md` | Fixed Appendix B links |
| `product/learner_map/export_production_ux.md` | Fixed parent spec + Appendix B links |

---

## 9. Metrics

| Metric | Before (audit) | After |
|--------|----------------|-------|
| Files in daily reference set | ~49 | **23** active |
| Archived files | 0 | **38** |
| Architecture docs contradicting stack (active) | 4 | **0** |
| Duplicate onboarding guides (active) | 2 | **1** (`setup_guide.md`) |
| Active Learner Map export specs | 3 (flat) | **2 + index** |

---

## 10. Unresolved questions

1. **`phase_0_cleanup_tracker.md` retention** — Audit suggested archiving after Alpha sign-off. Kept active because P1 items §9/§11 remain open. Archive when Alpha closes.

2. **`database_schema.md` drift** — Marked conceptual only; full refresh against live migrations not done (would require code/schema diff pass).

3. **Archive internal links** — Historical docs in `archive/` still reference old paths (`docs/alpha/`, `docs/specs/`). Acceptable for read-only history; optional follow-up link-rewrite in archive only.

4. **`complete_codebase_audit_2026_06_10.md` stale note** — Still mentions `docs/alpha/alpha_smoke_test_plan.md` as untracked; file now at `operations/alpha_smoke_test_plan.md`. Minor; update on next audit refresh.

5. **Assessment Builder / content pack specs** — No dedicated active product spec beyond architecture + lifecycle. Acceptable for Alpha; add when Builder UX stabilizes post-PR10.

---

## 11. Recommendations (ongoing governance)

1. **Use [`../README.md`](../README.md)** as the only entry point for new contributors and agents.
2. **Archive milestone specs** within one release after merge into canonical (PR9.x pattern).
3. **Stack changes** must update `architecture/overview.md` in the same PR as code.
4. **Quarterly 30-min doc review** — archive anything not opened in 90 days.
5. **No new top-level `docs/` folders** without README justification.
6. **Keep commercialization / founder / partnership content in Obsidian** — do not reintroduce `docs/strategy/` to active tree.
7. **After PR10 ships** — confirm production export route in smoke plan + regression checklist; no further export spec proliferation.

---

## 12. Constraints verified

- [x] No application code modified  
- [x] Roadmap priorities unchanged (wording-only refresh in readiness plan)  
- [x] No new business-strategy documentation in active tree  
- [x] No files deleted — all history in `docs/archive/`  

---

_Execution completed: 2026-06-10._
