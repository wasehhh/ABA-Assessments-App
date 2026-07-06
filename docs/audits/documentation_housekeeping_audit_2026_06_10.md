# Documentation Housekeeping & Consolidation Audit

**Date:** 2026-06-10  
**Scope:** All files under `docs/` (49 documents)  
**Method:** Read headers, cross-reference codebase reality (Vite SPA, Supabase, Learner Map PR7–PR9.12), compare duplication and supersession.  
**Action status:** Recommendations only — **no files moved or deleted in this audit.**

---

## Executive summary

Evalis documentation grew across **Alpha prep**, **Phase 0/1**, **Learner Map export**, and **early multi-agent missions**. Roughly **half** of files are **historically useful but operationally stale** (Next.js-era architecture, removed Python backend, one-shot mission prompts, Dec 2025 QA).

**Target:** ~**18 active canonical documents** + **`docs/archive/`** for history + a single **`docs/README.md`** index (recommended create).

**Estimated active-doc reduction:** **~63%** fewer files in the “daily reference” set (49 → ~18).  
**Estimated maintenance reduction:** **~50–60%** (one canonical per domain, no parallel stale architecture paths).

---

## 1. Documentation inventory

Classification: **ACTIVE** | **CONSOLIDATE** | **ARCHIVE** | **DELETE**

| Path | Class | Rationale |
|------|-------|-----------|
| `product/learner_map_pr9_12_production_export_ux_specification.md` | **ACTIVE** | Current PR10 production UX spec; post–PR9.11 validation |
| `product/learner_map_v1_pr6_export_print_specification.md` | **ACTIVE** | Foundation export philosophy, modes, pagination, L2 orientation/scroll |
| `product/learner_map_pr9_8_domain_selected_appendix_specification.md` | **CONSOLIDATE** | Milestone spec; merge summary into PR9.12 §5/§7 or export index after PR10 ships, then **ARCHIVE** |
| `product/assessment_lifecycle.md` | **ACTIVE** | Alpha lifecycle / role rules reference |
| `visualization/layer_2_visualization_strategy.md` | **ACTIVE** | Future Assessment Landscape; not implemented |
| `roadmap/aim_alpha_readiness_plan.md` | **CONSOLIDATE** | Still referenced; stale “Immediate Next Step”; refresh status + link to trackers |
| `roadmap/phase_0_cleanup_tracker.md` | **CONSOLIDATE** | P0 complete; open P1 items §9/§11 — fold into single `roadmap/status.md` or archive when Alpha closes |
| `roadmap/phase_1_tracker.md` | **ARCHIVE** | All items complete; historical closure note only |
| `strategy/system_risk_and_readiness.md` | **ACTIVE** | Strategic risk register; commercialization gates |
| `architecture/supabase_setup.md` | **ACTIVE** | Operational DB apply order; Alpha env |
| `architecture/database_schema.md` | **CONSOLIDATE** | Useful ERD intent; drift vs `content_packs` / live schema — refresh or mark “conceptual” |
| `architecture/system_overview.md` | **CONSOLIDATE** | Good vision; wrong stack (Next.js/Vercel) — rewrite from Vite reality or replace with short `architecture/overview.md` |
| `architecture/frontend_architecture.md` | **ARCHIVE** | Next.js App Router fiction; contradicts Vite hash SPA |
| `architecture/api_architecture.md` | **ARCHIVE** | Server Actions / Next.js patterns; app is browser → Supabase |
| `architecture/auth_and_security.md` | **CONSOLIDATE** | RBAC intent valid; wrong table names (`users`, `@supabase/ssr`) — merge into refreshed security doc |
| `alpha/alpha_runbook.md` | **ACTIVE** | Clinician-facing Alpha operations |
| `alpha/alpha_smoke_test_plan.md` | **ACTIVE** | QA smoke matrix for Alpha |
| `audits/complete_codebase_audit_2026_06_10.md` | **ACTIVE** | Latest pre-Alpha codebase audit |
| `audits/current_state_audit_2026_05_02.md` | **ARCHIVE** | Detailed page inventory; largely superseded + partially stale post Phase 0/1 |
| `guides/setup_guide.md` | **ACTIVE** | Accurate Evalis/Vite/Supabase developer setup |
| `guides/getting_started.md` | **ARCHIVE** | Duplicates onboarding; says Next.js; superseded by `setup_guide.md` |
| `specs/master_app_specification.md` | **CONSOLIDATE** | Still cited by agents; long, pre–Learner Map, drift — trim to living sections or split “vision” vs “implementation” |
| `specs/app_page_breakdown.md` | **ARCHIVE** | Aspirational product pages (Admin billing, MFA flows); not current Evalis SPA |
| `specs/agent_roles_and_interactions.md` | **ARCHIVE** | Dec 2025 multi-agent playbook; optional keep if agents still used — move to archive |
| `api/api_reference.md` | **CONSOLIDATE** | Thin Supabase pointer; fold into `architecture/data_access.md` or keep as stub |
| `project_handoff.md` | **ARCHIVE** | Overseer handoff prompt; stale state (cycles “pending”, etc.) |
| `missions/mission_002_pivot_builder.md` | **ARCHIVE** | One-shot Builder prompt; pivot complete |
| `missions/mission_003_qa.md` | **ARCHIVE** | One-shot QA mission |
| `missions/mission_004_docs.md` | **ARCHIVE** | One-shot docs mission |
| `missions/mission_005_cycle_schema.md` | **ARCHIVE** | One-shot schema mission |
| `missions/mission_006_score_criteria.md` | **ARCHIVE** | One-shot mission |
| `missions/mission_007_remediation.md` | **ARCHIVE** | One-shot remediation |
| `missions/mission_008_resilience.md` | **ARCHIVE** | One-shot mission |
| `reports/system_audit_20251211.md` | **ARCHIVE** | FastAPI backend era; pre-pivot |
| `reports/qa/qa_report_builder_pivot.md` | **ARCHIVE** | Dec 2025 QA; issues addressed or obsolete |
| `reports/security/security_review_2025-12-10.md` | **ARCHIVE** | Python backend vulnerabilities; historical; themes in `system_risk_and_readiness.md` |
| `qa/README.md` | **CONSOLIDATE** | Update to point at active test plans + archive policy |
| `qa/assessment_workflow_test_plan.md` | **CONSOLIDATE** | Outdated routes; refresh for hash SPA + lifecycle or merge into `operations/qa_regression_checklist.md` |
| `qa/framework_upload_test_plan.md` | **ARCHIVE** | References `parser.py` / Excel backend — obsolete |
| `qa/architecture_consistency_report.md` | **ARCHIVE** | Dec 2025 divergence report; superseded by June audit |
| `qa/bug_report_unsecured_backend.md` | **ARCHIVE** | Backend removed |
| `qa/bug_report_scoring_hardcoding.md` | **ARCHIVE** | Point-in-time bug; verify fixed then archive |
| `research/strategic_recommendations.md` | **ARCHIVE** | Early strategy; Next.js stack |
| `research/competitor_analysis.md` | **ARCHIVE** | Background research |
| `research/ux_guidelines.md` | **ARCHIVE** | Background; UX now in product specs / Phase 1 learnings |
| `research/technical_security.md` | **ARCHIVE** | Background; merge themes into strategy/security refresh |
| `research/legal_compliance.md` | **ARCHIVE** | Background legal research |
| `research/copyright_and_ip.md` | **CONSOLIDATE** | **Keep principles active** — extract 1-page IP guardrails to `product/ip_and_content_policy.md`, archive full research |
| `research/aba_assessments.md` | **ARCHIVE** | Domain background |

