# Assessment Report Authoring Contract (Layer 2C)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Report — clinician-authored communication artifact |
| **Milestone** | Layer 2C purpose reframe (founder decision 2026-08-19) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Code inspection 2026-08-19: `reportProfile.ts`, `AssessmentReport.tsx`, `frontend/src/components/report/export/*`, `AssessmentBuilderTargetEditor.tsx`, `frontend/src/types/index.ts`, `assessmentScoreEditRules.ts`, `docs/product/assessment_lifecycle.md` |
| **References** | [`assessment_report_contract.md`](./assessment_report_contract.md) (supersedes §1–§2 and related sections — §0 below) · [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.6 · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) G4–G8 · [`security_and_roles.md`](./security_and_roles.md) · [`assessment_lifecycle.md`](../product/assessment_lifecycle.md) · vault `(C) G1–G8 Runtime Laws.md` (read for this contract; not in repo) · vault `06 Roadmap/(C) Evalis Roadmap.md` §7 AI narrative (rule name only; not in repo) |
| **Non-goals** | Implementation · UI pixel design · AI-generated narrative · Snapshot / Learner Map redesign · PHI gate redesign (carry forward) · CSV export · unrelated OQ-2 / OQ-9 from prior contract unless forced |

This document is the authoritative product contract for **how** the Assessment Report is authored, stored, and rendered as a clinician-built communication document.

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns product meaning for the **authoring model**, persisted report entity, reference-data integration, G-law boundary for narrative vs embedded computed content, lifecycle/roles, and supersession of the prior computed-report purpose. It references [`assessment_report_contract.md`](./assessment_report_contract.md) for egress posture already shipped or specified there. It does not restate Snapshot export serializers, full G1–G8 vault prose, or Builder field-level UI specs.

---

## Amendment banner — purpose reframe (2026-08-19)

**Founder decision (binding input):** The Report must **not** be another artifact displaying raw assessment data. It is a **communication artifact** shareable with clinicians, parents, schools, and funders — an **interpretation layer** built with platform assistance (structured dropdown selections, short text fields per section), not full auto-generation and not an unstructured blank document.

**Supersedes** the computed-report purpose in [`assessment_report_contract.md`](./assessment_report_contract.md):

| Prior contract section | Disposition |
|------------------------|-------------|
| §1 Goals (success statement: auto-composed document from Layer 0/1 services) | **Superseded** — success is clinician-authored final document |
| §2 Three-layer purpose boundary (Report = print-oriented computed summary) | **Superseded** — Report = external-facing authored communication |
| §2.2 `ReportProfile` element classification as report **body** | **Superseded** — `ReportProfile` is reference/scaffolding only |
| §3 Data contract (`ReportProfile` as canonical report body) | **Superseded for body** — persisted authored entity is canonical body (§5) |
| §7 Standing exclusions tied to computed layout | **Partially superseded** — exclusions on embedded computed widgets remain; authored prose is new surface |
| §8 `note` field on `ReportTargetRow` (v1 exclusion) | **Superseded for communication narrative** — Matrix `note` remains excluded; clinician-authored section text replaces that channel |
| §9 G-law compliance path as **report purpose** | **Reframed** — applies to embedded computed elements only (§6) |
| §10 INV-R1–R4, INV-R9 (computed body invariants) | **Superseded** by INV-RA\* (§9) |
| §11 Implementation guidance (render computed profile as report) | **Superseded** |

**Carried forward unchanged** from [`assessment_report_contract.md`](./assessment_report_contract.md) unless amended here:

| Topic | Prior section | Status |
|-------|---------------|--------|
| Single primary cycle per report document | §4 | **Confirmed** — authoring model strengthens this (§4) |
| PHI acknowledgement print-only gate + audit | §5 | **Confirmed and extended** (§7) |
| `note` on Matrix scores excluded from Report | §8 (OQ-7) | **Still binding** for Matrix-sourced `note` |
| Browser print v1 egress channel | §6 | **Confirmed** for finalized render |
| OQ-1 resolved (view without ack; print gated) | §12.1 | **Confirmed** |
| Export mode `'standard'` | Shipped: `REPORT_EXPORT_MODE` in `reportExportAcknowledgment.ts` | **Locks prior OQ-3** for egress audit payloads |
| OQ-2, OQ-4, OQ-5, OQ-6, OQ-8, OQ-9 | §12.2 | **Remain open** unless noted in §11 |

