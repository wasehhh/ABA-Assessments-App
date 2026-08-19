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

## Amendment banner — template lock and lifecycle decisions (2026-08-19)

**Founder review outcome:** Template, lifecycle gates, role print policy, and schema underspecifications from the initial authoring contract (`aba38d9`) are now **binding**.

| Resolved | Decision |
|----------|----------|
| **OQ-RA1** — authoring start gate | **`approved` only** — authoring cannot begin until parent assessment `status === 'approved'` (§8.2) |
| **OQ-RA2** — who may print finalized reports | **`senior_therapist` and `admin` only** — overrides Architecture §8.1 recommendation to allow therapist print (§8.1) |
| **OQ-RA4** — report content template | **Six-section template locked** — full `authoring` + `embedded_computed` schema in §5.2 |
| **OQ-RA7** — post-finalize score correction | **Moot** — score changes after finalize do not occur in ABA practice; no correction re-versioning workflow (§6.2, §8.4) |
| **OQ-RA3, OQ-RA5, OQ-RA6, OQ-RA8** | **Resolved in §5.2–§5.4 and §7.3** — character limits, embed provenance keys, current-version rule, audit `version` field |

**Founder override (explicit):** OQ-RA2 **overrides** the Architecture Agent’s §8.1 recommendation to allow `therapist` PHI-print on finalized documents. Founder reasoning: printing/distributing a finalized report to a parent is a **senior-clinician action**, not a general therapist action.

**Payer-packet boundary (binding):** This Report is **not** a complete payer-authorization packet on its own. Standing exclusions in §1.6 apply.

Superseded pre-amendment text is retained under dated notes in §2.2, §3.1, §8.1, and §8.2.

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

A **senior clinician** (see §8) uses Evalis to **build** the document through **platform-assisted structured authoring**: six fixed sections (§5.2), guided dropdown selections, and bounded short text fields — not AI-generated prose, not a blank word processor, and **not** an auto-rendered dump of assessment scores.

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
| Offers **reference data** from `ReportProfile` while drafting | Authors structured fields per §5.2 |
| Validates required sections before finalize | Holds clinical responsibility for narrative accuracy |
| Snapshots mandatory computed sections at finalize (§3.2) | Writes goals, hours, focus summary, clinical summary |
| Assembles finalized layout for screen + print | Reviews finalized document before PHI-gated print (§7) |

## 1.4 Success statement

After implementation of this contract:

> A senior clinician can open an **authoring workspace** for an **approved** assessment and **single selected cycle**, complete the six-section template (§5.2), **finalize** a versioned communication document with snapshotted Present Levels and target data, and **Print / Save as PDF** the finalized render after PHI acknowledgement with audit-logged egress including report version. The printed document is a clinician-authored communication — not a live auto-generated score dump.

## 1.5 Explicit non-goals

| Out of scope | Reason |
|--------------|--------|
| AI-generated narrative | Vault roadmap Layer 4/5 — separate long-term item; forbidden here |
| Unstructured full-document free authoring | Founder direction: structured assistance only |
| Auto-publishing Report on score entry | Report requires explicit author finalize |
| Replacing Snapshot or Learner Map | Different layers (§1.2) |
| Matrix `note` field in Report body | Prior OQ-7 still binding for score-row notes |
| Complete payer-authorization packet | §1.6 — Evalis holds no data for excluded domains |

## 1.6 Payer-packet boundary and standing exclusions (binding)

Research against payer treatment-report requirements (Carelon Behavioral Health ABA guidelines; BCBA prior-authorization checklist) informed the **six-section v1 template** (§5.2). Evalis supports **assessment-derived present levels, target skills, SMART-style goals, therapy hours, and clinical summary** — not a full authorization file.

**The Assessment Report is not a complete payer-authorization packet.** Clinics may attach it to submissions; Evalis does not model everything payers sometimes request.

**Standing exclusions — do not build, do not defer silently:**

