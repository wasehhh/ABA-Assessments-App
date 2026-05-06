# Evalis System Risk & Readiness Document

Strategic risk register for **Evalis** (ABA Assessment Platform) as it moves from **controlled Alpha** toward **external pilots** and eventual **commercial SaaS** posture.  

**Sources:** Overseer-aligned system audit [`docs/audits/current_state_audit_2026_05_02.md`](../audits/current_state_audit_2026_05_02.md), Alpha readiness and constraints [`docs/roadmap/aim_alpha_readiness_plan.md`](../roadmap/aim_alpha_readiness_plan.md), Supabase baseline [`docs/architecture/supabase_setup.md`](../architecture/supabase_setup.md), lifecycle notes [`docs/product/assessment_lifecycle.md`](../product/assessment_lifecycle.md), and project handoff context [`docs/project_handoff.md`](../project_handoff.md).  

This is **not** legal advice, a compliance certification, or a warranty of security.

---

## 1. Purpose

This document tracks **long-term** product, technical, operational, compliance, commercialization, and scalability **risks** so Alpha-stage choices do not create **hidden failure points** later. It complements:

- Operational runbooks and Alpha staff guidance (e.g. [`docs/alpha/alpha_runbook.md`](../alpha/alpha_runbook.md))
- Detailed technical audits (factual inventories in `docs/audits/`)

**Intended readers:** Founder, Overseer / SPM, and leads for Builder, QA, Documentation, and Security/compliance advisors.

---

## 2. Current readiness summary

| Gate | Judgement | Brief rationale |
|------|-----------|-----------------|
| **Alpha (controlled AIM Alpha)** | **GO** — *with documented constraints* | Core workflow usability can be exercised in a narrow, supervised setting when constraints (browser, pack types, reviewer model, smoke-tested Supabase) are enforced and data/support policies are explicit. |
| **External pilot readiness** | **NOT YET** | Missing durable multi-tenant operations baseline, formal compliance/legal packaging for third parties, consistent backend enforcement story, migration/observability discipline, and support model scaled beyond a handful of supervised users. |
| **Paid SaaS readiness** | **NOT YET** | No production-grade assurance stack (regression automation, incidents, backups SLAs), commercial/legal package (terms, DPIA posture, subscriptions), or scalable onboarding/support at contract volume. |

**Important:** Alpha **GO** does **not** imply pilot **GO** or revenue **GO**. Each gate gates the next.

---

## 3. Risk classification legend

| Classification | Meaning |
|----------------|--------|
| **Acceptable for Alpha** | May remain as-is inside the **narrow Alpha envelope** if constraints and training hold. |
| **Must address before Alpha** | Blocking or materially unsafe for **this** AIM Alpha unless explicitly waived in writing by SPM with compensating controls. |
| **Must address before external pilots** | Required before trusting **outside** supervised AIM-style users orgs/data under anything resembling pilot terms. |
| **Must address before paid SaaS rollout** | Required before **money**, broad multi-tenant scale, or advertised SLAs. |

---

## 4. Category-by-category risk audit

### 4.1 Architecture & scalability

| Dimension | Detail |
|-----------|--------|
| **Current state** | Browser **SPA** (Vite/React) talks **directly** to Supabase; no first-party API tier in-repo. Multi-tenant shape is **org-scoped Postgres + RLS** (intent in docs); authoritative DDL spread across **snapshots + migrations + root SQL patches** ([`docs/architecture/supabase_setup.md`](../architecture/supabase_setup.md)). |
| **Acceptable for Alpha** | Known apply order; single-org Alpha; bounded concurrency; supervised users. |
| **Key risks** | Schema/provisioning **drift** between environments; client-heavy trust boundary; scaling **write patterns** and **RLS complexity** without a disciplined migration pipeline. |
| **Risk classification** | Architecture split: **Acceptable for Alpha** *if setup is frozen per doc*; **Must address before paid SaaS** for unified infra/migration story. Operational drift → **Must address before external pilots** if pilots use self-provisioned projects. |
| **Hard-to-reverse decisions** | Data model keyed to **org_id** and snapshot-heavy assessments is foundational; ripping toward microservices later is costly. Embedding business rules only in SPA without server parity is painful to retrofit. |
| **Recommended next actions** | Freeze **one** canonical DB apply path per environment class; roadmap **single migration authority** post-Alpha; document **traffic/auth** assumptions before any pilot SLA. |

