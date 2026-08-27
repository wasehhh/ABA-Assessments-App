# Assessment Report Authoring Contract (Layer 2C)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Report — clinician-authored communication artifact |
| **Milestone** | Layer 2C purpose reframe (founder decision 2026-08-19) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Code inspection 2026-08-19 (authoring reframe) + 2026-08-26 body-cut verification: `FinalizedReportDocument.tsx`, `finalizedReportPresentation.ts`, `reportEmbeddedComputed.ts`, `assessmentReportClinicalExport.test.ts`, prior report/export paths |
| **References** | [`assessment_report_contract.md`](./assessment_report_contract.md) (supersedes §1–§2 and related sections — §0 below) · [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.6 · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) G4–G8 · [`security_and_roles.md`](./security_and_roles.md) · [`assessment_lifecycle.md`](../product/assessment_lifecycle.md) · vault `(C) G1–G8 Runtime Laws.md` (read for this contract; not in repo) · vault `06 Roadmap/(C) Evalis Roadmap.md` §7 AI narrative (rule name only; not in repo) |
| **Non-goals** | Implementation · UI pixel design · AI-generated narrative · Snapshot / Learner Map redesign · PHI gate redesign (carry forward) · CSV export · version-history browsing · print geometry · tablet/header/T2 · Builder Phase D · unrelated OQ-2 / OQ-9 from prior contract unless forced |

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

## Amendment banner — finalized communication body cut (2026-08-25 / 2026-08-26)

**Founder direction (2026-08-25):** The finalized report “includes way too much (domain summary, every single domain and its targets, etc.) — it should be more of a write-up report with macro summary stats.”

**Problem:** Authoring was reframed as clinician-authored communication (2026-08-19). The **finalized render** still shipped the computed-report body: Assessment Score Distribution, Domain Summary, per-domain distributions, and exhaustive per-domain target lists with scores (`FinalizedReportDocument.tsx` / `FINALIZED_REPORT_SECTION_ORDER`). That is Snapshot-shaped evidence inside a Layer 2C communication document.

**Binding outcomes of this amendment (detail in §1.7, §3.5, §5.2):**

| Topic | Decision |
|-------|----------|
| **Surviving finalized body** | Overview · Present Levels (**change metrics** / first-assessment present-state — §1.8) · Target Skills **authored focus only** · Measurable Treatment Goals · Recommended Therapy Hours · Clinical Summary |
| **Removed from finalized body** | Assessment Score Distribution · Domain Summary table · per-domain score distributions · per-domain exhaustive target lists with `display_score_with_max` / competency |
| **Embed vs render** | Trim **both** — slim `embedded_computed` on new finalizes; render **never** shows removed blocks even if old fat embeds exist |
| **Full evidence** | Assessment Snapshot (Layer 2A) — Report must not duplicate it |
| **Authoring reference panel** | **Unchanged** — full live `ReportProfile` remains for the drafting clinician |
| **Authoring form fields** | Six-slot template **inputs** unchanged (clinician still fills focus, goals, hours, summary) |
| **Note-leak guard** | Extending `NOTE_LEAK_PROBE` + `renderToStaticMarkup` to `FinalizedReportDocument` is **bound to this slice** |

**Grounding (not inverted from current widgets):** ABA/payor communication practice (Horizon Blue Concurrent Progress Report guidelines; NYSABA annual progress report cover sheet; reauthorization progress-report guidance) centres identifying info, **brief** progress/summary, **selected** goals with measurable criteria, hours/justification, and narrative — not an exhaustive scored-target dump. Exhaustive evidence belongs in clinical workspace artifacts (here: Snapshot). Distribution charts and every-target lists answer “what was scored?” — Snapshot’s question — not “what should an external reader understand?”

Supersedes prior “mandatory Present Levels = full rollup + distributions + domain tables” and “Target Skills = focus + computed target list” readings in §3.1 / §5.2 for the **finalized document**. Historical text remains below under this banner’s control.

---

## Amendment banner — Present Levels change metrics (2026-08-26)

**Founder rejection:** Orientation macros (points %, coverage, domain count) are **non-clinical leftovers**. A family/funder document must carry **change against a baseline**, not administration completeness.

**Framing error named (do not recur):** The body cut asked which surviving numbers were least objectionable. That inverted the question. Coverage answers how complete Evalis’s administration was — not what happened for the learner. External ABA progress / reauthorization practice reports **baseline-versus-current** movement (skill acquisition counts, behaviour reduction before/after, standardized score movement). Concrete numeric change supports medical necessity; a standing present-state picture does not.

**Binding outcomes (detail in §1.7.5, §1.8):**

| Topic | Decision |
|-------|----------|
| **Present Levels content** | **Change metrics** — competency-state **transition counts** only — not coverage / domain-count orientation, not aggregate percentages |
| **Comparisons** | Against **immediately previous cycle** and **first cycle**, as **two lines** (founder — completeness over previous-only) — **superseded 2026-08-27** by per-target last/first-scored |
| **Collapse** | On cycle 2, previous **is** first — **one** comparison line only — **superseded 2026-08-27** by same-anchor collapse |
| **First assessment** | Explicit first-assessment framing + current Demonstrated / Emerging / Not Demonstrated counts (no absent-change misread as no progress) |
| **Movement unit** | Competency states via Layer 0 `scoreInterpretation` / product labels (`STATE_DISPLAY_LABELS`) — **not** raw score deltas (SPM) |
| **Regression** | **Always reported** when present — never omit (SPM) |
| **Goals mastered** | **Forbidden** as a computed metric — authored free-text goals have no mastery computation (SPM) |
| **Unscored transitions** | Full matrix §1.8.2 — Unscored↔scored **excluded** from improved/regressed; reported as newly assessed / no longer scored |
| **Embed** | Snapshot **computed results** (+ comparison provenance), not raw score arrays (§5.2.2) |
| **Unchanged** | Body-cut removals · Model B · reference panel · authored input sections |

**Supersedes** §1.7.5 orientation-macro reading and `present_levels.macro` orientation fields. OQ-RA11 / OQ-RA13 **moot** (§11).

---

## Amendment banner — per-target last-scored refinement (2026-08-27)

**Founder refinement of Ruling H:** Ruling H (Unscored→scored is newly assessed, not improved) holds **only where a target has never been assessed before**. Otherwise, always compare against the score from the **last prior cycle in which that target was scored**.

**Why (build to the reason):** Partial administrations are normal ABA practice — some domains this period, others next. Cycle-to-cycle comparison treats a skill scored in cycle 1 and again in cycle 3 as Unscored→scored against blank cycle 2, and reports **newly assessed** when the movement is real. The per-cycle model was wrong for the **common** case.

**Binding outcomes (detail in §1.8):**

| Topic | Decision |
|-------|----------|
| **Comparison unit** | **Per-target** last-scored / first-scored — not whole-cycle vs previous / vs cycle 1 |
| **Input** | Scores for **every prior cycle** (§1.8.3) |
| **Baseline line** | Per-target **first-scored** (earliest cycle that target was scored) — not “cycle 1” |
| **Collapse** | When a target’s first-scored and last-scored cycles are the **same**, that target’s movement counts on **one** line only |
| **Line labels** | Method labels, not cycle names — proposed copy §1.8.8 (**OQ-RA10**) |
| **Interval** | **No single document period** that pretends all skills share one window — span of comparison anchors (§1.8.6) |
| **Provenance** | Method + per-line cycle histogram / span — not full per-target map, not raw scores (§5.2.2) |

