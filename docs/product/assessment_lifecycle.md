# Assessment lifecycle (Evalis — Alpha reference)

This document describes **observed product behavior** for AIM Alpha. It is **not** legal, clinical, or compliance guidance. **Production** deployments require their own review; database RLS and policy enforcement are **not** described here as production-grade.

---

## Assessment statuses

Application assessments move through **workflow statuses** (exact labels may appear in human-readable form in the UI):

| Status (conceptual) | Typical meaning |
|---------------------|-----------------|
| Draft | Assessment created; scoring/editing allowed per role/cycle rules. |
| In progress | Active work (may co-exist with draft semantics depending on pack/workflow). |
| Submitted | Author has submitted for review; editing rules tighten by role. |
| Approved | Finalized from a workflow perspective for Alpha; **immutable** for scoring/editing in the UI for all roles. |

Statuses are enforced primarily through **application** and **service-layer** behavior for Alpha. **Do not assume** equivalent guarantees from RLS alone without an explicit security review.

---

## Cycle status behaviour

- Each assessment may have one **active** scoring cycle for editing contexts.
- **Historical / non-active cycles** are **read-only** for editing paths that modify scores tied to those cycles (Alpha behavior).

---

## Role permission matrix (Alpha — editing / review)

| Role | Draft / in-progress (active cycle) | Submitted | Approved | Non-active cycles |
|------|-------------------------------------|-----------|----------|-------------------|
| Therapist | Edit per app rules | **No edit** (read-only for changes) | Read-only | Read-only |
| Senior Therapist | Edit per app rules | **Can edit** during review (direct in-product) | Read-only | Read-only |
| Admin | Edit per app rules | **Can edit** during review (direct in-product) | Read-only | Read-only |
| Viewer | **No edit** | No edit | No edit | Read-only |

Exact UI affordances may vary by screen; this matrix captures **intent** for Alpha.

---

## Submitted assessment review behaviour

- After **submit**, therapists **cannot** change scores/content through the supported editing paths.
- **Senior Therapist** and **Admin** may **edit submitted** assessments **during review** (Alpha: direct edits; **no** structured “return to therapist” handoff).
- Reviewers should coordinate outside the product if therapist rework is required.

---

## Approved assessment immutability

- **Approved** assessments are **locked** for all roles for scoring and edit flows exposed in the Alpha UI.
- Treat approved records as **fixed** for Alpha test reporting unless an explicit out-of-band data fix is performed (not a supported end-user flow).

---

## Known Alpha limitations

1. **No return-to-therapist revision flow** — There is no built-in “send back for corrections” workflow; submitted work is reviewed/edited by privileged roles or remains read-only for therapists until/unless product changes ship.

2. **Enforcement layer** — Lifecycle and role rules for Alpha rely on **app/service-level** enforcement. **Database RLS** is not documented here as a complete, production-grade substitute for application rules. A future hardening pass may tighten server-side guarantees.

---

_For Alpha operational constraints (browser, pack types, Supabase), see `docs/roadmap/aim_alpha_readiness_plan.md`._