| Excluded content | Reason |
|------------------|--------|
| Biopsychosocial / medical history | No Evalis data model |
| Functional behaviour assessment (ABC / antecedent–consequence data) | No Evalis data model |
| Crisis plans | No Evalis data model |
| Caregiver-training logs | No Evalis data model |
| Care-coordination notes with prescribers / other providers | No Evalis data model |
| Supervision-ratio documentation | No Evalis data model |
| CPT billing codes | Practice-management / billing scope — not Evalis |
| Physician referral / consent tracking | No Evalis data model |

Adding any excluded section requires a **separate product strategy** and data model — not a Report template amendment alone.

---

# 2. Authoring model

## 2.1 Structures compared

### Model A — Fixed section template

Predefined sections in fixed order (§5.2). Each section: **computed blocks**, **guided selects**, and/or **short text fields** with contract-defined character bounds.

**Pros:** Matches founder direction; predictable parent/school/funder packets; bounded v1; compliance-friendly consistency.  
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

### Bounded hybrid (within Model A — superseded 2026-08-19)

> **Superseded:** Optional per-section embed toggles for computed widgets. The locked six-section template (§5.2) defines **mandatory** computed sections (Overview, Present Levels, Target Skills list) and **authored** sections — no clinician toggles for Present Levels.

Section **order** and **section set** are fixed in v1. Adding or removing sections requires a contract amendment.

---

# 3. Reference-data integration

## 3.1 Roles of computed data

`ReportProfile` (via `buildDomainProfiles()` + `buildAssessmentLandscapeRollup()`) is **reference and optional embed source** — never the report body by default.

| Surface | Binding | Live vs snapshotted |
|---------|---------|-------------------|
| **Authoring reference panel** | Read-only; optional convenience while drafting | **Live** until finalize |
| **Finalized document — authored fields** | Persisted in `authoring` JSONB | N/A — clinician text / selections |
| **Finalized document — computed sections** | Overview, Present Levels, Target Skills target list | **Snapshotted at finalize** in `embedded_computed` (§3.2) |
| **Present Levels of Performance** | **Always included** — core document section, not optional | **Snapshotted at finalize** — mandatory embed |

## 3.2 Snapshot at finalize (recommended — binding)

**Decision:** Embedded computed elements are **frozen into the persisted report document at finalize time**, not live-rebound at print.

**Reasoning:**

1. **G8 alignment:** A communication record for a cycle should reflect the assessment **as understood when the senior clinician signed the report**, not scores that changed afterward.
2. **G4 simplification:** Print renders the **finalized** document store; display = export within that frozen authored+embedded payload.
3. **Drift prevention:** Live-bound embeds at print would let Matrix edits change the PDF after authoring — clinically unsafe for external distribution.

**Mechanics:**

- On **finalize**, run `buildReportProfile()` once against `pack_snapshot` + cycle scores; project into `embedded_computed` per §5.2 (Overview, Present Levels, Target Skills target lists).
- Persist **provenance** keys on `embedded_computed.provenance` (§5.2) and top-level `embedded_generated_at` on the row.
- **Draft** may preview live computed sections; **draft must not be PHI-gated printable** (§7).

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

## 5.2 Authoring and embedded JSON schema (binding — resolves OQ-RA4, OQ-RA3, OQ-RA5)

**Template version:** `template_version: 1` (integer; increment only on contract-amended template changes).

**Fixed render order (binding):**

| Order | Section | Source |
|-------|---------|--------|
| 1 | Overview | `embedded_computed.overview` |
| 2 | Present Levels of Performance (Baseline) | `embedded_computed.present_levels` |
| 3 | Target Skills / Areas of Focus | `embedded_computed.target_skills` + `authoring.sections.target_skills_focus` |
| 4 | Measurable Treatment Goals | `authoring.sections.measurable_treatment_goals` |
| 5 | Recommended Therapy Hours | `authoring.sections.recommended_therapy_hours` |
| 6 | Clinical Summary | `authoring.sections.clinical_summary` |

### 5.2.1 `authoring` JSONB (clinician inputs only)