**Supersedes** cycle-level `previousCycleScores` + `firstCycleScores`, cycle-named comparison lines, and single cycle-pair interval (§1.8.3–§1.8.6 prior reading). OQ-RA16 / OQ-RA17 disposition updated (§11).

---

## Amendment banner — remove overall percentage (2026-08-27)

**Founder ruling (binding):** Drop the overall points-captured figure **entirely**. It does not appear on any comparison line, in any mode, including first assessment.

**Why (remove cleanly, not leave hooks):** Under per-target anchoring, both endpoints of `from% → to%` were **synthetic score sets** — each target’s last-scored or first-scored state drawn from different cycles. A percentage stitched from March, September, and last year describes a moment the learner was never in. The founder had approved the figure as movement before per-target refinement; shown the consequence, he removed the **class** of aggregate figure — not one instance.

**Binding outcomes:**

| Topic | Decision |
|-------|----------|
| **Present Levels numerics** | **Transition counts only** (+ first-assessment competency-state counts) — §1.8.5 |
| **Removed** | `overall_points_captured`, `points_captured_percentage`, `from% → to%`, standing % on first assessment, skill-weighting caveats that qualified only the removed figure |
| **`template_version`** | **5** — embed schema drops aggregate percentage fields |
| **OQ-RA15 / OQ-RA18** | **Superseded** — no synthetic denominator remains (§11) |

**Unchanged:** Per-target transition rules · interval (anchor span) · provenance depth · authored sections · reference panel · Model B.

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
| Communication reports table + finalize embed builder | `20260819_assessment_communication_reports.sql`; `reportEmbeddedComputed.ts`; `FinalizedReportDocument.tsx` |
| Finalized section order (pre–body-cut) | `FINALIZED_REPORT_SECTION_ORDER` in `finalizedReportPresentation.ts` |
| Note-leak probe covers shared report widgets, not finalized document render | `assessmentReportClinicalExport.test.ts` (`NOTE_LEAK_PROBE` + `renderToStaticMarkup`); finalized path uses **source-text** match only |
| Competency states + product labels | `CompetencyState` in `scoreInterpretation.ts`; `STATE_DISPLAY_LABELS` in `stateDisplay.ts` (`unscored` / `not_yet`→Not Demonstrated / `in_progress`→Emerging / `at_maximum`→Demonstrated) |
| `buildReportProfile` prior scores are **singular** | `BuildReportProfileInput.previousScores?: AssessmentScore[]` — `reportProfile.ts` — **insufficient** for per-target last-scored finalize (§1.8.3) |
| Points-captured % definition | `AssessmentLandscapeRollup.pointsCapturedPercentage` — `assessmentLandscape.ts`; **not** used in Report Present Levels (reference panel / `ReportProfile` only) |
| Cycle interval fields | `assessment_cycles.start_date`, `end_date`, `cycle_number` — `types/index.ts`; **order key = `cycle_number`**, not timestamps |

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
| Snapshots Overview + **Present Levels change metrics** at finalize (§3.2, §3.5, §1.8) | Writes goals, hours, focus summary, clinical summary |
| Assembles finalized layout for screen + print | Reviews finalized document before PHI-gated print (§7) |

## 1.4 Success statement

After implementation of this contract (including the 2026-08-25 body cut and 2026-08-26 change-metrics amendment):

> A senior clinician can open an **authoring workspace** for an **approved** assessment and **single selected cycle**, complete the authored sections of the six-section template (§5.2), **finalize** a versioned **write-up** communication document whose Present Levels carry **clinically meaningful change** (per-target competency-state movement since each skill was last and first scored, or first-assessment present-state counts) — not coverage/domain orientation and not distributions or exhaustive target lists — and **Print / Save as PDF** after PHI acknowledgement with audit-logged egress including report version. Readers who need every scored target use the **Assessment Snapshot**. The printed document is clinician-authored communication — not a live or frozen score dump.

## 1.5 Explicit non-goals

| Out of scope | Reason |
|--------------|--------|
| AI-generated narrative | Vault roadmap Layer 4/5 — separate long-term item; forbidden here |
| Unstructured full-document free authoring | Founder direction: structured assistance only |
| Auto-publishing Report on score entry | Report requires explicit author finalize |
| Replacing Snapshot or Learner Map | Different layers (§1.2) |
| Matrix `note` field in Report body | Prior OQ-7 still binding for score-row notes |
| Complete payer-authorization packet | §1.6 — Evalis holds no data for excluded domains |
| Reproducing Snapshot’s per-domain / per-target evidence grid in the Report | Body cut 2026-08-25 — structural duplication (§1.7) |
| Computed “goals mastered” / goal-attainment counts | Authored Measurable Treatment Goals have no mastery computation (SPM — §1.8.1) |
| Orientation macros as Present Levels (coverage, domain count, standing points %) | Rejected 2026-08-26 — non-clinical; superseded by change metrics (§1.7.5) |

## 1.6 Payer-packet boundary and standing exclusions (binding)

Research against payer treatment-report requirements informed the **authored** v1 template (goals, hours, summary). Evalis supports **assessment-derived Present Levels change metrics, authored focus, SMART-style goals, therapy hours, and clinical summary** — not a full authorization file.

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

## 1.7 Finalized body cut — section set, Snapshot boundary, Present Levels

### 1.7.1 Models compared (what belongs in a *communication* document)

| Model | Finalized body | Verdict |
|-------|----------------|---------|
| **A — Keep current six-section computed dump** | Overview + full Present Levels (rollup + assessment distribution + domain summary + per-domain distributions) + focus + **every target with score** + goals + hours + summary | **Rejected** — founder direction; duplicates Snapshot; inverted “what we compute → what we print” |
| **B — Drop only target lists; keep all Present Levels charts/tables** | Macro + distributions + domain tables + authored sections | **Rejected** — domain summary / band charts still answer evidence-grid questions for external readers |
| **C — Write-up + orientation rollup** | Overview + coverage / points % / domain count + authored focus + goals + hours + summary | **Rejected 2026-08-26** — orientation answers administration completeness, not learner change |
| **D — Write-up + change metrics** (**selected**) | Overview + **Present Levels change metrics** (§1.7.5, §1.8) + authored focus (no target list) + goals + hours + summary | **Adopted** — matches write-up intent and ABA progress/reauth framing; Snapshot owns exhaustive evidence |

### 1.7.2 Surviving finalized sections (binding)

| Order | Section | Provenance | Why it belongs in a *communication* document |
|------:|---------|------------|-----------------------------------------------|
| 1 | **Overview** | `embedded_computed.overview` (snapshotted metadata) | External readers need who / which pack / which cycle / who authored — identity, not evidence |
| 2 | **Present Levels of Performance** | `embedded_computed.present_levels` — **change metrics** or **first-assessment present-state** (§1.8) | Parents/funders need **what changed** (or an explicit baseline on first assessment) — not coverage of Evalis scoring |
| 3 | **Target Skills / Areas of Focus** | **`authoring` only** — `focus_summary` | Clinician names priorities for the reader; not a reprint of Matrix |
| 4 | **Measurable Treatment Goals** | `authoring` | Communication core — selected forward-looking goals (payor/parent expectation) |
| 5 | **Recommended Therapy Hours** | `authoring` | Recommendation + justification for funders / care planning |
| 6 | **Clinical Summary** | `authoring` | Plain-language wrap-up for the external reader |