### 4.2 Authentication & SSO readiness

| Dimension | Detail |
|-----------|--------|
| **Current state** | Supabase **email/password** Auth; invite rows + RPCs for join flows; Alpha note: confirmation settings affect bootstrap ([`docs/architecture/supabase_setup.md`](../architecture/supabase_setup.md)). **No enterprise SSO/OIDC** product path documented for Evalis tier. |
| **Acceptable for Alpha** | Small user set; passwords + manual provisioning; SPM-defined data classification. |
| **Key risks** | Clinic buyers eventually expect **IdP SSO**, SCIM-lite, MFA policy; migrating identity without UX disruption is **hard-to-reverse** if URLs and tenancy assumptions crystallize wrong. |
| **Risk classification** | **Acceptable for Alpha.** **Must address before external pilots** for many clinic IT shops (at least a **provision model** decision). **Must address before paid SaaS** where contract requires SSO/MFA attestations. |
| **Hard-to-reverse decisions** | Coupling tenancy to Supabase Auth user IDs vs future IdP canonical IDs; custom invite UX deep in SPA. |
| **Recommended next actions** | Publish **future auth target** (Supabase SSO vs upstream IdP); avoid AIM-only auth hacks becoming product truth. |

### 4.3 Data model & long-term flexibility

| Dimension | Detail |
|-----------|--------|
| **Current state** | **Pack snapshots** on assessments; **cycles** and scores; roles in **`user_profiles`**. Lifecycle rules described as **app-level** for Alpha ([`docs/product/assessment_lifecycle.md`](../product/assessment_lifecycle.md)). |
| **Acceptable for Alpha** | Numeric/yes-no path; scripted reviewers; Alpha data policy. |
| **Key risks** | Checkbox/task-analysis **surface area** vs clinical expectations; audit/evidence/metadata columns **underused** (audit factual inventory); export **semantic** mismatches across screens if not kept explicit. |
| **Risk classification** | Model **Acceptable for Alpha** inside constraints. Misaligned exports / audit holes → **Must address before external pilots** for forensic expectations. Deep schema churn without migrations → **Must address before paid SaaS**. |
| **Hard-to-reverse decisions** | JSON **pack_snapshot** semantics; mixing clinical **versions** without migration tooling. |
| **Recommended next actions** | Explicit **schema versioning** plan; reconcile export semantics in docs **and** product copy for pilots. |

### 4.4 Technical debt risks

| Dimension | Detail |
|-----------|--------|
| **Current state** | Audit §9 lists **documentation drift**, **export scope** differences list vs matrix, **audit UUID** payloads, analytics **noise**, partial features, cycle UX limits, checkbox mismatch, etc. Some Phase 0/1 remediation may have landed; audit file may **lag** fixes—treat §9 as **historical severity signals**, not live bug list. |
| **Acceptable for Alpha** | Non-blocking items **outside Alpha path** if trainers enforce constraints. |
| **Key risks** | Silent failures ( swallowed audit/errors); **dual export** interpretations in the wild; lingering **readme/architecture doc** false assumptions mis-training new hires. |
| **Risk classification** | Items touching **Alpha path** cleaned per readiness plan → **Must address before Alpha**. Broader cleanup → **Before external pilots** / **paid SaaS** by severity. |
| **Hard-to-reverse decisions** | Letting trainees rely on wrong export as “source of truth” becomes org habit. |
| **Recommended next actions** | Maintainer pass: **stamp** docs last-reviewed date; backlog debt with pilot/SaaS tags. |

### 4.5 Agent-based development workflow risks