Superseded text from the prior contract is **not duplicated** here; it remains in [`assessment_report_contract.md`](./assessment_report_contract.md) under dated amendment banners and section history.

---

# 0. Code facts relied on (verified)

| Fact | Where verified |
|------|----------------|
| `buildReportProfile()` remains G6/G7/G8-compliant composition | `reportProfile.ts` |
| PHI gate shipped: `ReportExportDialog`, `reportExportAcknowledgment.ts`, print wiring in `AssessmentReport.tsx` | `frontend/src/components/report/export/*` |
| `REPORT_EXPORT_MODE = 'standard'` | `reportExportAcknowledgment.ts` |
| Current page renders full computed profile as document body | `AssessmentReport.tsx` |
| Structured field editing precedent (dropdowns, per-field updates) | `AssessmentBuilderTargetEditor.tsx` |
| `UserRole = 'admin' \| 'senior_therapist' \| 'therapist' \| 'viewer'` | `types/index.ts` |
| Assessment statuses: `draft` \| `in_progress` \| `submitted` \| `approved` | `types/index.ts`; `assessment_lifecycle.md` |
| Approved assessments immutable for score edits | `assessmentScoreEditRules.ts`; `assessment_lifecycle.md` |
| No persisted report entity in schema today | migrations grep — no `assessment_report*` table |

---

# 1. Purpose statement (binding rewrite)

## 1.1 What Layer 2C is

The **Assessment Report** is a **clinician-authored communication document** produced for readers **outside the day-to-day clinical team** — parents/caregivers, collaborating clinicians, schools, funding agencies, and compliance files.

A **senior clinician** (see §8) uses Evalis to **build** the document through **platform-assisted structured authoring**: predefined sections, guided dropdown selections (e.g. overall progress band), and short free-text fields — not AI-generated prose, not a blank word processor, and **not** an auto-rendered dump of assessment scores.

## 1.2 Three-layer boundary (revised)

| Layer | Artifact | Primary reader | Core question |
|-------|----------|----------------|---------------|
| **2A — Assessment Snapshot** | Raw **evidence record** | Clinician / auditor | What exactly was scored, when? |
| **2B — Learner Map** | **Supervision interpretation** | BCBA / clinical supervisor | What do scores mean clinically? Should I sign off? |
| **2C — Assessment Report** | **Authored communication** | Parent, school, funder, external clinician | What should **you** understand about this learner’s assessment this cycle? |

Snapshot and Learner Map are **clinical workspace artifacts** — dense, internal, multi-cycle or supervision-oriented. The Report is **written for an external reader** who will not open Matrix or interpret band distributions without guidance.

## 1.3 What the platform does vs the clinician

| Platform | Clinician |
|----------|-----------|
| Offers **reference data** from `ReportProfile` / domain profiles (read-only scaffolding) | Chooses wording, selections, and which optional computed summaries to embed |
| Validates required sections before finalize | Holds clinical responsibility for narrative accuracy |
| Snapshots embedded computed blocks at finalize (§4) | Authors interpretation — progress, strengths, recommendations, impression |
| Assembles finalized layout for screen + print | Reviews finalized document before PHI-gated print (§7) |

## 1.4 Success statement

After implementation of this contract:

> A senior clinician can open an **authoring workspace** for a **single cycle**, consult live reference data from the resolver chain, complete structured section fields, optionally embed snapshotted computed summaries, **finalize** a versioned communication document, and **Print / Save as PDF** the finalized render after PHI acknowledgement with audit-logged egress. The printed document reflects authored content and any embedded snapshots — not a live auto-generated score dump.

## 1.5 Explicit non-goals

| Out of scope | Reason |
|--------------|--------|
| AI-generated narrative | Vault roadmap Layer 4/5 — separate long-term item; forbidden here |
| Unstructured full-document free authoring | Founder direction: structured assistance only |
| Auto-publishing Report on score entry | Report requires explicit author finalize |
| Replacing Snapshot or Learner Map | Different layers (§1.2) |
| Matrix `note` field in Report body | Prior OQ-7 still binding for score-row notes |

---

# 2. Authoring model

## 2.1 Structures compared

### Model A — Fixed section template

Predefined sections in fixed order. Each section: mix of **guided selects** + **short text fields** (character-bounded — limits **underspecified**, §11 OQ-RA3).

Example section catalog (illustrative — exact labels **underspecified**, §11 OQ-RA4):