### 1.7.3 Removed from finalized body (binding — do not render)

| Removed block | Prior source | Why removed |
|---------------|--------------|-------------|
| Assessment Score Distribution | `present_levels.assessment_band_distribution` | Band histograms are clinician workspace / Snapshot-adjacent; not parent/funder write-up content |
| Domain Summary table | `present_levels.domains` → `ReportDomainSummaryTable` | Per-domain rollup table duplicates Snapshot’s domain structure without narrative |
| Per-domain score distributions | `present_levels.domains[].state_distribution` | Same class of evidence detail |
| Exhaustive target lists with scores / competency | `target_skills.domains[]` | **Structural Snapshot duplication** (§1.7.4) |
| Orientation macros (coverage, domain count, standing points %) | Body-cut `present_levels.macro` | **Non-clinical** — superseded by change metrics (2026-08-26) |

### 1.7.4 Redundancy with Assessment Snapshot (structural)

Layer 2A Snapshot is Evalis’s **exhaustive evidence record** — every domain, every target, scores, exportable/printable — answering “what exactly was scored?”

The finalized Report’s per-domain target lists with `display_score_with_max` and competency **reproduced that job inside Layer 2C**. That is not a taste trim; it is a **layer-boundary violation**. Any subset that “feels useful” for a family still belongs in Snapshot unless the clinician **authors** it into focus/goals/summary.

**What a reader does for full evidence:** open the **Assessment Snapshot** for this assessment (and print/export Snapshot under its own PHI/audit rules). The Report must make that path discoverable (**OQ-RA9** — footer vs authoring chrome).

### 1.7.5 Present Levels metric set (binding — replaces orientation macros)

**Rejected (orientation):** points captured %, coverage (scored/total targets), domain count — answers about Evalis administration completeness.

**Adopted (change):** competency-state **transition counts** between assessment periods. Grounding: ABA progress / reauthorization materials emphasise baseline-versus-current change, not standing present-state dumps or synthetic pack-wide rollups.

#### Numeric scope (binding — standing property)

The finalized Present Levels section carries **counts of real per-target competency transitions** — and, on first assessment only, **current competency-state counts** (Demonstrated / Emerging / Not Demonstrated / Unscored). It carries **no aggregated percentage, composite score, index, or pack-wide rollup figure** of any kind.

Present Levels is **not** an empty container: it holds the transition-count metrics below and the first-assessment present-state block (§1.8.4). Overview holds identity and administration metadata; authored sections hold goals, hours, and narrative. A future reader adding a “summary figure” should treat §1.8.5 as the constraint, not a changelog footnote.

#### Vocabulary (binding)

| Internal `CompetencyState` | Product display label (`STATE_DISPLAY_LABELS`) |
|----------------------------|-----------------------------------------------|
| `unscored` | Unscored |
| `not_yet` | Not Demonstrated |
| `in_progress` | Emerging |
| `at_maximum` | Demonstrated |

Movement is defined **only** in these states (SPM). Raw score deltas are **forbidden** in Present Levels — scales differ across targets (Phase B).

#### Metric set — comparison presentation (report cycle with prior history)

Each **comparison line** (§1.8.3–§1.8.8) carries:

| Metric | Definition (transition terms — §1.8.2) | Who reads it / what they conclude |
|--------|----------------------------------------|-----------------------------------|
| **Skills improved** | Count of **measured improvement** transitions (scored→scored ladder up) | Parent/funder: how many skills moved up since the relevant prior scored observation |
| **Skills regressed** | Count of **measured regression** transitions | Same readers: honest clinical record — losses are not omitted (SPM) |
| **Newly assessed** | Count of targets **never scored in any prior cycle**, scored now | Reader: first-time scores — not measured acquisition from a prior scored baseline |
| **No longer scored** | Count of targets scored at the line’s comparison anchor, Unscored now | Reader: gap in this administration for that skill — not clinical regression |

**Forbidden computed metrics:** “goals mastered,” goal-attainment counts, any proxy that treats authored Measurable Treatment Goals as scored mastery events (SPM), and **any aggregate percentage / composite / index** in Present Levels — including pack-wide points-captured % (`from% → to%` or standing), synthetic score-set percentages assembled from per-target anchors at different cycles, or any substitute summary figure (§1.8.5).

#### First-assessment presentation (`cycle_number` === 1)

No comparison lines. See §1.8.4.

### 1.7.6 Authoring reference panel (different audience)

| Audience | Surface | Binding |
|----------|---------|---------|
| External reader | Finalized document / print | Slim body (§1.7.2) |
| Drafting senior clinician | `ReportAuthoringReferencePanel` (live `ReportProfile`) | **Keep full computed reference** — distributions and domain/target detail **remain** while authoring |

Trimming the **document** does **not** trim the **reference panel**. The clinician needs evidence beside the form; the parent must not receive that evidence dump as the letter.

### 1.7.7 Authoring template inputs

The clinician still authors the same fields (`focus_summary`, goals, hours, clinical summary). **Do not** quietly restructure the authoring form into fewer input sections because Present Levels computation changed. Overview / Present Levels remain platform-computed slots in the document outline, not clinician textareas.

## 1.8 Present Levels change computation (binding)

### 1.8.1 Standing SPM constraints (not open)

1. **Unit = competency state**, not raw score delta.
2. **Regression is reported** whenever measured regression transitions exist — never gains-only.
3. **No computed “goals mastered.”** Skill movement is computable; goal attainment on authored free text is not. Do not bridge with a proxy.
4. **No aggregate figures in Present Levels.** Transition counts and first-assessment state counts only — not pack-wide %, composites, or indices (§1.8.5).

### 1.8.2 Per-target last-scored / first-scored (binding — refined Ruling H)

**Universe:** Every target in frozen `pack_snapshot`. For each target and each printed comparison line, resolve `(from_state, to_state)` and bucket via the matrix below.

**Ordered scored ladder (for improvement/regression only):** Not Demonstrated < Emerging < Demonstrated. Unscored is **off** the ladder.

**“Scored” means:** competency state is Not Demonstrated, Emerging, or Demonstrated — not Unscored. Missing score row ⇒ Unscored.

#### Resolution — comparison anchors (per target)

Order prior cycles strictly by **`cycle_number` ascending** (monotonic key — **not** timestamps).

| Anchor | Definition |
|--------|------------|
| **Report state (`to`)** | Competency state of the target on the **report cycle** |
| **Last-scored prior** | Among cycles with `cycle_number < report.cycle_number`, the **maximum** `cycle_number` in which this target was **scored**; else **none** |
| **First-scored** | Among cycles with `cycle_number ≤ report.cycle_number`, the **minimum** `cycle_number` in which this target was **scored**; else **none** |

| Situation | `from_state` for **last-assessed** line | Bucket |
|-----------|----------------------------------------|--------|
| No last-scored prior; `to` scored | Conceptual Unscored | **Newly assessed** (Ruling H) |
| No last-scored prior; `to` Unscored | Unscored | Still unscored |
| Last-scored prior exists | State on that cycle | Apply matrix (scored→scored / scored→Unscored) |