| Dimension | Detail |
|-----------|--------|
| **Current state** | Multi-agent workflow assumed in [`docs/project_handoff.md`](../project_handoff.md); rapid iteration velocity with split responsibilities. |
| **Acceptable for Alpha** | If **QA validates** Alpha path and Documentation records constraints. |
| **Key risks** | **Incomplete handoffs**, inconsistent **routing**, parallel changes without regression safety; tacit behaviour not reflected in specs. |
| **Risk classification** | **Acceptable for Alpha** only with explicit **QA gates** on Alpha checklist. **Must address before paid SaaS** with **automated regression** + code review discipline. |
| **Hard-to-reverse decisions** | Implicit “works on my Supabase” org configs baked into folklore. |
| **Recommended next actions** | Mandatory **verification checklist** attach to releases; tighten “who owns migrations” vs Builder handoff notes. |

### 4.6 Security & compliance trajectory

| Dimension | Detail |
|-----------|--------|
| **Current state** | Design intent: RLS isolation, audit table, PHI-aware positioning in handoff. **Alpha reality:** lifecycle and some rules are **application-enforced**; full **RLS matrix vs UI** parity not asserted as production-complete ([`docs/product/assessment_lifecycle.md`](../product/assessment_lifecycle.md)). No formal **HIPAA** program described in-repo for SaaS Operation. |
| **Acceptable for Alpha** | **Supervised**, **narrow** data use; SPM-signed data policy; no broad marketing of compliance. |
| **Key risks** | **Overclaiming** compliance; reliance on SPA-only checks under adversarial insider or compromised session scenarios; subprocessors (Supabase tier, logging) not enumerated for legal review. |
| **Risk classification** | Honest Alpha posture → **Acceptable for Alpha**. **Misrepresentation** → **Must address before Alpha** (messaging/legal). Formal posture → **Before external pilots** / **paid SaaS** depending on PHI and BAAs. |
| **Hard-to-reverse decisions** | Public marketing claiming “HIPAA-ready” without artifacts; storing real PHI without agreements. |
| **Recommended next actions** | Written **privacy + data flow** memo; align marketing to **facts**; plan RLS/policy hardening milestone **before pilot expansion**. |

### 4.7 SaaS infrastructure: monitoring, backups, uptime

| Dimension | Detail |
|-----------|--------|
| **Current state** | Supabase-hosted DB/Auth assumed; repo does not define **production SRE playbook** (on-call, SLOs, backup restore drills, synthetic checks). |
| **Acceptable for Alpha** | Best-effort; manual smoke checks; SPM accepts downtime/data reset risk for test org. |
| **Key risks** | Silent data loss, undetected Auth/API outages at customer scale; no incident comms templates. |
| **Risk classification** | **Acceptable for Alpha.** **Must address before external pilots** minimally (monitoring alert path + backup awareness). **Must address before paid SaaS** formally. |
| **Hard-to-reverse decisions** | Customers trained to expect heroic manual support instead of observable systems. |
| **Recommended next actions** | Define **minimal observability**: Supabase dashboards, error logging stance, quarterly restore drill for pilot tier. |

### 4.8 Product scope discipline

| Dimension | Detail |
|-----------|--------|
| **Current state** | Vision in handoff includes analytics/AI future; Alpha plan **explicitly out-of-scopes** those ([`docs/roadmap/aim_alpha_readiness_plan.md`](../roadmap/aim_alpha_readiness_plan.md)). |
| **Acceptable for Alpha** | Locked **Alpha scope** doc + trainer enforcement. |
| **Key risks** | **AIM-specific one-offs** become permanent branches; stealth scope via “small asks.” |
| **Risk classification** | Any **Must address before Alpha** item is SPM approval for scope creep during Alpha sprint. Pilot/SaaS: **guardrails** (§11). |
| **Hard-to-reverse decisions** | Custom fields/workflows for one clinic without abstraction. |
| **Recommended next actions** | SPM **change control** memo; single “official feature list” per phase. |

### 4.9 User onboarding & support readiness

