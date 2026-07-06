# QA regression checklist

Living pointer for manual regression. Automated tests: `cd frontend && npm run test`.

---

## Before Alpha / release candidate

1. Run full [**alpha_smoke_test_plan.md**](./alpha_smoke_test_plan.md) on target Supabase project (Chrome).
2. Verify Supabase per [**../architecture/supabase_setup.md**](../architecture/supabase_setup.md) checklist.
3. Spot-check **Learner Map export** (Standard + Selected Domains) in dev/staging until PR10 production route ships — see [**../product/learner_map/README.md**](../product/learner_map/README.md).

---

## Core workflow (hash routes)

| Step | Route / area |
|------|----------------|
| Login | `#/login` |
| Clients | `#/clients` |
| Assessments | `#/assessments` |
| Matrix | `#/assessment/:id` |
| Report | `#/report/:id` |

---

## Role checks

See [**../product/assessment_lifecycle.md**](../product/assessment_lifecycle.md) — therapist vs reviewer edit rules after submit.

---

## Archived detailed plans

Superseded QA artifacts: [`../archive/qa/`](../archive/qa/).

---

_Update this checklist when smoke plan or production export routes change._