| Situation | `from_state` for **first-assessed** line | Contribute? |
|-----------|------------------------------------------|-------------|
| No first-scored, or first-scored **is** the report cycle | — | **No** — first appearance is only **Newly assessed** on the last-assessed line |
| First-scored cycle_number **equals** last-scored cycle_number | — | **No** — same movement would print twice; count **only** on last-assessed line |
| First-scored cycle_number **<** last-scored cycle_number | State on first-scored cycle | **Yes** — apply matrix vs report `to` |

**Binding refined Ruling H:** Unscored→scored counts as **Newly assessed** (not improved) **only** when there is **no** prior scored cycle for that target. If a prior scored cycle exists, skip intervening Unscored cycles and compare to that last scored state — movement is real improvement or regression.

#### Full matrix — bucket assignment (once `from` and `to` are resolved)

| From → To | Bucket | Counts toward |
|-----------|--------|---------------|
| ND → Emerging | Measured improvement | **Skills improved** |
| ND → Demonstrated | Measured improvement | **Skills improved** |
| Emerging → Demonstrated | Measured improvement | **Skills improved** |
| Emerging → ND | Measured regression | **Skills regressed** |
| Demonstrated → Emerging | Measured regression | **Skills regressed** |
| Demonstrated → ND | Measured regression | **Skills regressed** |
| ND → ND | Stable (scored) | Neither improved nor regressed |
| Emerging → Emerging | Stable (scored) | Neither |
| Demonstrated → Demonstrated | Stable (scored) | Neither |
| Unscored → Unscored | Still unscored | Neither; not newly assessed |
| Unscored → ND | Newly assessed | **Newly assessed** only |
| Unscored → Emerging | Newly assessed | **Newly assessed** only |
| Unscored → Demonstrated | Newly assessed | **Newly assessed** only — **not** improved |
| ND → Unscored | No longer scored | **No longer scored** only — **not** regressed |
| Emerging → Unscored | No longer scored | **No longer scored** only |
| Demonstrated → Unscored | No longer scored | **No longer scored** only |

#### Worked examples

**A — Never assessed before (classic Ruling H)**

10 targets never scored in any prior cycle; now 5 Demonstrated + 5 ND → Improved **0**; Newly assessed **10**. Counting Unscored→Demonstrated as improved would inflate for a funder.

**B — Partial administration (why cycle-level was wrong)**

Target T scored Demonstrated in cycle 1, Unscored in cycle 2, Emerging in cycle 3 (report).

| Model | Comparison | Result |
|-------|------------|--------|
| Cycle-level vs previous (cycle 2) | Unscored → Emerging | **Newly assessed** — false |
| **Per-target last-scored** | Cycle 1 Demonstrated → Emerging | **Skills regressed** — true measured movement |

**C — Same first and last prior score**

T scored only in cycle 1 (ND), then report cycle 3 Demonstrated. Last-scored = first-scored = cycle 1. Movement ND→Demonstrated counts on **last-assessed** line only; **first-assessed** line does **not** reprint it.

**Ambiguity acknowledged:** Within Emerging, raw score may move without leaving Emerging — invisible here by SPM design. Use Snapshot / Matrix for that grain.

### 1.8.3 Input shape and resolution algorithm

#### Problem

Singular `previousScores` is insufficient. Dual `previousCycleScores` + `firstCycleScores` is **also insufficient**: last-scored for a target may be any prior cycle, not only N−1 or 1.

#### Binding input shape

| Input | Meaning |
|-------|---------|
| `scores` | Score set for the **report cycle** |
| `priorCycles` | **Every** cycle with `cycle_number < report.cycle_number`, each carrying `{ cycle_id, cycle_number, start_date, end_date, scores }` |

Sort `priorCycles` by **`cycle_number` ascending**. Reference-panel `buildReportProfile` may keep a single prior set for Matrix widgets; **finalize Present Levels** must load the full prior list.

#### Algorithm (normative)

```
for each target T in pack_snapshot:
  to ← state(T, report scores)

  last ← max { C in priorCycles | state(T, C.scores) is scored }
        or none
  first ← min { C in priorCycles ∪ {report} | state(T, C.scores) is scored }
        or none
  # equivalently: min over priorCycles where scored; if none and to scored, first = report

  # Last-assessed line contribution:
  if last is none:
    bucket from (Unscored → to)   # newly assessed / still unscored
  else:
    bucket from (state(T, last.scores) → to)

  # First-assessed line contribution:
  if first is none OR first.cycle_number == report.cycle_number:
    skip
  else if last is not none AND first.cycle_number == last.cycle_number:
    skip   # collapse — same movement as last-assessed
  else if last is none:
    skip   # first appearance handled as newly assessed on last-assessed only
  else if first.cycle_number < last.cycle_number:
    bucket from (state(T, first.scores) → to)
  else:
    skip
```

Aggregate transition counts per line from those contributions.

#### Document-level line collapse

| Condition | `mode` | Lines printed |
|-----------|--------|---------------|
| `report.cycle_number === 1` or `priorCycles` empty | `first_assessment` | None — §1.8.4 |
| At least one target contributes to first-assessed line | `dual_comparison` | **Two** lines: last-assessed, then first-assessed |
| Otherwise (priors exist, but no target has first < last) | `single_comparison` | **One** line: last-assessed only |

### 1.8.4 First-cycle presentation (founder)

When `cycle_number === 1` (or no prior cycle exists):

1. Document **explicitly names** this as a **first assessment** / baseline administration (exact copy **OQ-RA10**).
2. Present Levels show **current** competency counts across the pack universe:
   - Demonstrated count
   - Emerging count
   - Not Demonstrated count
   - Unscored count (**proposed default include** — **OQ-RA14**)
3. **No** improved/regressed/newly-assessed comparison metrics — absent change data must not read as “no progress.”
4. **No** aggregate percentage or movement figure — counts only (§1.8.5).

### 1.8.5 Present Levels numeric scope — no aggregate figures (binding)

**Standing property:** Present Levels numerics are **transition counts on real targets** (§1.7.5) or **first-assessment competency-state counts** (§1.8.4). Nothing else.

#### Models compared

| Model | Present Levels numerics | Verdict |
|-------|-------------------------|---------|
| **A — Transition counts + synthetic overall %** | Four transition metrics + `from% → to%` per line (and optional standing % on first assessment) | **Rejected 2026-08-27** — under per-target last-scored anchoring, both endpoints were synthetic score sets drawn from different cycles; the percentage describes a learner state that never existed |
| **B — Transition counts only** | Skills improved / regressed / newly assessed / no longer scored; first-assessment state counts only | **Adopted** |

**Why counts are safe where percentages were not:** Each transition count is one real `(from_state, to_state)` on one real target. No stitching across cycles into a single synthetic moment.

**OQ-RA15** (standing % on first assessment) and **OQ-RA18** (synthetic `from%` denominator) are **superseded** — the figure class was removed, not re-specified (§11).

### 1.8.6 Interval / period (binding — no false single window)

Change needs an interpretable period — but under per-target anchors, target A may compare to three months ago and target B to nine. A single “over 5 months” claim for the document is **false**.