| Section | Field types (pattern) |
|---------|------------------------|
| Overview | Select: overall progress this cycle; short text: summary |
| Domain highlights | Per-domain select + optional short comment |
| Strengths | Short text (and/or multi-select from guided list if founder adds) |
| Areas of growth | Short text |
| Recommendations | Short text |
| Clinical impression | Short text |

**Pros:** Matches founder direction; predictable parent/school packets; bounded v1; compliance-friendly consistency.  
**Cons:** Less flexibility when a clinic wants a minimal letter vs full report.

### Model B — Configurable section set

Clinician picks which sections from a catalog appear, then fills them.

**Pros:** Flexibility for different audiences.  
**Cons:** General document-editor complexity; harder QA; scope creep toward custom CMS; weaker default for funders expecting standard BCBA report sections.

## 2.2 Decision (binding)

**Recommend and adopt Model A — fixed section template** for v1.

**Reasoning:**

1. **Founder input** explicitly describes dropdown selections and short boxes **per section** — not pick-your-sections document design.
2. **BCBA communication norm:** External reports typically follow a stable outline (summary → domain performance → strengths/challenges → recommendations → impression). Parents and schools expect recognizable structure.
3. **v1 boundedness:** Model B is a general document editor; Model A ships faster with testable invariants.
4. **Precedent:** `AssessmentBuilderTargetEditor` uses structured per-entity fields, not optional schema composition — same product instinct.

### Bounded hybrid (within Model A — not Model B)

Optional **per-section embed toggles** for computed reference widgets (§4) — e.g. “Include domain summary table: Yes/No” — do **not** change which **narrative sections** exist. Section **order** is fixed in v1.

Adding or removing narrative sections from the template is **out of v1 scope** (future contract amendment).

---

# 3. Reference-data integration

## 3.1 Roles of computed data

`ReportProfile` (via `buildDomainProfiles()` + `buildAssessmentLandscapeRollup()`) is **reference and optional embed source** — never the report body by default.

| Surface | Binding | Live vs snapshotted |
|---------|---------|-------------------|
| **Authoring reference panel** | Read-only; always available while drafting | **Live** — refreshes with current scores until finalize |
| **Finalized document body (narrative)** | Persisted authored fields | N/A — clinician text |
| **Optional embedded computed blocks** (e.g. domain summary table, assessment band bar) | Included only when author toggles embed on | **Snapshotted at finalize** (§3.2) |

## 3.2 Snapshot at finalize (recommended — binding)

**Decision:** Embedded computed elements are **frozen into the persisted report document at finalize time**, not live-rebound at print.

**Reasoning:**

1. **G8 alignment:** A communication record for a cycle should reflect the assessment **as understood when the senior clinician signed the report**, not scores that changed afterward.
2. **G4 simplification:** Print renders the **finalized** document store; display = export within that frozen authored+embedded payload.
3. **Drift prevention:** Live-bound embeds at print would let Matrix edits change the PDF after authoring — clinically unsafe for external distribution.

**Mechanics:**

- On **finalize**, for each embed toggle that is `true`, run `buildReportProfile()` (or section-specific projection) once against `pack_snapshot` + cycle scores; store result in `embedded_computed` JSON on the report row (§5).
- Store **`embedded_generated_at`** and **`pack_snapshot` version/id** metadata sufficient to audit provenance (exact metadata keys **underspecified**, §11 OQ-RA5).
- **Draft** state may show live reference panel; **draft must not be PHI-gated printable as a finalized report** (§7, §8).

### Alternative considered — live-bound at print

| Aspect | Live at print |
|--------|----------------|
| G4 | Requires print-time render = on-screen render of **same live data** — fragile if scores change between view and print |
| Clinical record | External PDF could disagree with what author reviewed |
| **Verdict** | **Rejected** for embedded computed blocks |

Narrative free text is already author-controlled; only **computed embeds** need snapshot semantics.

## 3.3 Refresh before finalize

While **draft**, author may **refresh** embed previews from live reference data. On **finalize**, one snapshot write — no automatic refresh after finalize without creating a **new version** (§8).

## 3.4 G7 / G8 on snapshot generation

Embed snapshot generation **must** use the same resolver chain as today (`buildReportProfile` path). No raw pack field reads. **`pack_snapshot` only** at snapshot time.

---

# 4. Cycle scope (confirmation)

**Decision (binding — carries forward):** One **primary cycle** per report document instance (`cycle_id` on persisted entity).

