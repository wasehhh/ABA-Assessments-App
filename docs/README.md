# Evalis documentation

Development-focused documentation for building, testing, shipping, and operating **Evalis** (ABA Assessment Platform SPA).

**Governance:** If a document does not help engineers, QA, or implementers, it belongs in archive — not here.

---

## Start here

| Role | Read first |
|------|------------|
| **Developer** | [`guides/setup_guide.md`](./guides/setup_guide.md) → [`architecture/overview.md`](./architecture/overview.md) |
| **QA / Alpha** | [`operations/qa_regression_checklist.md`](./operations/qa_regression_checklist.md) |
| **Product / Builder** | [`product/assessment_lifecycle.md`](./product/assessment_lifecycle.md) → relevant `product/` spec |

---

## Canonical index

### Product

| Document | Purpose |
|----------|---------|
| [`product/assessment_lifecycle.md`](./product/assessment_lifecycle.md) | Submit/approve/role rules (Alpha) |
| [`product/ip_and_content_policy.md`](./product/ip_and_content_policy.md) | Content-agnostic / no publisher cloning |
| [`product/assessment_snapshot_v1_specification.md`](./product/assessment_snapshot_v1_specification.md) | Assessment Snapshot V1 specification |

### Architecture

| Document | Purpose |
|----------|---------|
| [`architecture/overview.md`](./architecture/overview.md) | **Current stack** (Vite + Supabase) |
| [`architecture/supabase_setup.md`](./architecture/supabase_setup.md) | DB apply order, Alpha env |
| [`architecture/database_schema.md`](./architecture/database_schema.md) | Tables / ERD (conceptual) |
| [`architecture/data_access.md`](./architecture/data_access.md) | Browser → Supabase client patterns |
| [`architecture/security_and_roles.md`](./architecture/security_and_roles.md) | Auth, RLS, RBAC |

### Operations

| Document | Purpose |
|----------|---------|
| [`operations/qa_regression_checklist.md`](./operations/qa_regression_checklist.md) | Living regression pointers |
| [`operations/assessment_snapshot_print_qa.md`](./operations/assessment_snapshot_print_qa.md) | Snapshot print QA checks |

### Guides

| Document | Purpose |
|----------|---------|
| [`guides/setup_guide.md`](./guides/setup_guide.md) | Local dev setup |

---

## Archive

This material is maintained outside the repository.

**Not in this repo:** commercialization strategy, fundraising, partnership history, founder notes — keep in external second brain (Obsidian).

---

_Last reviewed: 2026-06-10 (documentation housekeeping execution)._