#### Approaches compared

| Approach | What parent / funder take away | Misleading? | Verdict |
|----------|--------------------------------|-------------|---------|
| **A — Document cycle interval + caveat** | “Change over this cycle pair (e.g. 5 months)” + footnote that some skills reach further back | **Yes** — partial admin is common; footnote is unread; sells a synchronized period | **Rejected** — easy number, sometimes false |
| **B — Range / distribution of comparison ages** | “Comparisons span 3–9 months” or a small distribution | Partially honest; still easy to misread as one study window; distribution is dense for a letter | **Rejected** for primary Present Levels body |
| **C — Drop single interval; method + span of anchors** | Method sentence + **earliest and latest** last-scored (or first-scored) anchor cycle/date among targets that used a prior scored anchor | Honest: periods differ; span bounds the truth without claiming unity | **Adopted** |
| **D — Per-domain periods** | Domain-level windows | Closer to Snapshot; re-expands body after the cut | **Rejected** for Report body |

#### Binding presentation (Approach C)

For each printed comparison line, show:

1. **Method label** (§1.8.8) — not a cycle-pair title.
2. **Anchor span** (when ≥1 target used a prior scored anchor): earliest and latest comparison `cycle_number` (and dates when available) among those anchors — e.g. “Prior scores used for comparison range from Cycle 1 (Mar 2025) to Cycle 2 (Jun 2025).”
3. **Explicit non-claim:** do **not** print a single duration as if every skill shared it.

If **no** target has a prior scored anchor (all newly assessed / still unscored), omit span; the line is first-time scoring, not period change.

Report-cycle dates remain on **Overview** (this administration). Exact span sentence copy: **OQ-RA16** (reframed).

### 1.8.7 What replaces removed orientation detail

Nothing from coverage/domain-count returns. Readers needing per-target evidence use **Snapshot** (§1.7.4). Present Levels answer change (or first-assessment present-state), not administration completeness.

### 1.8.8 Line labels (proposed copy — founder review)

Neither line is a cycle comparison. Cycle-named titles are **false**.

| Line role | Proposed label (SPM starting point — **not** final) |
|-----------|-----------------------------------------------------|
| Last-assessed | **Since each skill was last assessed** |
| First-assessed | **Since each skill was first assessed** |

Founder owns final wording (**OQ-RA10**). Do not ship “vs previous cycle” / “vs Cycle 1” as Present Levels line titles.

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

### Bounded hybrid (within Model A — superseded 2026-08-19; further amended 2026-08-25)

> **Superseded (2026-08-19):** Optional per-section embed toggles for computed widgets. The locked six-section template (§5.2) defines **mandatory** computed sections (Overview, Present Levels, Target Skills list) and **authored** sections — no clinician toggles for Present Levels.

**Further supersession (2026-08-25 / 2026-08-26):** Mandatory computed sections on the **finalized document** are Overview + Present Levels (**change metrics** / first-assessment present-state — §1.8) only. Target Skills on the finalized document is **authored focus only** — no computed target list. Reference panel remains full (§1.7.6). Orientation macros rejected 2026-08-26.

Section **order** and **section set** are fixed in v1. Adding or removing sections requires a contract amendment.

---

# 3. Reference-data integration

## 3.1 Roles of computed data

`ReportProfile` (via `buildDomainProfiles()` + `buildAssessmentLandscapeRollup()`) remains **reference** for the authoring panel. Finalize Present Levels change metrics use the **competency-state path** (`interpretTargetScore`) against report scores + **all prior cycle** score sets with per-target last/first-scored resolution (§1.8) — a documented sub-projection under **INV-RA-G1**, not a live rebind of full `ReportProfile` as body. **Do not** compute or embed landscape points-captured % for Present Levels.

| Surface | Binding | Live vs snapshotted |
|---------|---------|-------------------|
| **Authoring reference panel** | Read-only; **full** `ReportProfile` convenience while drafting (§1.7.6) | **Live** until finalize |
| **Finalized document — authored fields** | Persisted in `authoring` JSONB | N/A — clinician text / selections |
| **Finalized document — computed sections** | Overview + Present Levels **change / first-assessment** results (§1.7.2, §1.8) | **Snapshotted computed results** at finalize (§3.2, §5.2.2) |
| **Present Levels of Performance** | **Always included** as change metrics or first-assessment present-state — not distributions/domain tables/orientation macros | **Snapshotted at finalize** — mandatory slim embed |

### Superseded reading — pre–body-cut (2026-08-19)

> Finalized document — computed sections: Overview, Present Levels, Target Skills target list · Present Levels always included as full rollup + distributions + domain tables.

**Supersession note (2026-08-25 / 2026-08-26):** Target Skills computed list and fat Present Levels blocks are **removed** from the finalized body. Reference panel remains full.

**Further supersession (2026-08-26):** Orientation `present_levels.macro` (coverage / domain count / standing %) **rejected** — replaced by §1.8 change metrics.

## 3.2 Snapshot at finalize (recommended — binding)

**Decision:** Embedded computed elements are **frozen into the persisted report document at finalize time**, not live-rebound at print.

**Reasoning:**

1. **G8 alignment:** A communication record for a cycle should reflect the assessment **as understood when the senior clinician signed the report**, not scores that changed afterward.
2. **G4 simplification:** Print renders the **finalized** document store; display = export within that frozen authored+embedded payload.
3. **Drift prevention:** Live-bound embeds at print would let Matrix edits change the PDF after authoring — clinically unsafe for external distribution.
4. **Change metrics:** Embedding **computed results** (not raw comparison score arrays) ensures transition counts cannot silently change if prior-cycle scores are later unreachable or re-read differently.

**Mechanics:**

- On **finalize**, load report-cycle scores plus **`priorCycles`** (every earlier cycle) per §1.8.3; compute Present Levels payload per §1.8; project into slim `embedded_computed` per §5.2.2 (**results + method/span/histogram provenance** — **do not** embed full score arrays, full per-target comparison maps, distributions, domain tables, or target lists).
- Persist **provenance** keys on `embedded_computed.provenance` (§5.2) and top-level `embedded_generated_at` on the row.
- **Draft** may preview live change metrics; full profile stays in reference panel; **draft must not be PHI-gated printable** (§7).

### Alternative considered — live-bound at print

| Aspect | Live at print |
|--------|----------------|
| G4 | Requires print-time render = on-screen render of **same live data** — fragile if scores change between view and print |
| Clinical record | External PDF could disagree with what author reviewed |
| **Verdict** | **Rejected** for embedded computed blocks |

### Alternative considered — embed raw comparison score sets

| Aspect | Embed inputs |
|--------|----------------|
| Freeze | Recomputation at view/print could diverge if algorithm changes |
| Size | Large JSON for little reader value |
| **Verdict** | **Rejected** for Present Levels — embed **results** (§5.2.2) |

Narrative free text is already author-controlled; only **computed embeds** need snapshot semantics.

## 3.3 Refresh before finalize

While **draft**, author may **refresh** embed previews from live reference data. On **finalize**, one snapshot write — no automatic refresh after finalize without creating a **new version** (§8).

## 3.4 G7 / G8 on snapshot generation