| Dimension | Detail |
|-----------|--------|
| **Current state** | Invites shareable links; email delivery **not** automated ([`docs/roadmap/aim_alpha_readiness_plan.md`](../roadmap/aim_alpha_readiness_plan.md)); Alpha runbook is **manual** narrative. |
| **Acceptable for Alpha** | Named contacts; live walkthrough; tiny user count. |
| **Key risks** | Password resets and role mistakes at scale; no ticket SLA; multilingual/accessibility gaps. |
| **Risk classification** | **Acceptable for Alpha.** **Must address before external pilots** support triage basics. **Must address before paid SaaS** repeatable onboarding + help content. |
| **Hard-to-reverse decisions** | Ad-hoc org provisioning scripts only in someone’s inbox. |
| **Recommended next actions** | Feedback channel + **FAQ** stubs post-Alpha; password/invite playbook. |

### 4.10 Long-term maintainability

| Dimension | Detail |
|-----------|--------|
| **Current state** | Docs split across missions, audits, architecture, roadmap, product; occasional **staleness** (audit vs repaired codepaths). SQL **dual track** complicates onboarding. |
| **Acceptable for Alpha** | `supabase_setup` + readiness + runbook sufficiently **central** for Alpha. |
| **Key risks** | New engineers/incorrect DDL; lost knowledge when SQL only lives outside migrations. |
| **Risk classification** | **Must address before external pilots** consolidate **where truth lives**. **Paid SaaS** needs **migration CI** parity. |
| **Hard-to-reverse decisions** | Per-environment manual hotfixes undocumented. |
| **Recommended next actions** | Documentation agent + Overseer cadence for **risk register refresh** quarterly. |

---

## 5. Hidden blockers

### 5.1 Future SSO

- **Blocker now?** Product-level SSO is **not** delivered; clinics may **block pilots** without a path.
- **Plan later:** Choose IdP integration model; design user linking; pilot with one IdP volunteer customer.

### 5.2 Multi-clinic SaaS scaling

- **Blocker now?** Single-org Alpha hides **fleet** provisioning, billing account ↔ org mapping, support partition, noisy-neighbor monitoring.
- **Plan later:** Multi-tenant admin model, quotas, observability per tenant tier.

### 5.3 Stronger compliance posture

- **Blocker now?** **Complete** HIPAA/SOC story **not** in-repo as operating program for Evalis SaaS Org.
- **Plan later:** BAA checklist, DPIA, subprocessors page, retention, breach runbook—informed by pilot geography and PHI stance.

### 5.4 Future analytics

- **Blocker now?** Advanced analytics intentionally **out of Alpha** scope; codebase has **analytics dead weight/noise** per audit observations.
- **Plan later:** Productized analytics pipeline, PHI minimization, cohort consent, deletion synchronization.

---

## 6. Reversible vs hard-to-reverse decisions

| Easier to change later | Harder / costly to reverse |
|------------------------|-----------------------------|
| UI copy, help text, runbook tweaks | Database shape for assessments/snapshots and org tenancy keys |
| Chrome-only Alpha printing policy | Claims about compliance or security externally published |
| Which SQL files Alpha uses *if tracked in git honestly* | Silent per-env DB edits not reflected in repo |
| Feature flags disabling checkbox flows | Embedding AIM-only branching in core domain logic |
| Training constraints (pack types) | Org habits / exported “official” spreadsheets that contradict product truth |

*Overseer audit themes: unify migrations, validated RLS matrix, disciplined audit payloads, elimination of misleading nav/debug trusts—deferring these increases reversal cost.*

---

## 7. Prioritized action list by agent

### Builder

- Post-Alpha: execute **migration unification** design; tighten **lifecycle** parity where product promises match server rules.
- Maintain **feature flags / guards** aligned to Alpha constraints (pack types).

### QA

- **Pre-Alpha:** Run [`docs/architecture/supabase_setup.md`](../architecture/supabase_setup.md) verification checklist on **Alpha Supabase**.
- Exercise **role matrix** and Chrome report printing on Alpha build; regress **client save errors** visibility.
- Log **severity-tagged** findings to feed this risk register.

