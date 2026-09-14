# Cross-App Identity Contract

| Field | Value |
|---|---|
| **Document type** | Architecture contract — cross-application interface |
| **Owner** | Evalis Assessment SPM |
| **Audience** | Any application in this repository that shares the Evalis database. Today that is **Evalis Programming**. |
| **Status** | Authoritative. **v1, 2026-09-15.** |
| **Implemented in** | Nothing new. **This document describes guarantees the existing schema already provides**; it creates no migration and changes no code. |
| **Last verified** | 2026-09-15, read directly from `database/migrations/` and `frontend/src/services/`. |

---

## 0. Why this document exists, and what it is not

Evalis Assessment and Evalis Programming share **one Postgres database** and are separated by **schema**: Assessment owns `public`, Programming owns `programming`. Foreign keys work natively across schemas in one database, which is the entire reason this arrangement was chosen — **a learner exists once, with one primary key, and a program can point at it.**

**That only holds if the consuming app treats Assessment's identity tables as an interface rather than as tables it happens to be able to reach.** Shared access without a stated contract is not integration; it is two applications writing to each other's state and discovering the rules by breaking them.

**This document is not Programming's architecture.** It says nothing about programs, targets, teaching procedures, session data, mastery, or SBT. Those belong to the Evalis Programming SPM and are out of scope here by design.

---

## 1. The rule everything else serves

**Programming borrows identity. It never redefines it.**

**Evalis Programming must not create its own learner, organisation, or user tables — not a mirror, not a cache, not a temporary placeholder with its own ids, not "just for the prototype".** A placeholder created to move fast becomes the thing a later migration has to reconcile, and reconciling duplicated identity across a populated database is the exact cost this architecture was chosen to avoid.

**If Programming needs a learner, it holds `uuid` referencing `public.clients(id)`.** If that is inconvenient at some point, the answer is a conversation between the two SPMs, not a local table.

---

## 2. What Assessment exposes

### 2.1 Learner identity — `public.clients`

| Property | Guarantee |
|---|---|
| **Primary key** | `id uuid`, default `gen_random_uuid()` |
| **Stability** | **Permanent.** A learner's id is assigned at creation and never reassigned, recycled, or rewritten. No code path mutates it |
| **Independence** | The learner exists independently of any assessment, pack, cycle or score. Nothing about a learner's identity depends on assessment activity |
| **Tenancy** | `org_id uuid not null references public.organizations(id)` |
| **Lifecycle** | `status` is `active` or `archived`. **Archiving is not deletion**; an archived learner keeps its id |
| **Deletion** | Possible, and see §5.1 — this is the one place where Programming's existence changes Assessment's behaviour |

**Safe to reference. This is the anchor of the assessment-to-program bridge.**

### 2.2 Tenancy — `public.organizations`

| Property | Guarantee |
|---|---|
| **Primary key** | `id uuid` |
| **Stability** | Permanent |
| **Meaning** | The tenant boundary for the whole platform, both applications. **There is one tenancy model, not two** |
| **Cross-org movement** | **Does not happen.** Standing Rule §1.7: a learner's `org_id` is never changed by hand. Cross-org transfer is a deferred feature and will be a designed transactional operation when it exists. **Programming may assume `org_id` is stable for the lifetime of a row** |

### 2.3 Actor identity — `public.user_profiles`

| Property | Guarantee |
|---|---|
| **Primary key** | `id uuid`, which **is** `auth.users(id)` — one identity per human across both applications |
| **Tenancy** | `org_id`, not null |
| **Roles** | `admin`, `senior_therapist`, `therapist`, `viewer`, enforced by a check constraint |
| **Caution** | **The role vocabulary is Assessment's and describes Assessment's permissions.** Programming may read a user's role; it must not assume the same role implies the same authority in its own app. **If Programming needs different roles, it models them in `programming`, keyed to the same user id — it does not add values to Assessment's constraint** |

### 2.4 Assessment results — `public.assessment_scores`

| Property | Guarantee |
|---|---|
| **Primary key** | `id uuid`. **Permanent and safely linkable** |
| **Uniqueness** | `UNIQUE (assessment_cycle_id, target_id)` — one row per target per cycle, enforced by the database since 2026-08-27 |
| **Survives** | Starting a new cycle (new rows are inserted; existing rows are never re-keyed or rewritten), pack canonicalization, and report finalization |
| **Does not survive** | Deletion of its parent assessment, which cascades |

**This is the left-hand side of the bridge: `assessment_item_result --motivated--> clinical_goal` is buildable today.**

### 2.5 What Assessment does NOT expose, and this is the important one

**There is no skill, target, or domain entity. None.**

`assessment_scores.target_id` is **`text`, and a foreign key to nothing.** Targets and domains exist only as objects inside `content_packs.pack_data` and the frozen `assessments.pack_snapshot` JSON, and Builder-authored ids are positional (`${domain_id}${n}`), unique within one pack and meaningless across packs.

**Consequences Programming must design around:**

- **A program cannot reference "a skill" in Assessment, because no such row exists.** It can reference a *result* (§2.4) or it can carry its own text label.
- **Do not build a skill table in `programming` and treat it as the canonical skill model.** The canonical taxonomy is **Layer 5, owned exclusively by Evalis Assessment**, and building it in Programming is a boundary violation.
- **Do not infer that a matching `target_id` string means the same skill across two packs. It does not.**