Change-metric and Overview snapshot generation **must** use `pack_snapshot` + Layer 0 competency-state interpretation (`interpretTargetScore` / equivalent) — no raw pack field reads outside Effective Scoring. Projection into slim `embedded_computed` may drop fields — it must not invent competency states or **aggregate Present Levels percentages** outside that path (**INV-RA-G1**).

## 3.5 Embed versus render (binding — body cut)

### Question

`embedded_computed` is frozen at finalize; the finalized view renders that snapshot and never recomputes. Cutting the body can trim **render only**, **embed only**, or **both**.

### Models compared

| Model | New finalizes | Already-finalized rows | Risk |
|-------|---------------|------------------------|------|
| **R — Render-only trim** | Still write fat embeds | Display changes to slim layout | Issued documents **look different** than when finalized — same family of problem G4/G5 exist to prevent for clinical records (vault — rule names only; not restated here) |
| **E — Embed-only trim** | Write slim embeds | Fat embeds still render fat body | Existing issued docs unchanged; new docs correct — but render code must branch forever on embed shape |
| **B — Trim both** (**selected**) | Write slim embeds (`template_version` ≥ 2, then ≥ 3 for change metrics) | Render **ignores** removed blocks even if present in legacy JSON | New docs correct; legacy rows display the **communication** body consistently with product intent; orphan keys may remain in storage until disposal |

### Decision (binding)

**Model B — trim both.** (Settled — not revisited by the change-metrics amendment.)

1. **New finalizes** write only slim `embedded_computed` (§5.2.2). Do not persist `assessment_band_distribution`, `present_levels.domains`, `target_skills` target lists, or orientation-macro fields.
2. **Render** of any finalized row **must not** show removed blocks (§1.7.3), regardless of whether legacy JSON still contains them.
3. **Pre-Alpha / disposable test records:** Approved test finalizes may be discarded or re-finalized; there is **no production obligation** to preserve fat-body or orientation-macro appearance of pre-cut finalizes (**OQ-RA12**).

### Migration consequence (what happens to a report finalized before the change)

| Aspect | Consequence |
|--------|-------------|
| **On-screen / print appearance** | Matches the **slim communication body** after this change ships — not the fat body that existed at that row’s finalize time |
| **Persisted JSON** | Legacy fat / orientation keys may remain until row is superseded/deleted; they are **non-authoritative for render** |
| **Clinical / product justification** | Pre-Alpha: no production issued PDFs to protect; cheapest moment to align stored product with Layer 2C intent |

**Rejected:** Model R alone (render change without embed slim) for ongoing product — leaves every new finalize carrying unused evidence JSON.

---

# 4. Cycle scope (confirmation)

**Decision (binding — carries forward):** One **primary cycle** per report document instance (`cycle_id` on persisted entity).

The authoring model **does not reopen** multi-cycle Report. Author selects the cycle explicitly in authoring workspace (**resolves direction for prior OQ-2** at product level: cycle picker is **required** in authoring entry — no silent `in_progress || cycles[0]` as the long-term model).

**Present Levels comparisons (binding — §1.8.3):** When the report cycle is not the first, finalize loads scores for **every prior cycle** and resolves **per-target** last-scored / first-scored anchors. This **supersedes** both “immediate prior only” and dual whole-cycle previous+first comparison. Snapshot / Matrix multi-cycle grids remain out of Report body (§1.7.3).

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

## 5.2 Authoring and embedded JSON schema (binding — resolves OQ-RA4, OQ-RA3, OQ-RA5; amended body cut + change metrics)

**Template version:** `template_version: 5` for new drafts/finalizes under the no-aggregate-figure amendment. Rows with `template_version` 1–4 may still exist; **render** must not show `overall_points_captured`, `points_captured_percentage`, or any aggregate percentage in Present Levels (Model B — §3.5). Increment `template_version` only on contract-amended template changes.

**Fixed render order (binding — finalized document):**

| Order | Section | Source |
|-------|---------|--------|
| 1 | Overview | `embedded_computed.overview` |
| 2 | Present Levels of Performance (Baseline) | `embedded_computed.present_levels` — change metrics or first-assessment (§1.8) |
| 3 | Target Skills / Areas of Focus | **`authoring.sections.target_skills_focus` only** — no computed target list |
| 4 | Measurable Treatment Goals | `authoring.sections.measurable_treatment_goals` |
| 5 | Recommended Therapy Hours | `authoring.sections.recommended_therapy_hours` |
| 6 | Clinical Summary | `authoring.sections.clinical_summary` |

### 5.2.1 `authoring` JSONB (clinician inputs only)

Computed Overview / Present Levels are **not** stored here — they live in `embedded_computed` after finalize.

```json
{
  "template_version": 5,
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
| *(computed)* | Present Levels of Performance (Baseline) | — | — | — | Auto — **always** (§5.2.2 / §1.8) |
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

**No per-target flagging UI in v1** for Target Skills — **authored `focus_summary` only** on the finalized document (founder binding; body cut removes computed target list).

**Domains for goals:** Clinician adds goal rows for **subset of domains** — not forced for every domain. Empty domains omit goal rows.

### 5.2.2 `embedded_computed` JSONB (finalize snapshot — slim; per-target change results)

Populated **only** when `status` transitions to `finalized`. Generated via Overview metadata + Present Levels computation (§1.8) against `pack_snapshot`, report scores, and `priorCycles` — **INV-RA-G1**.

**Embed computed results, not inputs:** Do **not** persist raw `AssessmentScore[]` for any cycle inside `embedded_computed`. Do **not** embed a full per-target comparison map (Snapshot-weight). Persist the **numbers the document will print**, plus **method + aggregate provenance** enough to defend which cycles fed the anchors (§1.8.6, below).

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
    "mode": "first_assessment | single_comparison | dual_comparison",
    "comparison_method": "per_target_last_and_first_scored",
    "first_assessment": {
      "statement_key": "first_assessment",
      "counts": {
        "demonstrated": "<integer>",
        "emerging": "<integer>",
        "not_demonstrated": "<integer>",
        "unscored": "<integer | omitted per OQ-RA14>"
      }
    },
    "comparisons": [
      {
        "role": "last_assessed | first_assessed",
        "label_key": "since_last_assessed | since_first_assessed",
        "anchor_span": {
          "earliest_cycle_number": "<integer | null>",
          "latest_cycle_number": "<integer | null>",
          "earliest_date": "<ISO date | null>",
          "latest_date": "<ISO date | null>",
          "available": "<boolean>"
        },
        "anchors_by_cycle_number": {
          "<cycle_number as string>": "<integer count of targets whose comparison anchor was this cycle>"
        },
        "skills_improved": "<integer>",
        "skills_regressed": "<integer>",
        "newly_assessed": "<integer>",
        "no_longer_scored": "<integer>"
      }
    ]
  }
}
```

**Provenance depth (enough to defend later):**

| Include | Purpose |
|---------|---------|
| `comparison_method` | Records per-target last/first-scored (not cycle-pair) |
| Per-line `role` / `label_key` | Which line |
| `anchor_span` | Earliest/latest prior scored anchors used on that line |
| `anchors_by_cycle_number` | Histogram — reconstruct how many targets compared to each cycle |

| Exclude | Why |
|---------|-----|
| Full per-target `{target_id → cycle_id}` map | Heavier than a frozen communication letter should carry; Snapshot owns per-target evidence |
| Raw score arrays | Already rejected — numbers must not silently recompute |