**Counts (recommended disposition):**

| Classification | Count |
|----------------|------:|
| ACTIVE (keep as-is or minor refresh) | 12 |
| CONSOLIDATE (then archive source) | 14 |
| ARCHIVE (move to `docs/archive/`) | 23 |
| DELETE | 0 |

*Conservative: **zero deletes**; archive preserves history.*

---

## 2. Recommended folder structure

```text
docs/
├── README.md                          # NEW — index + governance (required)
│
├── product/                           # What we build & ship
│   ├── assessment_lifecycle.md
│   ├── ip_and_content_policy.md       # NEW — extract from research/copyright
│   ├── learner_map/
│   │   ├── README.md                  # NEW — canonical index
│   │   ├── export_foundation.md       # rename/split from v1_pr6 (optional)
│   │   └── export_production_ux.md    # rename from pr9_12 (optional)
│   └── visualization/
│       └── layer_2_visualization_strategy.md
│
├── architecture/                      # How the system works (accurate stack only)
│   ├── overview.md                    # NEW — replace system_overview (Vite + Supabase)
│   ├── supabase_setup.md
│   ├── database_schema.md             # refreshed
│   └── data_access.md                 # NEW — merge api_reference + auth patterns
│
├── roadmap/                           # Where we are going
│   ├── README.md                      # NEW — phase status + links
│   ├── aim_alpha_readiness_plan.md
│   └── phase_0_cleanup_tracker.md     # until Alpha sign-off, then archive
│
├── operations/                        # NEW — runbooks & QA ops
│   ├── alpha_runbook.md               # move from alpha/
│   ├── alpha_smoke_test_plan.md
│   └── qa_regression_checklist.md     # NEW — living QA (optional)
│
├── strategy/                          # Founder / SPM
│   └── system_risk_and_readiness.md
│
├── audits/                            # Point-in-time audits (latest + index)
│   ├── README.md                      # NEW — which audit is current
│   └── complete_codebase_audit_2026_06_10.md
│
├── guides/
│   └── setup_guide.md                 # single developer onboarding
│
└── archive/                           # NEW — read-only history
    ├── README.md                      # NEW — what's here and why
    ├── missions/
    ├── reports/
    ├── qa/
    ├── research/
    ├── specs/
    ├── audits/
    └── roadmap/
```