Computed Overview / Present Levels / target rows are **not** stored here — they live in `embedded_computed` after finalize.

```json
{
  "template_version": 1,
  "sections": {
    "target_skills_focus": {
      "focus_summary": "<string>"
    },
    "measurable_treatment_goals": {
      "goals": [
        {
          "id": "<uuid>",
          "domain_id": "<string — pack domain_id>",
          "goal_statement": "<string>",
          "mastery_criterion": "<string>",
          "target_timeframe": "3_months | 6_months | 12_months"
        }
      ]
    },
    "recommended_therapy_hours": {
      "weekly_hours": "<number>",
      "clinical_justification": "<string>"
    },
    "clinical_summary": {
      "narrative": "<string>"
    }
  }
}
```

#### Section-by-section field contract

| Section key | Clinician-facing title | Fields | Type / enum | Max length or bound | Required at finalize |
|-------------|------------------------|--------|-------------|---------------------|----------------------|
| *(computed)* | Overview | — | — | — | Auto (§5.2.2) |
| *(computed)* | Present Levels of Performance (Baseline) | — | — | — | Auto — **always** (§5.2.2) |
| `target_skills_focus` | Target Skills / Areas of Focus | `focus_summary` | string | **1 500** chars | **Yes** — non-empty trim |
| `measurable_treatment_goals` | Measurable Treatment Goals | `goals[]` | array | **1–35** goals total; **≤10** per `domain_id` | **Yes** — ≥1 goal |
| | | `goals[].id` | uuid | Client-generated stable id per row | Per goal |
| | | `goals[].domain_id` | string | Must match `pack_snapshot.domains[].domain_id` | Per goal |
| | | `goals[].goal_statement` | string | **800** chars — observable/measurable behaviour | Per goal |
| | | `goals[].mastery_criterion` | string | **300** chars — frequency/%/trials wording (free text for payer flexibility) | Per goal |
| | | `goals[].target_timeframe` | enum | `3_months` \| `6_months` \| `12_months` | Per goal |
| `recommended_therapy_hours` | Recommended Therapy Hours | `weekly_hours` | number | **0–168** inclusive; up to **1** decimal place | **Yes** |
| | | `clinical_justification` | string | **1 200** chars | **Yes** — non-empty trim |
| `clinical_summary` | Clinical Summary | `narrative` | string | **4 000** chars | **Yes** — non-empty trim |

**Character limit reasoning (OQ-RA3):**

| Class | Limit | Reason |
|-------|-------|--------|
| Mastery criterion | 300 | Single-line payer fields (“80% across 3 sessions”) |
| Goal statement | 800 | SMART goal sentence(s) without essay length |
| Focus summary | 1 500 | Short paragraph on priority skills — no per-target UI in v1 |
| Hours justification | 1 200 | Tied justification, not full narrative |
| Clinical summary | 4 000 | Wrap-up narrative — longest authored field |

**No per-target flagging UI in v1** for Target Skills — computed list + `focus_summary` only (founder binding).

**Domains for goals:** Clinician adds goal rows for **subset of domains** — not forced for every domain. Empty domains omit goal rows.

### 5.2.2 `embedded_computed` JSONB (finalize snapshot — resolves OQ-RA5)

Populated **only** when `status` transitions to `finalized`. Generated via `buildReportProfile()` (+ Overview metadata enrichment) — **INV-RA-G1**.