### Documentation

- Keep **`aim_alpha_readiness_plan`**, **`alpha_runbook`**, **`supabase_setup`**, **`assessment_lifecycle`**, **this document** synced after material changes.
- Fix **audit vs code** deltas with “last validated” stamps where useful.

### Security / Compliance

- Pre-pilot memo: PHI stance, subprocessors, access logging expectations.
- Review **invite/auth** posture when moving beyond supervised Alpha.

### Overseer / SPM

- Gate external pilot backlog; enforce **§11 guardrails**.
- Own **commercial/legal** initiation before paid SaaS.
- Decide **external pilot readiness** formally using §2—not gut feel.

---

## 8. Immediate pre-Alpha requirements

**Only these class of items** gate AIM Alpha startup (no SSO, billing, AI, enterprise monitoring rollout required here):

| # | Requirement |
|---|-------------|
| 1 | Verify **Alpha Supabase** using setup + checklist in [`docs/architecture/supabase_setup.md`](../architecture/supabase_setup.md). |
| 2 | Validate **role matrix** (who can edit when) on the **actual** Alpha environment. |
| 3 | Validate **Chrome** printable report / Save as PDF path. |
| 4 | **Enforce** numeric / yes-no **pack restriction** in training and process (and product stance per readiness plan). |
| 5 | **Confirm Alpha data policy** (synthetic vs real PHI; SPM-written). |
| 6 | **Confirm support/feedback channel** for testers (named contact/path). |

---

## 9. Post-Alpha / before external pilot requirements

- Clean up **outdated architecture / README drift** versus Vite SPA reality.
- Define **future auth / SSO provisioning** model (written decision, even if build is later).
- **Strengthen backend/RLS** lifecycle enforcement versus app-only Alpha rules where risk warrants.
- Establish **monitoring/support baseline** (alerts someone watches; backup consciousness).
- **Formalize schema/migration** process (single authority, review gates).
- **Clarify legal/compliance posture** and agreements suitable for non-AIM pilot orgs.

---

## 10. Before paid SaaS rollout

- **Unified migrations / CI** applied to canonical environments.
- **Automated regression** suite materially covering signup, invite, scoring, submit/approve, export/report.
- **Production-grade monitoring** and **incident response** runbook with owner on-call rotation.
- **Formal privacy/compliance program** aligned to markets sold (documents, DPIA/GDPR stance as applicable, BAAs if PHI US).
- **Backup/recovery** expectations tested and communicated.
- **Commercial/legal package** (MSA, DPA, acceptable use, liability caps as advised by counsel).
- **Scalable support model** (tiers, response times or honest “best effort until date”).

---

## 11. Strategic guardrails

- Do **not** confuse **Alpha readiness** with **SaaS readiness**.
- Do **not** **overclaim** compliance, security, or clinical validation.
- Do **not** allow **AIM-specific customization** to distort the **core product** without abstraction and SPM approval.
- Do **not** introduce **premature features** ahead of phased gates in §8–§10.
- Do **not** allow **undocumented architecture drift** (every environment change lands in tracked artifacts).
- Do **not** allow **machine- or agent-generated changes** without **human QA** and **documentation touchpoints** appropriate to risk.
- Do **not** treat **temporary Alpha shortcuts** as **permanent** architecture or contractual promises.

---

## 12. Final SPM position

Evalis is moving **safely** toward learning from real clinicians **if**:

- Alpha stays **narrow** in scope and user count,
- Written **constraints** are **enforced** in training and process,
- **Technical debt** and environment truth are **documented**, not tacit,
- **Post-Alpha risks** are **scheduled** before **wider pilots**—not deferred until revenue pressure forces heroics,

and SPM explicitly re-answers **§2** before each gate escalation.

---

_Document steward: Overseer / SPM. Next review suggested: within one month of Alpha close or upon any pilot/SaaS decision._