**Until Layer 5 exists, "this program addresses this skill" has nothing canonical to point at.** That is a known, recorded gap, not an oversight — and it is why the bridge is described as half-buildable rather than ready.

### 2.6 The audit event envelope — `public.audit_logs`

**Shared, and intended to be shared.** One event engine, not two.

Columns: `org_id`, `user_id`, `action`, `entity_type text`, `entity_id uuid`, `details jsonb`, `new_data jsonb`, `old_data jsonb`, `created_at`. **`entity_type` is unconstrained text and `entity_id` has no foreign key**, so the table accepts `entity_type = 'program'` today with no schema change.

**Three binding conditions on Programming's use of it:**

1. **Write through a service, not to the table.** Assessment's `auditService` normalizes actions and ids; **a module writing raw rows bypasses that and produces a log two apps cannot read consistently.** Programming implements its own equivalent or shares Assessment's — either is fine; writing raw is not.
2. **The canonical action set is closed and currently seven values** — `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `CYCLE_START`, `EXPORT`. **An unrecognized action is silently coerced to `VIEW`.** If Programming needs `TRIAL_RECORDED`, that value is added deliberately, by agreement, not invented at a call site.
3. **Standing Rule §1.8 applies to both applications: store the reconstructible fact, not the clinical narrative.** Scores, statuses, ids, before-and-after values — yes. Free-text clinical notes — no; record that a note changed, never its content.

---

## 3. Row-level security across the schema boundary

**RLS does not cross schemas for you.** Assessment's policies protect Assessment's tables. **Tables in `programming` are unprotected until Programming protects them**, and a table in a shared database with RLS disabled is reachable by any authenticated user in any organisation.

**Required of every table in `programming` holding tenant data:**

- `alter table programming.<t> enable row level security;`
- A tenancy predicate equivalent to Assessment's: `org_id = public.get_my_org_id()`

**`public.get_my_org_id()` is available to Programming and is the intended mechanism.** It is `security definer` and `stable`, and resolves the caller's organisation from `public.user_profiles`. **Use it; do not write a second org-resolution function.** Two functions answering "which org is this?" is how the tenant boundary develops a seam.

**Cross-tenant isolation was proven by attack on 2026-08-31**, in both directions against two real organisations. **That proof covers `public` only. Programming's schema inherits the proof's method, not its result** — it must be attacked separately before it holds real data.

---

## 4. What a consuming schema may and may not do

**May:**

- Hold foreign keys into `public.clients(id)`, `public.organizations(id)`, `public.user_profiles(id)`, `public.assessment_scores(id)`
- Read those tables, subject to RLS
- Call `public.get_my_org_id()`
- Write to `public.audit_logs` under §2.6's three conditions
- Create anything it likes inside `programming`

**Must never:**

- **Insert, update or delete any row in any `public` table other than `audit_logs`.** Assessment owns its state; a second app writing to it makes both apps' invariants unenforceable
- **Create its own learner, organisation or user table** (§1)
- **Alter any `public` object** — table, column, policy, trigger, function, constraint
- **Add values to Assessment's role constraint**
- **Build Layer 5 canonical mapping or taxonomy** — boundary rule
- **Apply migrations that touch `public`.** Programming's migrations create and alter `programming` objects only

---

## 5. What Assessment owes Programming, and one thing Programming changes about Assessment

### 5.1 The consequence nobody had noticed: learner deletion

**`public.clients` can be deleted today.** Assessment's own delete path exists, and the org clear-out of 2026-09-02 used it.

**The moment `programming` holds a foreign key into `public.clients(id)`, deleting a learner with programs raises a foreign key violation inside Evalis Assessment** — a feature Programming does not own, failing for a reason its user cannot see, with an error message about a schema they have never heard of.

**This must be decided before Programming's first learner reference ships, not discovered afterwards.** Three defensible answers: `on delete restrict` with an honest message in Assessment's UI; `on delete cascade` from Programming's side, accepting that deleting a learner destroys their programs; or Assessment stops hard-deleting learners entirely and archives instead.

**No answer is chosen here. It is named here so that it is chosen deliberately, by both SPMs, rather than by whoever writes the foreign key.**

### 5.2 Change notice

Assessment commits not to change, without notice: the primary key type or stability of the four tables in §2; the tenancy model; `get_my_org_id()`'s signature or meaning; the audit envelope's column set.

**Notice means:** a version bump on this document with the change stated, a `07 SPM/(C) Evalis LOG.md` entry, and — for anything breaking — agreement from both SPMs **before** the migration is written.

**Assessment does not owe notice on:** anything inside `pack_data` or `pack_snapshot`, scoring semantics, its own UI, its own contracts, or any table not listed in §2. **Programming must not depend on those**, and depending on them anyway is not a change Assessment is obliged to protect.

---

## 6. Open at v1

- **§5.1 learner-deletion semantics.** Both SPMs. **Before Programming's first foreign key into `clients`.**
- **Canonical action-set extension for Programming's events.** Cheap now, awkward after the log has a shape.
- **Whether Programming shares Assessment's `auditService` or implements its own** to the same contract.
- **The skill-identity gap (§2.5) is not open — it is a known constraint.** It closes when Layer 5 is built, in Assessment, by Assessment.