**Shape rules:**

| `mode` | `first_assessment` | `comparisons` |
|--------|--------------------|---------------|
| `first_assessment` | **Required** | Empty array or omitted |
| `single_comparison` | Omitted / null | **Exactly one** entry — `role: last_assessed` |
| `dual_comparison` | Omitted / null | **Exactly two** entries — `last_assessed` then `first_assessed` |

**Provenance keys (exact — OQ-RA5):** `provenance.snapshot_at`, `provenance.pack_title`, `provenance.pack_version`, `provenance.assessment_id`, `provenance.cycle_id`, `provenance.cycle_number`, `provenance.pack_snapshot_frozen` (always `true`).

**Must not embed or render:** `assessment_band_distribution`, per-domain `domains[]`, `target_skills`, orientation-macro fields, `points_captured_percentage`, `overall_points_captured`, raw score arrays, full per-target comparison maps, or **any aggregate percentage / composite / index** in Present Levels (§1.8.5).

**Target Skills:** **No** `embedded_computed.target_skills` on new finalizes. Authored focus only. Legacy keys, if present, **must not render** (§3.5).

**Overview:** No clinician fields; populated from assessment/cycle/user metadata at finalize.

### Superseded embed shapes (retained for history)

| Version | Shape | Render after this amendment |
|---------|-------|-----------------------------|
| `template_version` 1 | Fat Present Levels + target lists | Non-authoritative — do not render removed blocks |
| `template_version` 2 | Orientation `present_levels.macro` | Non-authoritative |
| `template_version` 3 | Cycle-level previous/first comparison lines | Non-authoritative — re-finalize for per-target method |
| `template_version` 4 | Per-target method + `overall_points_captured` / `points_captured_percentage` | Non-authoritative — do not render aggregate figures; re-finalize for counts-only embed |

### 5.2.3 Finalize validation (binding)

Builder must block finalize unless:

1. Parent `assessments.status === 'approved'` (§8.2).
2. All **Required at finalize** rows in §5.2.1 table satisfied.
3. Every `goals[].domain_id` exists in frozen `pack_snapshot`.
4. Slim `embedded_computed` successfully written on finalize transition (Overview + Present Levels per §1.8 + provenance), including correct `mode` / line collapse and `priorCycles` load (§1.8.3).

### 5.2.4 Builder completeness statement

The schema above is **complete for data model and authoring UI product decisions** for v1 change-metric Present Levels, except open questions in §11.2 (labels, first-assessment Unscored count, interval format, Snapshot pointer, legacy disposal).

| Remaining gap | Owner |
|---------------|--------|
| PHI dialog microcopy (prior OQ-4) | Founder / UX — meanings locked in prior contract |
| Report date header vs `generatedAt` (prior OQ-8) | Founder — finalized chrome only |
| Exact route paths | Implementation |
| Present Levels / change-metric plain-language labels (OQ-RA10) | Founder |
| Snapshot discoverability copy / placement (OQ-RA9) | Founder |
| First-assessment Unscored count (OQ-RA14) | Founder |
| Interval / anchor-span copy (OQ-RA16) | Founder |

No further **section list** or clinician **input** field decisions are required before Builder implements the slim finalize body — authoring form slots stay as §5.2.1.

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
| Body | Domain rows, rollups | Clinician sections + slim Present Levels **change-metric results** embed |
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
| Author types a **specific score** in prose that drifts from computed embed | Reference panel shows live values at draft time; Present Levels change metrics snapshotted at finalize; optional UI **non-blocking** hint if prose numerals disagree with snapshot (not required v1) |
| Author writes misleading narrative vs Present Levels | Clinical QA; disclaimer footer; senior-only finalize and print (§8) |
| Therapist private Matrix `note` leaks into family-facing print | **INV-RA7** + **INV-RA19** — `NOTE_LEAK_PROBE` must exercise **finalized document render** (`renderToStaticMarkup` of `FinalizedReportDocument`), not source-text match alone (§10.2) |
| Score correction after finalize | **Not applicable (founder OQ-RA7):** In ABA practice, scores do not change after a finalized communication report is issued. Evalis does not design a post-finalize score-correction re-versioning workflow. Pre-finalize consistency is covered by **`approved` gate** (§8.2) and **G8** frozen `pack_snapshot`. **Voluntary** new report version (§8.3) remains for intentional document amendments only — not score-correction driven |

## 6.3 Invariant extension

**INV-RA-G1:** Embedded computed content in a finalized report must be generated exclusively through Layer 0–compliant paths against frozen `pack_snapshot` at finalize time: Overview metadata; Present Levels via competency-state interpretation (`interpretTargetScore` / equivalent) and **per-target last/first-scored transition counts** from `priorCycles` (§1.8); documented sub-projections of `buildReportProfile` where applicable. No inventing states, **aggregate Present Levels percentages**, or composites outside that path.

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

## 7.4 Print consequence of the body cut (binding — re-check only)

The finalized report has **never** had a founder print pass. Slimming the body changes **page count** and **break behaviour**.

**Must be re-checked after implementation (do not specify print geometry here):**

- Multi-page break points with goals + hours + clinical summary (no longer padded by distribution/target grids)
- Widow/orphan behaviour of short Present Levels change-metric block
- Footer / version chrome still present and readable on last page
- Snapshot pointer copy (**OQ-RA9**), if on-document, still visible in print
- Dual method lines + anchor-span text do not collide awkwardly across page breaks
- No single false “over N months” duration appears for all skills

Founder visual/print approval remains a separate gate — this contract only obligates a **re-check** when the slim body ships.

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
| **`ReportDomainSummaryTable`, band distribution components, etc.** | **Reference panel only** for Report product surfaces — **not** finalized document body after body cut |
| **`buildReportProfile()`** | **Retained** — reference panel live data. Finalize Present Levels require **`priorCycles`** (all earlier cycles) and per-target resolution (§1.8.3) — singular `previousScores` is insufficient |

**Reasoning:** Single page cannot serve both authoring and finalized external communication without violating purpose boundary. Split matches draft vs finalized lifecycle and PHI print rules.

Route naming is implementation detail — logical split: `#/assessment/:id/report/edit` (draft) and `#/assessment/:id/report` or `.../report/view/:version` (finalized).

---

# 10. Product invariants (QA-testable)

## 10.1 Authoring