```json
{
  "provenance": {
    "snapshot_at": "<ISO8601 — mirrors embedded_generated_at>",
    "pack_title": "<string>",
    "pack_version": "<string>",
    "assessment_id": "<uuid>",
    "cycle_id": "<uuid>",
    "cycle_number": "<integer>",
    "pack_snapshot_frozen": true
  },
  "overview": {
    "client_name": "<string | null>",
    "client_id": "<uuid | null>",
    "pack_title": "<string>",
    "pack_version": "<string>",
    "assessment_id": "<uuid>",
    "cycle_id": "<uuid>",
    "cycle_number": "<integer>",
    "cycle_start_date": "<ISO date | null>",
    "cycle_end_date": "<ISO date | null>",
    "assessment_date": "<ISO date | null>",
    "authoring_clinician_name": "<string — finalized_by display name>",
    "authoring_clinician_user_id": "<uuid — finalized_by>"
  },
  "present_levels": {
    "rollup": "<AssessmentLandscapeRollup>",
    "assessment_band_distribution": "<StateDistribution>",
    "domains": [
      {
        "domain_id": "<string>",
        "title": "<string>",
        "coverage": { "scored": "<number>", "total": "<number>" },
        "points_captured_percentage": "<number>",
        "state_distribution": "<StateDistribution>",
        "domain_summary_row": "<same shape ReportDomainSummaryTable consumes>"
      }
    ]
  },
  "target_skills": {
    "domains": [
      {
        "domain_id": "<string>",
        "title": "<string>",
        "targets": [
          {
            "target_id": "<string>",
            "title": "<string>",
            "display_score_with_max": "<string>",
            "competency_state": "<CompetencyState>",
            "normalized_ratio": "<number | null>"
          }
        ]
      }
    ]
  }
}
```

**Provenance keys (exact — OQ-RA5):** `provenance.snapshot_at`, `provenance.pack_title`, `provenance.pack_version`, `provenance.assessment_id`, `provenance.cycle_id`, `provenance.cycle_number`, `provenance.pack_snapshot_frozen` (always `true`).

**Present Levels:** Always present in `embedded_computed.present_levels` — maps to `ReportProfile.rollup`, `assessmentBandDistribution`, and per-domain summary/distribution (existing `ReportDomainSummaryTable` / `ReportDomainScoreDistribution` data). **Not** an optional toggle.

**Target Skills computed list:** `embedded_computed.target_skills` — projection of `ReportProfile.domains[].targets` **excluding** Matrix `note` (prior OQ-7).

**Overview:** No clinician fields; populated from assessment/cycle/user metadata at finalize.

### 5.2.3 Finalize validation (binding)

Builder must block finalize unless:

1. Parent `assessments.status === 'approved'` (§8.2).
2. All **Required at finalize** rows in §5.2.1 table satisfied.
3. Every `goals[].domain_id` exists in frozen `pack_snapshot`.
4. `embedded_computed` successfully written on finalize transition.

### 5.2.4 Builder completeness statement

The schema above is **complete for data model and authoring UI product decisions** for v1, except:

| Remaining gap | Owner |
|---------------|--------|
| PHI dialog microcopy (prior OQ-4) | Founder / UX — meanings locked in prior contract |
| Report date header vs `generatedAt` (prior OQ-8) | Founder — finalized chrome only |
| Exact route paths | Implementation |

No further section list, field id, enum, or character-bound decisions are required before Builder starts persistence and authoring forms.

## 5.3 Scoping and versioning rules

| Rule | Value |
|------|--------|
| Scope key | `(assessment_id, cycle_id)` |
| Drafts | **At most one `draft` row** per scope key |
| Finalized | **Immutable** — edits require new version |
| New version | Insert new row with `version + 1`, prior row → `superseded` |
| Multiple finalized versions | **Allowed** — history retained |

**Current finalized version (OQ-RA6 — binding):** For scope key `(assessment_id, cycle_id)`, the **current** finalized document is the row with **`status = 'finalized'`** and the **maximum `version`**. View and print default to that row without requiring the user to pick a version. Older finalized rows have `status = 'superseded'`. Tie-break: `version` is monotonic — no separate `finalized_at` sort needed for “current” selection.

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
| Author types a **specific score** in prose that drifts from computed embed | Reference panel shows live values at draft time; mandatory computed sections snapshotted at finalize; optional UI **non-blocking** hint if prose numerals disagree with snapshot (not required v1) |
| Author writes misleading narrative vs Present Levels | Clinical QA; disclaimer footer; senior-only finalize and print (§8) |
| Score correction after finalize | **Not applicable (founder OQ-RA7):** In ABA practice, scores do not change after a finalized communication report is issued. Evalis does not design a post-finalize score-correction re-versioning workflow. Pre-finalize consistency is covered by **`approved` gate** (§8.2) and **G8** frozen `pack_snapshot`. **Voluntary** new report version (§8.3) remains for intentional document amendments only — not score-correction driven |

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

