# Evalis documentation

Development-focused documentation for building, testing, shipping, and operating **Evalis** (ABA Assessment Platform SPA).

**Governance:** If a document does not help engineers, QA, or implementers, it belongs in [`archive/`](./archive/) — not here.

---

## Start here

| Role | Read first |
|------|------------|
| **Developer** | [`guides/setup_guide.md`](./guides/setup_guide.md) → [`architecture/overview.md`](./architecture/overview.md) |
| **QA / Alpha** | [`operations/alpha_smoke_test_plan.md`](./operations/alpha_smoke_test_plan.md) |
| **Product / Builder** | [`roadmap/README.md`](./roadmap/README.md) → relevant `product/` spec |

---

## Canonical index

### Product

| Document | Purpose |
|----------|---------|
| [`product/assessment_lifecycle.md`](./product/assessment_lifecycle.md) | Submit/approve/role rules (Alpha) |
| [`product/ip_and_content_policy.md`](./product/ip_and_content_policy.md) | Content-agnostic / no publisher cloning |
| [`product/learner_map/README.md`](./product/learner_map/README.md) | Learner Map + export specs index |
| [`product/visualization/layer_2_visualization_strategy.md`](./product/visualization/layer_2_visualization_strategy.md) | Future Assessment Landscape (Layer 2) |

### Architecture

| Document | Purpose |
|----------|---------|
| [`architecture/overview.md`](./architecture/overview.md) | **Current stack** (Vite + Supabase) |
| [`architecture/supabase_setup.md`](./architecture/supabase_setup.md) | DB apply order, Alpha env |
| [`architecture/database_schema.md`](./architecture/database_schema.md) | Tables / ERD (conceptual) |
| [`architecture/data_access.md`](./architecture/data_access.md) | Browser → Supabase client patterns |
| [`architecture/security_and_roles.md`](./architecture/security_and_roles.md) | Auth, RLS, RBAC |

### Roadmap

| Document | Purpose |
|----------|---------|
| [`roadmap/README.md`](./roadmap/README.md) | Phase status snapshot |
| [`roadmap/aim_alpha_readiness_plan.md`](./roadmap/aim_alpha_readiness_plan.md) | Alpha scope & constraints |
| [`roadmap/phase_0_cleanup_tracker.md`](./roadmap/phase_0_cleanup_tracker.md) | Phase 0 checklist (mostly complete) |

### Operations

| Document | Purpose |
|----------|---------|
| [`operations/alpha_runbook.md`](./operations/alpha_runbook.md) | Clinician Alpha walkthrough |
| [`operations/alpha_smoke_test_plan.md`](./operations/alpha_smoke_test_plan.md) | Manual smoke matrix |
| [`operations/qa_regression_checklist.md`](./operations/qa_regression_checklist.md) | Living regression pointers |

### Audits

| Document | Purpose |
|----------|---------|
| [`audits/README.md`](./audits/README.md) | Which audit is current |
| [`audits/complete_codebase_audit_2026_06_10.md`](./audits/complete_codebase_audit_2026_06_10.md) | Latest technical audit |
| [`audits/documentation_housekeeping_execution_report.md`](./audits/documentation_housekeeping_execution_report.md) | Doc cleanup execution log (2026-06-10) |

### Guides

| Document | Purpose |
|----------|---------|
| [`guides/setup_guide.md`](./guides/setup_guide.md) | Local dev setup |

---

## Archive

Historical missions, research, superseded architecture (Next.js/FastAPI era), and point-in-time QA: [`archive/README.md`](./archive/README.md).

**Not in this repo:** commercialization strategy, fundraising, partnership history, founder notes — keep in external second brain (Obsidian).

---

_Last reviewed: 2026-06-10 (documentation housekeeping execution)._