The authoring model **does not reopen** multi-cycle Report. Author selects the cycle explicitly in authoring workspace (**resolves direction for prior OQ-2** at product level: cycle picker is **required** in authoring entry — no silent `in_progress || cycles[0]` as the long-term model).

Bounded trend context in embeds: if an embed includes prior-cycle comparison, same rule as prior contract §4.3 — **immediate prior cycle only**, optional, snapshotted at finalize.

---

# 5. Data model

## 5.1 New persisted entity (required)

**Decision:** Authoring requires a **new database table** — cannot extend `assessments`, `assessment_scores`, or `assessment_cycles` without conflating scoring workflow with communication documents.

**Proposed table name:** `assessment_communication_reports`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Report document id |
| `org_id` | UUID FK | RLS tenancy |
| `assessment_id` | UUID FK | Parent assessment |
| `cycle_id` | UUID FK → `assessment_cycles` | Single-cycle scope |
| `status` | TEXT | `draft` \| `finalized` \| `superseded` |
| `version` | INTEGER | Monotonic per `(assessment_id, cycle_id)` — v1, v2, … |
| `authoring` | JSONB | Section selections + short text (schema §5.2) |
| `embedded_computed` | JSONB \| NULL | Snapshotted computed blocks at finalize |
| `embedded_generated_at` | TIMESTAMPTZ \| NULL | When embed snapshot was taken |
| `created_by` | UUID FK | Original author |
| `last_edited_by` | UUID FK | Last editor |
| `finalized_by` | UUID FK \| NULL | Who locked version |
| `finalized_at` | TIMESTAMPTZ \| NULL | Finalize timestamp |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit |

**Why new table:** Versioning, draft/finalized lifecycle, JSON authoring payload, and RLS distinct from score rows. Matches pattern of separating evidence (scores) from communication (this document).

## 5.2 Authoring JSON shape (minimum contract)

Logical structure — field keys and enums **underspecified** pending clinical template lock (§11 OQ-RA4):

```text
{
  "template_version": "<semver or integer — underspecified>",
  "sections": {
    "<section_id>": {
      "selections": { "<field_id>": "<enum value>" },
      "text": { "<field_id>": "<string>" },
      "embeds": { "<embed_id>": true | false }
    }
  }
}
```

**Not stored in authoring JSON:** full `ReportProfile` — only author inputs and embed toggles. Computed product lives in `embedded_computed` after finalize.

## 5.3 Scoping and versioning rules

| Rule | Value |
|------|--------|
| Scope key | `(assessment_id, cycle_id)` |
| Drafts | **At most one `draft` row** per scope key |
| Finalized | **Immutable** — edits require new version |
| New version | Insert new row with `version + 1`, prior row → `superseded` |
| Multiple finalized versions | **Allowed** — history retained; **one “current” finalized** per scope (highest version not superseded) |

Exact “current version” pointer (**view default**) — **underspecified**, §11 OQ-RA6.

## 5.4 Distinction from `ReportProfile`

| | `ReportProfile` | `assessment_communication_reports` |
|--|-----------------|-----------------------------------|
| Nature | Ephemeral computed projection | Persisted authored document |
| Storage | None (service output) | PostgreSQL JSONB + metadata |
| Body | Domain rows, rollups | Clinician sections + optional embed snapshots |
| G-laws | G6/G7/G8 on generation | G-laws on embed snapshot only (§6) |

---

# 6. G-law boundary for free text

## 6.1 Scope split (binding)

| Content class | G4 | G5 | G7 | G8 |
|---------------|----|----|----|-----|
| **Clinician-authored narrative** (selections + short text) | Applies to **render = print** of that text | **No** — not Matrix marks | **No** — not pack/score resolution | **No** — prose is author-owned |
| **Embedded computed blocks** (snapshotted from `ReportProfile` path) | **Yes** | **Yes** (embedded marks must match Matrix semantics at snapshot time) | **Yes** | **Yes** (`pack_snapshot` at snapshot time) |
| **Live reference panel** (draft only) | N/A — not part of finalized egress | **Yes** while displayed | **Yes** | **Yes** |

**Argument:** G1–G8 were written for **computed marks** and evidence fidelity. Clinician narrative is **professional communication under author responsibility** — analogous to typing in an EHR note, not to Evalis asserting a score. Applying G5 to prose would imply Evalis validates clinical claims — out of scope.

**G4 still binds the finalized artifact:** What the author sees on the finalized preview must match print — including which embeds appear, section order, and text content.