- [ ] **INV-RA1** Finalized report body comes from `assessment_communication_reports.authoring` + `embedded_computed` — not live `ReportProfile` alone.
- [ ] **INV-RA2** At most one `draft` per `(assessment_id, cycle_id)`.
- [ ] **INV-RA3** `finalized` rows are immutable — changes create new version.
- [ ] **INV-RA4** v1 uses fixed six-section template (§5.2) — section set not clinician-configurable.
- [ ] **INV-RA14** `embedded_computed.present_levels` is **always** populated on finalize per §1.8 mode — not optional; fat Present Levels, orientation macros, and removed blocks **must not render**.
- [ ] **INV-RA15** Draft create/open blocked unless `assessments.status === 'approved'`.
- [ ] **INV-RA20** Finalized body never renders Assessment Score Distribution, Domain Summary, per-domain distributions, or exhaustive target lists (§1.7.3).
- [ ] **INV-RA21** New finalizes persist slim `embedded_computed` only (§5.2.2) — no new writes of removed blocks or orientation macros.
- [ ] **INV-RA22** Present Levels follow refined Ruling **H** (§1.8.2) — Newly assessed only when never scored prior; otherwise compare to last prior scored cycle for that target.
- [ ] **INV-RA23** On comparison lines, **Skills regressed** is always a reported field (zero allowed); gains-only suppression is forbidden.
- [ ] **INV-RA24** No computed “goals mastered” / goal-attainment metric appears in the finalized document.
- [ ] **INV-RA25** When a target’s first-scored and last-scored prior cycles are the same, that movement is counted on **one** line only (last-assessed).
- [ ] **INV-RA26** Dual lines print only when ≥1 target has first-scored cycle_number **<** last-scored cycle_number; otherwise single last-assessed line.
- [ ] **INV-RA27** Embedded Present Levels store **computed results** + method/span/histogram provenance — not raw score arrays and not a full per-target comparison map.
- [ ] **INV-RA28** Finalize loads **all** prior cycles (`priorCycles`); ordering by `cycle_number`.
- [ ] **INV-RA29** Present Levels must **not** claim a single shared calendar duration for all skill comparisons; anchor span only (§1.8.6).
- [ ] **INV-RA30** Line titles use method labels (last/first assessed), not “vs previous cycle” / “vs Cycle 1”.
- [ ] **INV-RA31** Present Levels embed and render contain **only** transition counts (comparison modes) or first-assessment competency-state counts — **no** `overall_points_captured`, `points_captured_percentage`, or any aggregate percentage / composite / index (§1.8.5).

## 10.2 Reference and embeds

- [ ] **INV-RA5** Reference panel uses live `buildReportProfile()` — full profile retained; not persisted as body.
- [ ] **INV-RA6** Embedded computed blocks snapshotted only at finalize (**INV-RA-G1**).
- [ ] **INV-RA7** Matrix score `note` never appears in report render (prior OQ-7).
- [ ] **INV-RA19** **Bound to this body-cut slice:** `NOTE_LEAK_PROBE` must cover `FinalizedReportDocument` via `renderToStaticMarkup` (or equivalent render exercise). Source-text-only matching on the finalized path is **insufficient** — a rewrite that still leaks notes would evade it. A therapist’s private clinical note reaching a family-facing printed report is the failure this guards.

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
| Body cut (founder 2026-08-25) | Slim finalized body §1.7; Model B embed+render §3.5; slim embed schema §5.2.2; INV-RA19–21 | 2026-08-26 |
| Change metrics (founder 2026-08-26) | Present Levels §1.8; Ruling H; cycle-level dual comparison (later refined); embed results; OQ-RA11/RA13 superseded | 2026-08-26 |
| Per-target last-scored (founder 2026-08-27) | Refined Ruling H; `priorCycles`; first-scored baseline; Approach C span; histogram provenance; INV-RA22–30 | 2026-08-27 |
| **OQ-RA17** | Refined Ruling H binding — newly assessed only if never scored prior; else last prior scored for that target (§1.8.2) | 2026-08-27 |
| Remove overall % (founder 2026-08-27) | Present Levels counts-only §1.8.5; no `overall_points_captured` / `points_captured_percentage`; INV-RA31; `template_version` 5; OQ-RA15/RA18 superseded | 2026-08-27 |

## 11.2 Still open

| ID | Question | Options | Architecture recommendation |
|----|----------|---------|------------------------------|
| Prior **OQ-4** | Exact PHI acknowledgement microcopy for Report | (unchanged) | Founder / UX |
| Prior **OQ-5** | Acquisition/regression appendix | (strategy-deferred) | Leave deferred |
| Prior **OQ-6** | Dedicated Report export route in v1 | (unchanged) | Leave open |
| Prior **OQ-8** | Report date header vs `generatedAt` on finalized chrome | (unchanged) | Founder |
| Prior **OQ-9** | Export-route acknowledgement scope if OQ-6 approved | **untouched** | — |
| **OQ-RA9** | How does a reader know to use Snapshot for full evidence? | **A** Footer · **B** In-product chrome only · **C** Both | **A** (proposed default) |
| **OQ-RA10** | Exact plain-language labels — first-assessment statement; metric names; **line titles** (§1.8.8); anchor-span sentence | Founder copy vs interim | Interim OK for Alpha; **line titles flagged for founder review** |
| **OQ-RA11** | Domains indicator | — | **Superseded (moot)** |
| **OQ-RA12** | Legacy finalized test rows | **A** Delete / re-finalize · **B** Leave orphan JSON | **A** |
| **OQ-RA13** | Orientation earned/available integers | — | **Superseded (moot)** |
| **OQ-RA14** | Include Unscored count on first-assessment? | **A** Include · **B** Omit | **A** |
| **OQ-RA15** | Standing points % on first assessment? | — | **Superseded (moot)** — same aggregate class as overall figure; removed with §1.8.5 (2026-08-27) |
| **OQ-RA16** | Period presentation under per-target anchors | **A** Single cycle-pair interval + footnote · **B** Age distribution · **C** Method + earliest/latest anchor span (no unified duration) | **C** binding in §1.8.6; **A rejected**. Remaining: exact span sentence wording |
| **OQ-RA17** | Ruling H | — | **Resolved** — see §11.1 (2026-08-27 refinement) |
| **OQ-RA18** | Synthetic `from%` on first-assessed line | — | **Superseded (moot)** — overall figure class removed; per-target synthetic denominators no longer exist (2026-08-27) |

---

# 12. Document history

| Date | Change |
|------|--------|
| 2026-08-19 | Initial authoring contract — supersedes computed-report purpose in [`assessment_report_contract.md`](./assessment_report_contract.md); Model A template; `assessment_communication_reports` data model; G-law split; lifecycle/roles; v1 artifact split |
| 2026-08-19 | Template lock amendment — six-section schema §5.2; OQ-RA1/RA2/RA4/RA7 resolved; RA3/RA5/RA6/RA8 folded into schema; OQ-RA2 overrides §8.1 therapist-print recommendation; §1.6 payer exclusions |
| 2026-08-26 | Finalized communication body cut — §1.7 section set + Snapshot boundary; §3.5 Model B embed+render trim; slim `embedded_computed` (`template_version` 2); reference panel unchanged; print re-check §7.4; INV-RA19–21; OQ-RA9–RA13; note-leak render probe bound to slice |
| 2026-08-26 | Present Levels change metrics — founder rejects orientation macros; §1.8 transition matrix Ruling H; dual previous+first comparison with cycle-2 collapse; first-assessment present-state; overall figure as movement; embed results not score arrays; `template_version` 3; INV-RA22–27; OQ-RA11/RA13 superseded; OQ-RA14–17 |
| 2026-08-27 | Per-target last-scored refinement — Ruling H only for never-assessed; else last prior scored; `priorCycles`; first-scored baseline + same-anchor collapse; Approach C interval (no false single window); histogram provenance; method line labels; `template_version` 4; INV-RA22–30; OQ-RA16/RA17 updated; OQ-RA18 |
| 2026-08-27 | Remove overall percentage — Present Levels transition counts only §1.8.5; no aggregate figures in any mode; `template_version` 5; INV-RA31; OQ-RA15/RA18 superseded |
