# Evalis architecture overview

**As-built stack** for the Evalis client application. Supersedes archived Next.js/FastAPI docs in [`../archive/architecture/`](../archive/architecture/).

---

## System shape

```text
Browser (Chrome recommended for print)
    └── Evalis SPA (Vite + React + TypeScript + Tailwind)
            └── @supabase/supabase-js (anon key)
                    └── Supabase Auth + Postgres (RLS) + optional Storage
```

- **No first-party REST API** in this repository — the SPA talks to Supabase directly.
- **Routing:** Hash-based (`#/dashboard`, `#/assessment/:id`, etc.) in `frontend/src/App.tsx`.
- **Branding:** Evalis (in-app); repo folder may differ.

---

## Repository layout (engineering)

| Path | Purpose |
|------|---------|
| `frontend/src/` | React pages, components, services |
| `frontend/supabase/migrations/` | Supabase CLI migration chain |
| Root `database/` / dated SQL | Snapshot and patch SQL (see setup doc) |
| `docs/` | Product, architecture, operations (this tree) |

---

## Core domain modules (frontend)

| Area | Typical paths |
|------|----------------|
| Auth / profile | `services/auth.ts`, `AuthContext` |
| Clients | `services/clients.ts`, `pages/Clients.tsx` |
| Content packs / builder | `services/packs.ts`, `AssessmentBuilder.tsx` |
| Assessments / matrix | `services/assessments.ts`, `AssessmentMatrix.tsx` |
| Analytics / domain profile | `services/analytics.ts`, `domainProfile.ts` |
| Learner Map | `services/learnerMapProfile.ts`, `components/learnerMap/` |
| Export / print | `components/learnerMap/export/`, `styles/learnerMapPrint.css` |

---

## Multi-tenancy

- Data scoped by **`org_id`** on tenant tables.
- **RLS** on Postgres is the intended isolation layer; some lifecycle rules are **app-enforced** during Alpha (see [`../product/assessment_lifecycle.md`](../product/assessment_lifecycle.md)).

---

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser anon key |

See [`../guides/setup_guide.md`](../guides/setup_guide.md) and [`supabase_setup.md`](./supabase_setup.md).

---

## Related docs

- [`data_access.md`](./data_access.md) — Supabase client usage  
- [`security_and_roles.md`](./security_and_roles.md) — Auth & RBAC  
- [`database_schema.md`](./database_schema.md) — Tables / ERD  
- [`supabase_setup.md`](./supabase_setup.md) — Provisioning  

---

_Last reviewed: 2026-06-10._