## 6.2 Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Author types a **specific score** in prose that drifts from computed embed | Reference panel shows live values; embed snapshots at finalize; optional UI **non-blocking** hint if prose contains numerals that disagree with snapshot (implementation detail — not required v1) |
| Author omits embed but writes misleading narrative | Clinical QA process; disclaimer footer (existing pattern in `AssessmentReport.tsx`) |
| Stale embed snapshot after Matrix correction | Requires **new report version** after score correction — reopen draft from new version or amend workflow (**underspecified**, §11 OQ-RA7) |

## 6.3 Invariant extension

**INV-RA-G1:** Embedded computed content in a finalized report must be generated exclusively through `buildReportProfile()` (or documented sub-projections thereof) against frozen `pack_snapshot` at finalize time.

---

# 7. PHI acknowledgement and audit (carry forward)

## 7.1 Confirmation

The shipped mechanism **carries forward unchanged in posture** for the **finalized report print path**:

- `artifactKind: 'report'`, namespace `report-export-ack:`
- Print-only gate (OQ-1 resolved): view finalized report without ack; ack before `window.print()`
- Audit: `acknowledgement` + `print`, mode `'standard'`

**Explicit confirmation:** Clinician-authored narrative **increases** PHI sensitivity (identities + clinical interpretation + recommendations). The gate is **at least as necessary** as for the computed-only artifact — not relaxed.

## 7.2 Authoring workspace

**Decision:** Authoring view (`draft` editing) is **authenticated internal workspace** — **no PHI acknowledgement** required to edit (same class as OQ-1: view ≠ egress).

**Decision:** **Draft documents must not expose a finalized Print / Save as PDF path.** Print is available only on **finalized** render view (or finalized preview). Prevents printing incomplete/unreviewed communication.

Microcopy update for dialog (prior OQ-4) remains open — meanings locked in prior contract §5.5, adapted to “communication document” framing when implemented.

---

# 8. Lifecycle and role gating

## 8.1 Roles (recommendation — partial founder scope)

Use existing `UserRole` only — no new roles.

| Action | admin | senior_therapist | therapist | viewer |
|--------|-------|------------------|-----------|--------|
| Open reference data | ✓ | ✓ | ✓ | ✓ |
| Create / edit **draft** report | ✓ | ✓ | **No** | **No** |
| **Finalize** report | ✓ | ✓ | **No** | **No** |
| View **finalized** report | ✓ | ✓ | ✓ | ✓ |
| Print finalized (with PHI gate) | ✓ | ✓ | ✓* | **No** |

\* **Founder scope (§11 OQ-RA2):** Whether `therapist` may PHI-print finalized reports for parents, or only senior roles, is a clinical workflow call. Architecture **recommends allow** print for therapist on **finalized** documents only (read-only participation in distribution).

**Reasoning:** Founder specified **senior clinician** as author — authoring/finalize restricted to `senior_therapist` + `admin`. Therapists remain score authors; external report authorship stays supervisory.

## 8.2 When authoring may begin

| Model | Rule |
|-------|------|
| **Freely during active scoring** | Draft could reference scores still changing — confusing for author |
| **After cycle submitted** | Scores locked for therapist; senior may still edit during review — embed snapshot at finalize could still drift if senior edits scores after |
| **After assessment approved** | Maximum stability; delays report until workflow end |

**Architecture recommendation:** Authoring may open when cycle is **`submitted` or `approved`** for the selected cycle, and that cycle is the **active or most recently completed** administration being reported.

**Exact gate is founder scope** — §11 OQ-RA1. Do **not** silently default in implementation without SPM lock.

## 8.3 Finalize, edit, re-version

| State | Editable? | Print? |
|-------|-----------|--------|
| `draft` | Yes (author roles) | **No** finalized print |
| `finalized` | **No** — create new version to change | Yes (PHI gate) |
| `superseded` | No | Historical read / optional print with version label |

**New version workflow:** Duplicate draft from finalized vN → edit → finalize vN+1 → mark vN `superseded`.

## 8.4 Previously printed versions

Offline PDFs from version v1 are **outside Evalis control** after PHI-gated print. Version v2 does not invalidate distributed v1 PDFs. Finalized render should show **version number** and **finalized_at** on document chrome. Re-print of v2 uses same session ack namespace per assessment (prior contract INV-R8b pattern) — audit log should include `version` in `details` (**architectural recommendation** — exact audit schema extension **underspecified**, §11 OQ-RA8).

---