**Folders to remove after migration:** `alpha/` (→ `operations/`), `visualization/` top-level (→ `product/visualization/`), `api/` (→ `architecture/`), `missions/`, `reports/`, most of `qa/`, `research/`.

---

## 3. Consolidation plan

| Document A | Document B | → Merge into |
|------------|------------|--------------|
| `guides/getting_started.md` | `guides/setup_guide.md` | **`guides/setup_guide.md`** (canonical onboarding); archive getting_started |
| `architecture/system_overview.md` | `architecture/frontend_architecture.md` (facts only) | **`architecture/overview.md`** (new, Vite SPA truth) |
| `architecture/api_architecture.md` | `api/api_reference.md` | **`architecture/data_access.md`** |
| `architecture/auth_and_security.md` | `product/assessment_lifecycle.md` (role matrix) | **`architecture/security_and_roles.md`** (optional split) |
| `research/copyright_and_ip.md` | `visualization/layer_2_visualization_strategy.md` §8 | **`product/ip_and_content_policy.md`** (1–2 pages) |
| `learner_map_v1_pr6_export_print_specification.md` | `learner_map_pr9_8_*` + `pr9_12_*` | **`product/learner_map/README.md`** index linking three; after PR10, fold Selected Domains into PR9.12 and **archive PR9.8** |
| `roadmap/phase_0_cleanup_tracker.md` | `roadmap/phase_1_tracker.md` | **`roadmap/README.md`** status snapshot |
| `roadmap/aim_alpha_readiness_plan.md` | `strategy/system_risk_and_readiness.md` §2 | Update readiness plan **Alpha status** paragraph only |
| `specs/master_app_specification.md` | `specs/app_page_breakdown.md` | **Do not merge wholesale** — archive page breakdown; add “see audits for as-built” banner on master spec |
| `qa/assessment_workflow_test_plan.md` | `alpha/alpha_smoke_test_plan.md` | **`operations/qa_regression_checklist.md`** (post-Alpha living doc) |
| `audits/current_state_audit_2026_05_02.md` | `audits/complete_codebase_audit_2026_06_10.md` | **`audits/README.md`** — “use June 2026 for readiness; May 2026 for page-level history” |

---

## 4. Archive plan

Move to `docs/archive/` preserving subpaths:

**missions/** (8 files)  
- `mission_002_pivot_builder.md` through `mission_008_resilience.md`

**reports/** (3 files)  
- `system_audit_20251211.md`  
- `qa/qa_report_builder_pivot.md`  
- `security/security_review_2025-12-10.md`

**qa/** (5 files)  
- `architecture_consistency_report.md`  
- `bug_report_unsecured_backend.md`  
- `bug_report_scoring_hardcoding.md`  
- `framework_upload_test_plan.md`  
- *(keep `assessment_workflow_test_plan.md` until consolidated, then archive)*

**research/** (7 files) — all  
- `aba_assessments.md`, `competitor_analysis.md`, `copyright_and_ip.md` *(after IP extract)*, `legal_compliance.md`, `strategic_recommendations.md`, `technical_security.md`, `ux_guidelines.md`

**specs/** (2 files)  
- `app_page_breakdown.md`  
- `agent_roles_and_interactions.md` *(optional)*

**architecture/** (3 files)  
- `frontend_architecture.md`  
- `api_architecture.md`  
- *( `system_overview.md` after replacement written)*

**guides/** (1 file)  
- `getting_started.md`

**roadmap/** (1 file)  
- `phase_1_tracker.md` *(after snapshot in roadmap README)*

**audits/** (1 file)  
- `current_state_audit_2026_05_02.md`

**product/** (1 file, timing)  
- `learner_map_pr9_8_domain_selected_appendix_specification.md` — **after PR10 ships** and Selected Domains is fully captured in PR9.12

**root**  
- `project_handoff.md`

**Total archive moves: ~23 files**

---

## 5. Delete plan

**Recommended deletions: none.**

Rationale: every file has historical or audit-trail value. Archiving achieves clutter reduction without losing blameless postmortems or agent history.

**Optional delete (only if duplicate export exists on disk):** none identified.

---

## 6. Canonical documents (minimum authoritative set)

| Domain | Canonical document(s) |
|--------|------------------------|
| **Product strategy** | `strategy/system_risk_and_readiness.md` |
| **Roadmap / phases** | `roadmap/README.md` *(new)* + `roadmap/aim_alpha_readiness_plan.md` |
| **Learner Map (in-app)** | Code + tests; doc index: `product/learner_map/README.md` *(new)* |
| **Learner Map export** | `product/learner_map_v1_pr6_export_print_specification.md` + `product/learner_map_pr9_12_production_export_ux_specification.md` |
| **Architecture** | `architecture/supabase_setup.md` + `architecture/overview.md` *(new)* + `architecture/database_schema.md` *(refreshed)* |
| **Assessment workflow** | `product/assessment_lifecycle.md` |
| **Visualization (future)** | `product/visualization/layer_2_visualization_strategy.md` |
| **Alpha program** | `operations/alpha_runbook.md` + `operations/alpha_smoke_test_plan.md` |
| **Commercialization / gates** | `strategy/system_risk_and_readiness.md` |
| **Developer onboarding** | `guides/setup_guide.md` |
| **Latest technical audit** | `audits/complete_codebase_audit_2026_06_10.md` |
| **IP / content guardrails** | `product/ip_and_content_policy.md` *(new, short)* |

**Demote (no longer canonical):** `specs/master_app_specification.md` — keep as **legacy vision** until trimmed or archived; do not assign new agents here without a “as-built” supplement.

---

## 7. Final recommendation

### Estimated documentation reduction

| Metric | Before | After (target) | Reduction |
|--------|--------|----------------|-----------|
| Files in daily reference set | ~49 | ~18 | **~63%** |
| Architecture docs contradicting stack | 4 | 0 | **100%** |
| Duplicate onboarding guides | 2 | 1 | **50%** |
| Learner Map export specs (active) | 3 | 2 + index | clearer hierarchy |

### Expected maintenance reduction

- **Single onboarding path** (`setup_guide.md`)  
- **One architecture truth** (Vite + Supabase direct client)  
- **One export spec stack** (foundation + production UX + index)  
- **Archive policy** stops rediscovering Dec 2025 backend/Next.js docs  

Estimated ongoing doc maintenance effort: **~50–60% lower** if governance is followed.

### Risks of over-documentation currently present

1. **Wrong-stack architecture** misroutes new agents (Next.js, FastAPI, Server Actions).  
2. **Triple export specs** without index → teams implement against wrong milestone.  
3. **Parallel audits** (May vs June) → conflicting “blocker” lists.  
4. **Master spec + page breakdown** describe product not built → scope creep.  
5. **Mission prompts** read as current work → duplicate completed tasks.  
6. **Research folder** treated as active policy → contradicts Learner Map / export decisions.

### Recommended ongoing governance

1. **`docs/README.md`** — table of canonical docs + “last reviewed” dates.  
2. **One audit index** — latest audit linked; older → `archive/audits/`.  
3. **Spec lifecycle** — milestone specs (PR9.x) → archive within one release after merge into canonical.  
4. **QA policy** — point-in-time QA/reports → **archive after fix verified**; keep one **living** regression checklist in `operations/`.  
5. **Architecture change rule** — any stack change updates `architecture/overview.md` in same PR.  
6. **Quarterly doc review** (30 min SPM + Documentation agent): archive anything not opened in 90 days.  
7. **No new top-level folders** without README justification.

### Suggested execution order (housekeeping PR)

1. Create `docs/archive/` + `docs/README.md`  
2. Move **ARCHIVE** list (no content edits required)  
3. Create `architecture/overview.md` (short, accurate)  
4. Create `product/learner_map/README.md` + `roadmap/README.md`  
5. Extract `product/ip_and_content_policy.md`  
6. Refresh `aim_alpha_readiness_plan.md` “Immediate Next Step”  
7. Banner on `master_app_specification.md`: *“Partially superseded — see audits & product/ for as-built”*

---

_No application code was modified. This audit is recommendations only._