## 7.3 Audit payload extensions (binding — resolves OQ-RA8)

Print and acknowledgement events on a **finalized** report **must** include report **`version`** in audit `details`:

| User action | `event` | `channel` | Required `details` |
|-------------|---------|-----------|----------------------|
| PHI ack confirmed | `acknowledgement` | `print` | `artifact: 'report'`, `mode: 'standard'`, **`version: <integer>`** |
| In-app Print / Save as PDF | `print` | `print` | `artifact: 'report'`, `mode: 'standard'`, **`version: <integer>`** |

`version` is the **`assessment_communication_reports.version`** of the finalized row being printed. Extends [`assessment_report_contract.md`](./assessment_report_contract.md) §5.6 / §5.8 pattern — not a new event name.

---

# 8. Lifecycle and role gating

## 8.1 Roles (binding — resolves OQ-RA2)

Use existing `UserRole` only — no new roles.

| Action | admin | senior_therapist | therapist | viewer |
|--------|-------|------------------|-----------|--------|
| Open reference data / view draft | ✓ | ✓ | ✓ | **No** |
| Create / edit **draft** report | ✓ | ✓ | **No** | **No** |
| **Finalize** report | ✓ | ✓ | **No** | **No** |
| View **finalized** report | ✓ | ✓ | ✓ | ✓ |
| **Print** finalized (PHI gate) | ✓ | ✓ | **No** | **No** |

**Binding:** Only `senior_therapist` and `admin` may invoke finalized Print / Save as PDF (after PHI acknowledgement). Therapists may **view** finalized reports internally but **must not** distribute via product print egress.

**Reasoning:** Founder — printing/distributing to parents is senior-clinician responsibility; aligns with authoring/finalize restriction.

### Superseded text — pre-amendment §8.1 (2026-08-19, retained for history)

> Print finalized (with PHI gate): therapist ✓* — Architecture **recommends allow** print for therapist on **finalized** documents only.

**Supersession note (2026-08-19):** Founder **overrode** therapist print. Table above is authoritative.

## 8.2 When authoring may begin (binding — resolves OQ-RA1)

**Decision:** Report authoring **cannot begin** until the parent assessment is **`approved`**.

| Gate | Rule |
|------|------|
| **Required** | `assessments.status === 'approved'` for the selected `assessment_id` |
| **Cycle** | Author selects `cycle_id` explicitly at entry — report documents that single administration (§4) |
| **Blocked** | Draft create/open when status is `draft`, `in_progress`, or `submitted` |

**Reasoning:**

1. **Founder binding:** Senior clinician approval must precede external communication authoring.
2. **Data stability:** Approved assessments are score-immutable in Evalis ([`assessment_lifecycle.md`](../product/assessment_lifecycle.md); `assessmentScoreEditRules.ts`) — embed snapshot at finalize aligns with frozen evidence.
3. **Platform mapping:** Evalis records approval at **assessment** level; the report’s `cycle_id` identifies which cycle the communication covers. There is no separate cycle-approval status in schema today.

Authoring entry UI must explain when approval is missing — exact copy is implementation (OQ-4 class).

### Superseded text — pre-amendment §8.2 (2026-08-19, retained for history)

> Architecture recommendation: authoring may open when cycle is **`submitted` or `approved`**. Exact gate is founder scope — OQ-RA1.

**Supersession note (2026-08-19):** **`approved` only** — OQ-RA1 locked.

## 8.3 Finalize, edit, re-version

| State | Editable? | Print? |
|-------|-----------|--------|
| `draft` | Yes (author roles) | **No** finalized print |
| `finalized` | **No** — create new version to change | Yes (PHI gate) |
| `superseded` | No | Historical read / optional print with version label |