# 9. Relationship to shipped v1 artifact

## 9.1 Current state

`AssessmentReport.tsx` renders the **entire computed `ReportProfile` as the document** with PHI-gated print. This implemented the **superseded** computed-report contract.

## 9.2 Target architecture (binding direction)

| Surface | Fate |
|---------|------|
| **`AssessmentReport.tsx` computed layout as “the report”** | **Retired** as the product Report |
| **Authoring page** | **New** — section fields + reference panel |
| **Finalized report render / print view** | **New** — renders persisted `authoring` + `embedded_computed` |
| **`ReportDomainSummaryTable`, band distribution components, etc.** | **Repurposed** as (1) reference panel widgets, (2) embed renderers for snapshotted blocks |
| **`buildReportProfile()`** | **Retained** — reference panel live data + finalize-time embed snapshot input |

**Reasoning:** Single page cannot serve both authoring and finalized external communication without violating purpose boundary. Split matches draft vs finalized lifecycle and PHI print rules.

Route naming is implementation detail — logical split: `#/assessment/:id/report/edit` (draft) and `#/assessment/:id/report` or `.../report/view/:version` (finalized).

---

# 10. Product invariants (QA-testable)

## 10.1 Authoring

- [ ] **INV-RA1** Finalized report body comes from `assessment_communication_reports.authoring` + `embedded_computed` — not live `ReportProfile` alone.
- [ ] **INV-RA2** At most one `draft` per `(assessment_id, cycle_id)`.
- [ ] **INV-RA3** `finalized` rows are immutable — changes create new version.
- [ ] **INV-RA4** v1 uses fixed section template — section set not clinician-configurable.

## 10.2 Reference and embeds

- [ ] **INV-RA5** Reference panel uses live `buildReportProfile()` — not persisted as body.
- [ ] **INV-RA6** Embedded computed blocks snapshotted only at finalize (**INV-RA-G1**).
- [ ] **INV-RA7** Matrix score `note` never appears in report render (prior OQ-7).

## 10.3 Display = Export (extends G4)

- [ ] **INV-RA8** Finalized on-screen render matches print scope (extends prior **INV-R5** for finalized artifact).
- [ ] **INV-RA9** Draft cannot use finalized Print / Save as PDF path.

## 10.4 Egress security (extends prior contract)

- [ ] **INV-RA10** Finalized print requires PHI ack + audit (carries **INV-R6**–**INV-R8**).
- [ ] **INV-RA11** Authoring edit view does not require PHI ack (carries **INV-R12**).

## 10.5 Standing exclusions on embeds

- [ ] **INV-RA12** No targets×cycles numeric grid embed (carries prior **INV-R4**).
- [ ] **INV-RA13** No sequence strip in report output (carries prior **INV-R9**).

---

# 11. Open questions and underspecifications

## 11.1 Resolved by this contract

| ID | Resolution |
|----|------------|
| Prior **OQ-2** (cycle picker) | **Direction set:** explicit cycle selection at authoring entry required — exact UX deferred to Builder |
| Prior **OQ-3** (export mode) | **Locked in code:** `'standard'` |

## 11.2 Founder scope — still open

| ID | Question |
|----|----------|
| **OQ-RA1** | Authoring start gate: `submitted` only, `approved` only, or both? |
| **OQ-RA2** | May `therapist` PHI-print finalized reports for parents, or senior/admin only? |

## 11.3 Underspecified — stop before inventing

| ID | Gap |
|----|-----|
| **OQ-RA3** | Max character counts for short text fields |
| **OQ-RA4** | Exact section ids, field ids, and dropdown enum values (clinical template) |
| **OQ-RA5** | Exact provenance metadata keys on embed snapshot |
| **OQ-RA6** | Default “current” finalized version when multiple exist |
| **OQ-RA7** | Workflow when scores are corrected after a finalized report exists |
| **OQ-RA8** | Whether audit `details.version` is required on print events |

## 11.4 Carried forward from prior contract (unchanged)

OQ-4 (microcopy), OQ-5 (appendix), OQ-6 (export route), OQ-8 (report date header), OQ-9 (export-route ack if OQ-6 approved).

---

# 12. Document history

| Date | Change |
|------|--------|
| 2026-08-19 | Initial authoring contract — supersedes computed-report purpose in [`assessment_report_contract.md`](./assessment_report_contract.md); Model A template; `assessment_communication_reports` data model; G-law split; lifecycle/roles; v1 artifact split |
