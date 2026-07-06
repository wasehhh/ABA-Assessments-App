# Security and roles

Auth, authorization, and RLS expectations for Evalis. For workflow-level role behavior see [`../product/assessment_lifecycle.md`](../product/assessment_lifecycle.md).

---

## Authentication

| Topic | Current implementation |
|-------|-------------------------|
| **Provider** | Supabase Auth (GoTrue) |
| **Methods** | Email/password; invite RPCs for org join |
| **Session** | Browser JWT via `@supabase/supabase-js` |
| **Alpha note** | Email confirmation settings affect signup bootstrap — see [`supabase_setup.md`](./supabase_setup.md) §2.1 |

---

## Roles (application)

Stored on **`user_profiles.role`** (not a separate `users` table in current schema):

| Role | Typical capabilities |
|------|----------------------|
| **admin** | Org settings, invites, packs, review/approve, audit log |
| **senior_therapist** | Clients, packs, review/approve, edit submitted work |
| **therapist** | Score, submit; cannot edit after submit |
| **viewer** | Read-only |

Exact UI gates vary by screen; lifecycle doc is authoritative for assessment states.

---

## Row Level Security (RLS)

- Enabled on tenant tables (`organizations`, `user_profiles`, `clients`, `content_packs`, `assessments`, scores, cycles, `audit_logs`, etc.).
- Policies tie access to **`auth.uid()`** and **`org_id`**.
- **Alpha caveat:** Some lifecycle rules (post-submit edit lock) are enforced in the **app**; do not assume RLS alone matches all product rules until hardened.

Provisioning and RPC requirements: [`supabase_setup.md`](./supabase_setup.md).

---

## Audit logging

- `audit_logs` table; admin-visible policies per supplemental SQL.
- Application writes via `auditService` for selected actions.

---

## Alpha security posture

- Controlled test users; app-level enforcement acceptable for Alpha.
- Do **not** overclaim HIPAA/production compliance from documentation alone.

---

## Related

- [`data_access.md`](./data_access.md)  
- [`../audits/complete_codebase_audit_2026_06_10.md`](../audits/complete_codebase_audit_2026_06_10.md) — known gaps (RLS vs UI, profile update policy)

---

_Last reviewed: 2026-06-10._