**New version workflow:** Duplicate draft from finalized vN → edit → finalize vN+1 → mark vN `superseded`.

## 8.4 Previously printed versions and score stability

Offline PDFs from version *N* are **outside Evalis control** after PHI-gated print. A later version *N+1* does not invalidate distributed PDFs. Finalized render must show **`version`** and **`finalized_at`** on document chrome.

**Score changes after finalize (OQ-RA7 — moot):** Founder — does not occur in ABA practice. No product workflow for “Matrix corrected after report finalized.” G8 and the **`approved`** gate ensure evidence stability **before** finalize. Intentional report amendments use §8.3 voluntary new version only.

Re-print of a finalized version uses the same session ack namespace per assessment; audit **`version`** must match the row printed (§7.3).

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
- [ ] **INV-RA4** v1 uses fixed six-section template (§5.2) — section set not clinician-configurable.
- [ ] **INV-RA14** `embedded_computed.present_levels` is **always** populated on finalize — not optional.
- [ ] **INV-RA15** Draft create/open blocked unless `assessments.status === 'approved'`.

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
- [ ] **INV-RA16** Only `senior_therapist` and `admin` may invoke finalized print egress.
- [ ] **INV-RA17** Print and acknowledgement audit `details` include `version` (§7.3).

## 10.5 Standing exclusions on embeds

- [ ] **INV-RA12** No targets×cycles numeric grid embed (carries prior **INV-R4**).
- [ ] **INV-RA13** No sequence strip in report output (carries prior **INV-R9**).
- [ ] **INV-RA18** Report must not include §1.6 standing exclusions (biopsychosocial, FBA, CPT codes, etc.).

---

# 11. Open questions and underspecifications

## 11.1 Resolved

| ID | Decision | Date |
|----|----------|------|
| Prior **OQ-2** (cycle picker) | Explicit cycle selection at authoring entry | 2026-08-19 |
| Prior **OQ-3** (export mode) | `'standard'` locked in code | 2026-08-19 |
| **OQ-RA1** | Authoring start: **`approved` only** (§8.2) | 2026-08-19 |
| **OQ-RA2** | Print finalized: **`senior_therapist` + `admin` only** — overrides prior §8.1 recommendation (§8.1) | 2026-08-19 |
| **OQ-RA3** | Character limits per field — §5.2.1 table | 2026-08-19 |
| **OQ-RA4** | Six-section template + JSON schema — §5.2 | 2026-08-19 |
| **OQ-RA5** | Embed provenance keys — §5.2.2 `provenance.*` | 2026-08-19 |
| **OQ-RA6** | Current finalized = max `version` where `status = 'finalized'` (§5.3) | 2026-08-19 |
| **OQ-RA7** | Post-finalize score correction **moot** — no workflow (§6.2, §8.4) | 2026-08-19 |
| **OQ-RA8** | Audit `details.version` **required** on print/ack (§7.3) | 2026-08-19 |

## 11.2 Still open

| ID | Question |
|----|----------|
| Prior **OQ-4** | Exact PHI acknowledgement microcopy for Report |
| Prior **OQ-5** | Acquisition/regression appendix (strategy-deferred) |
| Prior **OQ-6** | Dedicated Report export route in v1 |
| Prior **OQ-8** | Report date header vs `generatedAt` on finalized chrome |
| Prior **OQ-9** | Export-route acknowledgement scope if OQ-6 approved — **untouched** |

---

# 12. Document history

| Date | Change |
|------|--------|
| 2026-08-19 | Initial authoring contract — supersedes computed-report purpose in [`assessment_report_contract.md`](./assessment_report_contract.md); Model A template; `assessment_communication_reports` data model; G-law split; lifecycle/roles; v1 artifact split |
| 2026-08-19 | Template lock amendment — six-section schema §5.2; OQ-RA1/RA2/RA4/RA7 resolved; RA3/RA5/RA6/RA8 folded into schema; OQ-RA2 overrides §8.1 therapist-print recommendation; §1.6 payer exclusions |
