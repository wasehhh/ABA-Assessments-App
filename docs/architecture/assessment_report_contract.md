# Assessment Report Contract (Layer 2C)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Report — Layer 2C communication artifact |
| **Milestone** | Layer 2C architecture (pre-implementation) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Code inspection 2026-08-19: `frontend/src/services/reportProfile.ts`, `frontend/src/pages/AssessmentReport.tsx`, `frontend/src/components/report/*`, `frontend/src/clinicalExport/*`, `frontend/src/services/domainProfile.ts` |
| **References** | [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.6 · [`assessment_snapshot_cycle_filtering_contract.md`](./assessment_snapshot_cycle_filtering_contract.md) · [`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) §3 / §6 · [`docs/product/visualization/layer_2_visualization_strategy.md`](../product/visualization/layer_2_visualization_strategy.md) §9 / §11 · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) G4–G8 · vault `(C) G1–G8 Runtime Laws.md` (read for this contract; not in repo) · vault `07 SPM/(C) Evalis LOG.md` 2026-08-19 security review entry (read for this contract; not in repo) · vault `01 Product Strategy/(C) Visualization & Learner Intelligence Strategy.md` §Layer 2C (rule name only; not readable from code-repo scope) |
| **Non-goals** | Implementation · HTML/PDF serializer design · Snapshot or Learner Map redesign · Phase B Builder decisions · CSV export contract (sibling artifact; see §8.4) · print CSS hardening at scale · competency vocabulary rename implementation · acquisition/regression appendix design |

This document is the authoritative product contract for the Assessment Report (Layer 2C).

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns product meaning (purpose boundary, data contract, cycle scope, egress posture, invariants). It references canonical code modules and sibling Layer 2 contracts for existing machinery. It does not restate Snapshot export serializers, Learner Map export modes, or full G1–G8 prose from vault. Where this contract extends a runtime law’s scope clause, it names the extension explicitly (§2, §6, §9).

---

## Amendment banner — founder decisions (2026-08-19)

**Founder review outcome:** Two open questions from the initial contract (`c5b8b20`) are now **binding decisions**.

| Resolved | Decision |
|----------|----------|
| **OQ-1** — PHI acknowledgement gate scope | **Print only.** Report view route remains open to any authenticated session without acknowledgement. Gate sits in front of in-app Print / Save as PDF, matching Snapshot main-page pattern (§5). |
| **OQ-7** — free-text score `note` on Report | **Excluded from v1 rendering.** `note` remains on `ReportTargetRow` / `ReportProfile` (type unchanged) but must not render in Report UI or any v1 print/export output. May be revisited on clinical demand (§8). |

**Founder override (explicit):** OQ-7 **overrides** the Architecture Agent’s original §8.3 recommendation to include notes under the PHI gate. Founder reasoning: a therapist’s internal clinical note is not necessarily written for a parent, school, or funder to read.

Superseded pre-amendment text is retained under dated notes in §5.3 and §8.3 so the original recommendation remains visible as considered-and-overridden, not never held.

Resolved open questions: **OQ-1**, **OQ-7** — see §12. OQ-2 through OQ-6 and OQ-8 remain open.

**New question surfaced by OQ-1 resolution:** OQ-9 — future dedicated Report export route acknowledgement scope (§12).

---

## Amendment banner — purpose reframe superseded (2026-08-19)

**Founder decision:** Layer 2C is a **clinician-authored communication artifact** (structured selections + short narrative fields), not an auto-computed score summary. Authoritative product meaning for the authoring model, persisted document entity, reference-data integration, G-law boundary for narrative, lifecycle/roles, and v1 surface split lives in **[`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md)**.

| Section in this document | Disposition |
|--------------------------|-------------|
| §1 Goals (computed success statement) | **Superseded** by authoring contract §1 |
| §2 Three-layer boundary + §2.2 `ReportProfile` as body | **Superseded** by authoring contract §1–§2 |
| §3 Data contract (`ReportProfile` canonical body) | **Superseded for body** — reference/scaffolding only (authoring §5) |
| §4 Cycle scope | **Carried forward** — confirmed in authoring §4 |
| §5 PHI / audit | **Carried forward** — confirmed in authoring §7 |
| §6 Export channels | **Carried forward** |
| §7 Standing exclusions | **Partially carried forward** — apply to embedded computed widgets (authoring §10.5) |
| §8 Matrix `note` exclusion (OQ-7) | **Carried forward** for score-row notes |
| §9 G-law path as report purpose | **Superseded** — reframed in authoring §6 |
| §10 INV-R1–R4, INV-R9 | **Superseded** by INV-RA\* in authoring contract |
| §10 INV-R5–R8, INV-R11, INV-R12 | **Carried forward** for finalized print posture; apply to finalized authored render |
| §11 Implementation guidance | **Superseded** |
| §12 OQ-1, OQ-7 | **Resolved** (prior amendment); OQ-3 locked `'standard'` in code; OQ-2 direction set in authoring §11.1 |

This file remains the historical record of the computed-report contract and egress decisions. Do not implement computed-only Report body from §1–§3 as Layer 2C product intent.

Superseded §1–§2 text is retained below under original section headings so the computed-report position remains visible as considered-and-superseded, not never held.

---

# 0. Code facts relied on (verified)

| Fact | Where verified |
|------|----------------|
| `buildReportProfile()` composes `buildDomainProfiles()` + `buildAssessmentLandscapeRollup()` only | `frontend/src/services/reportProfile.ts` |
| `ReportProfile` shape: `{ metadata, structureLabels, rollup, assessmentBandDistribution, domains[] }` with `ReportDomainSection` = `DomainProfile` + `ReportTargetRow[]` + optional `targetSections` | `reportProfile.ts` |
| `ReportTargetRow` includes `note: string \| null` sourced from `AssessmentScore.note` | `reportProfile.ts` `buildReportTargetRows()` |
| Report route loads **one** cycle’s scores; loads **previous** cycle scores only when `cycle_number > 1` for trend context | `AssessmentReport.tsx` |
| Default cycle selection: `in_progress` cycle, else `cycles[0]` — no cycle picker UI | `AssessmentReport.tsx` |
| Single egress control: `window.print()` — no PHI acknowledgement, no `clinicalExport` audit | `AssessmentReport.tsx` |
| `note` is in `ReportProfile` and tested but **not rendered** in current UI | `AssessmentReport.tsx`; `reportProfile.test.ts` |
| Trend arrows recomputed in page JSX from `profile.sequence` / `previousInterpretation` | `AssessmentReport.tsx` |
| Shared export foundation reserves `artifactKind: 'report'` and `report-export-ack:` | `clinicalExportAcknowledgment.ts`; Snapshot export contract §3.3 / §3.6 |
| `clinicalExportAudit.ts` defines shared event vocabulary (`acknowledgement`, `export_view`, `html_export`, `print`) | `clinicalExportAudit.ts` |
| Architecture review: Report = **single-cycle formal record**; Snapshot = multi-cycle evidence; Learner Map = supervision interpretation | `assessment_snapshot_architecture_review.md` |
| Strategy doc §Layer 2C standing exclusions (vault reference): sequence strip in PDF output; numeric assessment grids in reports | Prompt + repo strategy §8 / §9 (partial overlap) |

Could not verify inside this repo: vault G1–G8 full text, SPM security log entry, strategy doc §Layer 2C verbatim — constraints inlined from Architecture Agent brief and sibling contracts.

---

# 1. Goals

> **Superseded (2026-08-19):** Purpose and success statement below describe the **computed auto-render** model. Binding product intent is **[`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) §1**.

## 1.1 What this solves

Layer 2A (Assessment Snapshot) and Layer 2B (Learner Map) are contracted. Layer 2C — the **Assessment Report** — is the product’s **communication artifact**: a polished, human-readable clinical document for parents/caregivers, BCBAs/clinical supervisors, schools, funding agencies, and clinical documentation/compliance records.

Current implementation (`AssessmentReport.tsx`, `reportProfile.ts`) predates any architecture contract and ships **without** the PHI acknowledgement and `clinicalExport` audit posture that Snapshot and Learner Map egress paths require. The 2026-08-19 security review accepted that asymmetry under trusted-two-tester Alpha posture; this contract is the authoritative place to **close or formally re-defer** it before Layer 2C becomes the actively developed surface.

## 1.2 Success statement

After implementation of this contract:

> A clinician can open the Assessment Report for a **single selected administration cycle**, review a print-oriented communication document composed from Layer 0/1 interpretation services (not raw pack fields), optionally see **immediate-prior-cycle trend annotations** on target rows, and **Print / Save as PDF** only after PHI acknowledgement with audit-logged egress events. On-screen scope equals print scope (G4). The Report does not duplicate Snapshot’s multi-cycle evidence grid or Learner Map’s supervision narrative; it translates assessment record data into an external-facing summary document.

## 1.3 What this does NOT solve

| Out of scope | Owner |
|--------------|--------|
| Snapshot cycle filtering, HTML/PDF export channels, Target Index | [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) |
| Learner Map export modes, availability, appendix segmentation | Learner Map export foundation |
| CSV export PHI/audit posture | Separate contract or amendment (§8.4) |
| Acquisition/regression ledger appendix | Deferred — strategy §9 mentions; vault §Layer 2C excludes unless SPM reopens (§12 OQ-5) |
| Multi-cycle Report or cycle-range filtering | Out of scope for v1 (§4) |
| Numeric targets×cycles assessment grid in Report | Standing exclusion (§7.2) |
| Domain or assessment-wide sequence strip in Report PDF/print | Standing exclusion (§7.2) |
| Implementation of PHI gate, audit wiring, or export serializers | Builder after founder approval |

---

# 2. Three-layer purpose boundary

> **Superseded (2026-08-19):** Report as computed print-oriented summary — see **[`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) §1.2** for external-reader communication boundary.

## 2.1 Operational definitions

| Layer | Artifact role | Primary question | Egress character |
|-------|---------------|------------------|------------------|
| **2A — Assessment Snapshot** | Permanent **evidence record** | What happened? (exact scores, all lawful cycles) | Longitudinal grid; no interpretation narrative |
| **2B — Learner Map** | **Interpretation / movement** for supervision | What do scores mean? How did they move? | Interpretive supervision artifact; bounded comparison |
| **2C — Assessment Report** | **Communication document** | What should an external reader understand about this administration? | Single-cycle formal summary; print-oriented prose layout |

These are **different jobs**, not zoom levels of the same view. Snapshot replaces spreadsheet/grid workflows; Learner Map replaces supervision summary workflows; Report remains the **single-cycle formal record** until a merged export package is explicitly designed ([`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) §3).

## 2.2 `ReportProfile` element classification

For each element currently in `ReportProfile`, operational ownership under the boundary above:

| Element | Belongs in Report? | Rationale | Scope-creep flag |
|---------|-------------------|-----------|------------------|
| **`metadata`** (client, pack, cycle id/number/status, assessment dates, `generatedAt`) | **Yes** | Communication chrome identifying the document subject and administration | None |
| **`structureLabels`** | **Yes** | Authored structure vocabulary for readable headings | None |
| **`rollup`** (`AssessmentLandscapeRollup`: points captured, coverage, domain count) | **Yes** | Assessment-wide **summary metrics** appropriate for external communication — same reduction Layer 2 landscape uses, not raw evidence | Not Snapshot evidence (no per-target/per-cycle grid) |
| **`assessmentBandDistribution`** | **Yes** | Compact interpretive **summary chart** (Layer 0 band counts aggregated) — communication, not ledger | Learner Map owns interactive movement narrative; Report owns static band summary |
| **`domains[].profile`** (`DomainProfile`) | **Yes** | Layer 1 aggregates (coverage, points captured, state distribution) reused for print tables | **`cycleDelta`** on `DomainProfile` is Learner Map–oriented domain movement; Report UI today does not surface domain-level delta narrative — if added later, keep bounded to immediate prior cycle (§4.3), not full LM appendix |
| **`domains[].targets`** (`ReportTargetRow`) | **Yes, with constraints** | Human-readable target list with interpreted score display — communication summary | See row-level fields below |
| **`domains[].targetSections`** | **Yes** | Authored secondary-group structure for readable grouping | None |
| **`ReportTargetRow.score` / `displayScoreWithMax`** | **Yes** | Interpreted score presentation for external readers | Not Snapshot raw bead/numeral grid |
| **`ReportTargetRow.competencyState`** | **Yes** | Layer 0 band classification drives bar colour and readable state — required for communication | Must not be recomputed outside resolver chain (§6) |
| **`ReportTargetRow.normalizedRatio`** | **Yes** | Bar width for print-safe visual summary (Evalis-native, not numeric grid) | G6: maxima from Matrix/effective scoring path |
| **`ReportTargetRow.note`** | **Latent on type; excluded from v1 render** — see §8 | Free-text clinical note on score row; may remain populated in `ReportProfile` for composition/tests | **Excluded from v1 UI and all v1 egress** (founder 2026-08-19); not a parent/school/funder communication field |
| **Trend arrows (UI only, not in `ReportProfile`)** | **Yes, bounded** | Immediate prior-cycle direction glyph on target rows | **Micro-movement annotation** — acceptable on Report if limited to one prior cycle (§4.3); full multi-cycle movement is Learner Map territory |

### Elements that must NOT appear on Report (standing exclusions)

| Excluded content | Owner layer | Source |
|------------------|-------------|--------|
| Targets × cycles numeric grid / heatmap matrix | Snapshot (2A) | Strategy §8 IP principles; vault §Layer 2C exclusion |
| Full multi-cycle evidence columns | Snapshot (2A) | Architecture review §3 |
| Domain or assessment-wide **sequence strip** in print/PDF | Layer 1 interactive / excluded from Report | Vault §Layer 2C exclusion; strategy §6 reject list |
| Learner Map supervision sign-off narrative, coverage recommendations, export-mode appendix | Learner Map (2B) | LM export foundation |
| Silent omission of scored evidence within declared cycle scope | Forbidden (extends **G5** scope clause) | Same structural-absence rule as Snapshot cycle filtering |

### Composition note (not scope creep)

`buildReportProfile()` intentionally reuses `buildDomainProfiles()` and `buildAssessmentLandscapeRollup()` — the same Layer 1 / Layer 2 reduction paths used elsewhere — then adds Report-specific row shaping and metadata. That reuse is **lawful composition**, not duplication of Snapshot evidence or Learner Map export semantics, provided G7/G8 paths are preserved (§6).

---

# 3. Data contract

> **Superseded for report body (2026-08-19):** `ReportProfile` is reference/scaffolding, not canonical body — **[`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) §5**.

## 3.1 Canonical profile type

**Decision (binding):** `ReportProfile` (`frontend/src/services/reportProfile.ts`) is the authoritative data contract for Layer 2C screen and all egress paths.

Builder must not introduce a parallel report DTO with independent score interpretation. Presentation components consume `ReportProfile` (or projections of it), not raw `AssessmentScore[]` + pack fields.

## 3.2 Authority and freshness

| Rule | Value |
|------|--------|
| Pack authority | **`assessment.pack_snapshot` only** (**G8**) — never live pack |
| Scoring semantics | **`interpretTargetScore` / `resolveEffectiveScoring` chain** via `buildDomainProfiles()` (**G7**) |
| Rollup / ratio maxima | **`analyticsService.calculateDomainStats` → `getEffectiveMaxScore`** (**G6**) |
| Score rows | Scores for the **declared primary cycle** only, plus optional **immediate prior cycle** scores solely to populate `previousInterpretation` on `DomainProfile.sequence` |
| Notes | May be copied into `ReportTargetRow.note` by composition — not interpreted by scoring resolver; **v1 render and egress must structurally exclude `note`** (§8) |

## 3.3 Inputs not persisted on `ReportProfile`

| Input | Usage |
|-------|--------|
| `previousScores` | Feeds `buildDomainProfiles(..., previousScores)` for trend context only; not exported as a second cycle’s target table |
| `generatedAt` | Stamped into `metadata.generatedAt`; all “generated” timestamps on egress must use this field, not ad hoc `new Date()` in UI (§6.4) |

---

# 4. Cycle scope

## 4.1 Decision — single primary cycle

**Decision (binding):** The Assessment Report covers **exactly one primary administration cycle** per document instance.

`metadata.cycleId` and `metadata.cycleNumber` identify that cycle. This is the **correct communication model**, not an accidental limitation of `reportProfile.ts`:

1. **Audience:** Parents, schools, and funding packets typically file “the Cycle 3 report,” not a longitudinal ledger.
2. **Differentiation:** Multi-cycle dense evidence is Snapshot’s job; multi-cycle interpretive comparison is Learner Map’s job ([`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) §3).
3. **G4/G5 clarity:** Single-cycle scope avoids silent partial-cycle documents that downstream readers could misread as complete longitudinal records.

Report is **not** a cycle-filtered Snapshot. It does not adopt Snapshot’s `complete` \| `cycles` scope taxonomy ([`assessment_snapshot_cycle_filtering_contract.md`](./assessment_snapshot_cycle_filtering_contract.md)); those rules apply only to Snapshot egress.

## 4.2 Default cycle selection (current behaviour)

Verified behaviour: page load selects `cycles.find(status === 'in_progress') ?? cycles[0]`, loads that cycle’s scores, builds one `ReportProfile`.

**Contract posture:** This default is **acceptable for Alpha** as a provisional product rule. It is **not** a substitute for an explicit clinician-facing cycle choice when multiple completed cycles exist (§12 OQ-2).

## 4.3 Bounded comparison — immediate prior cycle only

**Decision (binding):** The Report may show **target-level trend annotations** (e.g. up/down/flat arrows) comparing the primary cycle to the **immediately previous numbered cycle** only, when prior-cycle scores load successfully.

| Allowed | Forbidden |
|---------|-----------|
| Row-level arrow vs cycle *N−1* | Second cycle’s full target table in the document |
| Footnote explaining comparison basis | Domain-level delta narrative spanning multiple cycles |
| Graceful degradation when prior cycle unavailable (report stands on primary cycle alone) | Cycle picker that turns Report into multi-cycle analytics |
| Using `DomainProfile.sequence[].previousInterpretation` data | Re-implementing movement logic from raw scores in UI (§6.3) |

This matches architecture review coexistence framing: optional Snapshot embed as “Evidence Appendix” is a **future** packaging idea, not Report v1.

## 4.4 Future multi-cycle Report

**Out of scope** unless SPM explicitly reopens. If ever designed, it must not silently reuse Snapshot cycle-filtering machinery without a Report-specific scope line and structural omission rules (extends **G5** scope clause to Report).

---

# 5. PHI acknowledgement and audit parity

## 5.1 Security finding (must resolve here)

Vault reference (2026-08-19 security review): *“Egress asymmetry — Snapshot and Learner Map are gated by PHI acknowledgement and emit `clinicalExport` audit events. CSV export and the printable report emit neither — and both carry more than Snapshot does, including the free-text `note` field.”*

This contract **closes the Report portion** of that finding for intentional in-app egress (§5.7). CSV remains **out of scope** (§8.4). Alpha “trusted-two-tester” deferral **does not carry forward** for Report print once Builder implements this contract.

## 5.2 Models compared (founder chose Model (a) egress + print-only view gate)

### Model (a) — Full parity with Snapshot egress gate + audit **(chosen)**

| Aspect | Behaviour |
|--------|-----------|
| Acknowledgement | Required before **Print / Save as PDF**; uses `artifactKind: 'report'`, namespace `report-export-ack:` per [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.3 |
| Audit | `acknowledgement` on confirm; `print` on in-app print (`channel: 'print'`, `artifact: 'report'`) |
| View route | Report body visible in **any authenticated session without acknowledgement** — Snapshot main-page analogue (founder locked OQ-1, 2026-08-19) |
| Session | Per-assessment `sessionStorage`; fail-closed when unavailable |
| Cross-artifact | Report ack does **not** satisfy Snapshot or Learner Map ack |

**Pros:** Closes egress asymmetry; aligns with org PHI policy posture; reuses shared `clinicalExport/*` modules already reserved for Report; view friction minimized.  
**Cons:** Friction on every first print per session per assessment.

### Model (b) — Lighter in-app print gate **(not chosen)**

| Aspect | Behaviour |
|--------|-----------|
| Acknowledgement | Required only at print button click (minimal dialog) |
| Audit | `print` event only — no `acknowledgement` event |
| View route | Always visible when authenticated |
| Rationale | Report is reviewed on screen before printing; viewing is not “export” |

**Pros:** Lower friction.  
**Cons:** Weaker audit trail (no explicit ack event); diverges from Snapshot/LM pattern; does not fully mirror shared audit vocabulary; harder to prove clinician confirmed PHI policy at egress time.

**Not adopted** for audit posture — Report retains `acknowledgement` + `print` events per Model (a).

## 5.3 Decision (binding — founder 2026-08-19; resolves OQ-1)

Report adopts Model **(a) for egress** with the **print-only view gate** (authenticated view without ack; ack before print). Report uses the **shared three modules only** ([`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.1 / §3.6):

1. `clinicalExportAcknowledgment.ts` — `report-export-ack:{assessmentId}`
2. `clinicalExportErrors.ts` — Report-owned error copy
3. `clinicalExportState.ts` — only if a dedicated export route is added later (see §12 OQ-9)

| Path | Ack required? | Audit events |
|------|----------------|--------------|
| Report **view route** (`#/assessment/:id/report` or equivalent) | **No** — authenticated session only | None |
| In-app **Print / Save as PDF** | **Yes** | `acknowledgement` (on confirm) + `print` (on `window.print()`) |
| Native browser print (Ctrl/Cmd+P) | Cannot block | Document as known limitation (Snapshot §5.6 pattern) |

Gate mechanics match Snapshot main-page Print: if not acknowledged for this assessment session, open the Report PHI dialog (or equivalent) **before** calling `window.print()`. After acknowledgement in-session, subsequent prints proceed without re-prompt for that assessment.

### Superseded text — pre-amendment §5.3 (2026-08-19, retained for history)

> **Recommend Model (a) for egress** … **Binding minimum (even if OQ-1 chooses lighter view posture):** … View without ack in authenticated session; ack required before print (Snapshot main-page analogue) — listed as default recommendation only, not yet founder-locked.

**Supersession note (2026-08-19):** OQ-1 is founder-locked to that default. §5.3 table above is authoritative.

## 5.4 Acknowledgement policy (Report-owned)

Report defines its own mode union and policy predicate ([`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §3.6). **Underspecified:** the lawful mode identifier string(s) are not yet founder-locked (§12 OQ-3). Until resolved, Builder must not invent mode names in audit payloads.

**Binding intent regardless of mode name:** Report has **no lighter “summary-only” mode** that skips acknowledgement on print — the egress document always contains learner identity and interpreted scores. Free-text score `note` is excluded from v1 render (§8).

## 5.5 What the clinician acknowledges

Mirror Snapshot §5.2 structure with Report-specific framing:

1. The artifact contains **personal health information** (learner identity and assessment scores).
2. They are creating an **offline / printable clinical document** that can leave Evalis access control.
3. Distribution and retention are governed by **organization PHI policy**.
4. The Report is a **data summary for communication**, not a diagnosis, treatment plan, or insurance claim without narrative addendum (consistent with existing disclaimer copy in `AssessmentReport.tsx`).

Exact microcopy is implementation/UX detail — **underspecified here** (§12 OQ-4).

## 5.6 Audit payload (Report)

When Report egress is implemented, emissions must use shared vocabulary ([`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §5.8):

| User action | `event` | `channel` | `details` |
|-------------|---------|-----------|-----------|
| PHI ack confirmed (Report print dialog) | `acknowledgement` | `print` | `artifact: 'report'`, `mode: <founder-locked mode>` |
| In-app Print / Save as PDF | `print` | `print` | `artifact: 'report'`, `mode: <founder-locked mode>` |

`export_view` and `html_export` apply **only** if a dedicated export route/channel is founder-approved (§7).

## 5.7 Formal disposition of security finding

| Finding slice | Disposition |
|---------------|-------------|
| Report print without PHI ack | **Closed by this contract** — print-only gate (§5.3); implementation required before Layer 2C production sign-off |
| Report print without audit | **Closed by this contract** — `print` + `acknowledgement` events required on print path |
| Report view without PHI ack | **Not a finding** — founder locked OQ-1: authenticated in-app view is not an egress path; gate applies to print only |
| Report carrying ungated `note` on egress | **Closed for v1** — `note` excluded from render and print output (§8; founder OQ-7); latent field on type is not egress payload |
| CSV export asymmetry | **Explicitly deferred** — not Layer 2C scope (§8.4) |
| Alpha trusted-tester deferral | **Superseded for Report print** once this contract is founder-approved |

---

# 6. Export channel model

## 6.1 Decision — Alpha: browser print sufficient

**Decision (binding for v1):** Named HTML/PDF export channels matching Snapshot PR14B are **not required** for Layer 2C initial delivery.

The Report’s primary audience use case (supervisor sign-off, parent packet, school attachment) is satisfied by **in-app Print / Save as PDF** via `window.print()` when:

1. **G4 (Display = Export)** is satisfied — print output matches on-screen Report body (excluding intentional chrome suppression such as the fixed print button).
2. PHI acknowledgement + audit (§5) gate the print action.
3. Print CSS remains Report-owned — **do not** reuse Snapshot `PrintRenderPlan` / Target Threads machinery.

**Reasoning:** Snapshot needs HTML download as a permanent evidence archive with offline identity maps (Target Index). Report is a **communication layout** with different geometry and no bead grid. Forcing PR14B channel parity prematurely would duplicate Snapshot’s dual-document rule without clinical equivalence benefit.

## 6.2 Future export channels (conditional)

If SPM later requires standalone HTML download (email attachment, EHR upload without print dialog):

| Requirement | Rule |
|-------------|------|
| Shared modules | Reuse **`clinicalExport/` shared three only** — not Snapshot HTML serializer, not Learner Map appendix stack |
| Composition | Report-owned serializer **outside** `clinicalExport/` (Snapshot export contract §3.6) |
| G4 | HTML document must match on-screen Report at canonical export viewport — separate contract amendment required before Builder work |
| Audit | `export_view` on export route mount; `html_export` on download; `print` unchanged for print path |
| Channels | HTML primary; PDF via browser print-to-PDF of print stylesheet — **no PDF library** (Snapshot PR14B precedent) |

## 6.3 Comparison summary

| Channel | v1 required? | Shared `clinicalExport/` | Report-owned composition |
|---------|--------------|--------------------------|---------------------------|
| In-app Print / Save as PDF | **Yes** | Ack + audit | `AssessmentReport.tsx` + print CSS |
| Standalone HTML download | **No** (defer) | Ack + audit + state helpers | Future `reportExportHtml.ts` (name illustrative only) |
| Export route `#/assessment/:id/report/export` | **No** (defer) | Ack scope **undecided** — see §12 OQ-6 / OQ-9 | Future — do not assume print-only view gate extends to export route |

---

# 7. Standing exclusions (strategy alignment)

Vault reference — `01 Product Strategy/(C) Visualization & Learner Intelligence Strategy.md` §Layer 2C (not readable from code-repo scope). Repo strategy [`layer_2_visualization_strategy.md`](../product/visualization/layer_2_visualization_strategy.md) §8–§9 aligns.

**Binding exclusions for Report v1:**

| Exclusion | Status in current code | Contract rule |
|-----------|------------------------|---------------|
| Sequence strip in PDF/print output | Not present | **Forbidden** unless SPM reopens (§12 OQ-5) |
| Numeric assessment grids (targets × cycles cell matrix) | Not present — uses bars and summary tables | **Forbidden** |
| Publisher-form mimicry | Not present | Remains IP-safe communication layout |

**Flag for founder (not silently overridden):** Strategy §9 lists future Report concepts including “cycle movement summaries” and “acquisition/regression appendices.” Vault §Layer 2C excludes sequence strip and numeric grids; movement **summaries** at Report scope are ambiguous relative to Learner Map. Treat full movement narrative and ledger appendices as **deferred** (§12 OQ-5).

---

# 8. `note` field relationship

## 8.1 Current state

- `ReportTargetRow.note` is populated from `AssessmentScore.note` by `buildReportTargetRows()`.
- Tests assert note inclusion on the profile object (`reportProfile.test.ts`).
- **`AssessmentReport.tsx` does not render notes** today — aligned with v1 binding decision.
- Security review flagged notes as PHI-sensitive payload on an ungated egress path; v1 exclusion from render/print closes that slice for Report (§5.7).

## 8.2 Decision framework (options considered)

| Option | Posture | v1 status |
|--------|---------|-----------|
| **Include notes in Report** when present on scored targets | Clinically valuable for external communication; **requires** same PHI acknowledgement and audit as print body (§5); notes must appear on screen iff they appear in print (**G4**) | **Not chosen for v1** |
| **Exclude notes from Report rendering** | `note` may remain on `ReportProfile` type; render and egress omit the field structurally — notes remain available in Matrix / Snapshot evidence | **Chosen (founder OQ-7, 2026-08-19)** |
| **Include but gate separately** | **Not recommended** — creates egress scope asymmetry inside one document (violates **G4** scope clause) | Not applicable |

## 8.3 Decision (binding — founder 2026-08-19; resolves OQ-7)

**Decision:** Free-text score `note` is **excluded from Report rendering in v1**.

| Rule | Value |
|------|--------|
| Type | **`ReportTargetRow.note` remains on `ReportProfile`** — do not remove from the data contract type |
| Composition | `buildReportProfile()` may continue to populate `note` from `AssessmentScore.note` |
| UI | Report components must **not** render `note` |
| Print / v1 egress | Print and any v1 export output must **not** include `note` — structural absence from render tree, not CSS-hidden (**INV-R11**) |
| Revisit | Inclusion may be reconsidered on **clinical demand** — requires contract amendment before Builder enables note rendering |
| Founder reasoning | A therapist’s internal clinical note is not necessarily written for a parent, school, or funder to read |

Notes remain available in Matrix and Assessment Snapshot evidence surfaces; Report v1 is not a note communication channel.

### Superseded text — pre-amendment §8.3 (2026-08-19, retained for history)

> **Recommend include notes when present**, rendered in the target row section, subject to §5 PHI gate on print. … **Founder scope:** Whether external-facing reports should carry free-text clinician notes at all (vs Matrix-only) is a clinical workflow call (§12 OQ-7).

**Supersession note (2026-08-19):** Founder **overrode** this Architecture recommendation. §8.3 decision table above is authoritative for v1.

## 8.4 CSV export (sibling artifact)

CSV export PHI/audit posture remains **out of Layer 2C scope** — not amended by OQ-7.

---

# 9. G4 / G5 / G6 / G7 / G8 compliance path

## 9.1 Composition layer — compliant

`buildReportProfile()` resolves entirely through the canonical chain:

```text
pack_snapshot
    → buildDomainProfiles(pack, scores, previousScores?)
        → interpretTargetScore(target, scoreRow, pack)   [G7/G8]
        → analyticsService.calculateDomainStats            [G6]
    → buildAssessmentLandscapeRollup(domainProfiles)
    → buildReportTargetRows(profile, scores)               [note passthrough only]
```

No raw pack scoring fields are read for interpretation in `reportProfile.ts`.

## 9.2 Presentation layer — findings

| Location | Finding | Severity |
|----------|---------|----------|
| `ReportAssessmentScoreDistribution.tsx`, `ReportDomainSummaryTable.tsx`, `ReportDomainScoreDistribution.tsx` | Consume `STATE_BUCKET_DISPLAY` and profile distributions only — no independent interpretation | **Compliant** |
| `AssessmentReport.tsx` trend arrows (lines ~436–477) | Re-derives up/down/flat from `sequenceItem.interpretation.rawScore` vs `previousInterpretation.rawScore` instead of using `sequenceItem.trend` already computed in `domainProfile.ts` | **Presentation duplication — not a G-law violation** if scores compared are resolver outputs; **Builder cleanup recommended** to use `trend` for single source |
| `AssessmentReport.tsx` `barColorClass` / `scoreTextClass` | Maps `competencyState` to CSS — presentation only | **Compliant** |
| `AssessmentReport.tsx` `pointsPercentage >= 80` badge styling | Arbitrary visual threshold on rollup percentage | **Not a G-law violation** (does not change score meaning); cosmetic |
| `AssessmentReport.tsx` `reportDateStr = new Date()` | Ignores `metadata.generatedAt` for “Report date” header | **G4 presentation inconsistency** — “Report date” and “Generated” can disagree; Builder must align to one founder-defined semantics (§12 OQ-8) |
| `ReportTargetRow.note` on profile, excluded from render | Latent field; must not appear in UI or v1 print | **Compliant when INV-R11 satisfied** — see §8.3 |
| No PHI gate / audit on print | Egress asymmetry | **Contract violation vs §5** — implementation gap, not resolver violation |

## 9.3 Invariant extensions (runtime laws)

| Extension | Law | Rule |
|-----------|-----|------|
| **INV-R5** | Extends **G4** scope clause to Report | On-screen Report body scope must equal Print / Save as PDF scope; no CSS-hidden evidence |
| **INV-R10** | Extends **G5** scope clause to Report | Any future omitted cycle or target scope must be structurally absent from profile and render tree, never CSS-hidden |
| **INV-R1** | **G7** | Report interpretation only via `buildDomainProfiles` / `buildAssessmentLandscapeRollup` chain |
| **INV-R2** | **G8** | Report uses `pack_snapshot` only |

---

# 10. Product invariants (QA-testable)

## 10.1 Purpose and data

- [ ] **INV-R1** `ReportProfile` is built only via `buildReportProfile()` / services it calls — no parallel interpretive DTO.
- [ ] **INV-R2** All scoring uses frozen `pack_snapshot`, never live pack.
- [ ] **INV-R3** Exactly one primary cycle in `metadata.cycleId` / `metadata.cycleNumber` per report instance.
- [ ] **INV-R4** No targets×cycles numeric grid appears in Report screen or print output.
- [ ] **INV-R9** No domain or assessment-wide sequence strip in Report print output.

## 10.2 Comparison bounds

- [ ] **INV-R3b** Trend annotations reference at most one prior cycle (immediate predecessor by cycle number).
- [ ] **INV-R3c** Prior cycle scores never render as a second full target table.

## 10.3 Display = Export

- [ ] **INV-R5** Print output matches on-screen report body (modulo print-button chrome suppression).
- [ ] **INV-R5b** Any field in print must appear on screen at same scope; v1 print scope excludes `note` (§8.3).

## 10.4 Egress security

- [ ] **INV-R12** Report view route renders for authenticated users **without** PHI acknowledgement; gate applies to in-app Print only (§5.3; OQ-1 resolved).
- [ ] **INV-R6** In-app Print does not call `window.print()` until PHI acknowledgement succeeds for `report-export-ack:{assessmentId}`.
- [ ] **INV-R7** Successful acknowledgement emits `clinicalExport` audit with `event: 'acknowledgement'`, `artifact: 'report'`.
- [ ] **INV-R8** Print emits `clinicalExport` audit with `event: 'print'`, `artifact: 'report'`, `channel: 'print'`.
- [ ] **INV-R8b** Report acknowledgement does not satisfy Snapshot or Learner Map acknowledgement namespaces.

## 10.5 Notes (v1 exclusion — founder OQ-7)

- [ ] **INV-R11** v1: `note` must not appear in Report UI or print/export output — structurally absent from render tree, not CSS-hidden; `note` may remain on `ReportProfile` type and in composition output.

---

# 11. Implementation guidance (non-binding orientation)

Builder work after founder approval should, in order:

1. Wire Report print button through shared `clinicalExportAcknowledgment` + `clinicalExportAudit` (`artifactKind: 'report'`).
2. Resolve OQ-3 (mode union) before fixing audit `mode` field values.
3. Align trend arrows to `DomainProfileTarget.trend` (cleanup).
4. Enforce v1 `note` exclusion per §8.3 / INV-R11 — do not enable note rendering until a contract amendment reopens inclusion.
5. Defer standalone HTML export route unless OQ-6 is approved.

**Do not** import Snapshot export HTML/PDF modules into Report.

---

# 12. Open questions (founder / SPM)

## 12.1 Resolved

| ID | Question | Decision | Date |
|----|----------|----------|------|
| **OQ-1** | Must PHI acknowledgement block **viewing** the Report route, or only **print** egress? | **Print only.** Authenticated view without ack; gate before in-app Print / Save as PDF (Snapshot main-page pattern). §5.3. | 2026-08-19 |
| **OQ-7** | Should free-text score `note` appear on external-facing Report at all? | **Excluded from v1 rendering.** Type unchanged; no UI or v1 print/export output. Revisit on clinical demand. Overrides original §8.3 recommendation. §8.3. | 2026-08-19 |

## 12.2 Open

| ID | Question | Default recommendation if silent |
|----|----------|----------------------------------|
| **OQ-2** | How does the clinician select which cycle the Report documents when multiple completed cycles exist? | Explicit cycle selector before render — do not rely indefinitely on `in_progress \|\| cycles[0]` |
| **OQ-3** | What is the Report export **mode union** string(s) for acknowledgement policy and audit payloads? | **Stop — do not invent**; single-mode product likely but name not locked |
| **OQ-4** | Exact PHI acknowledgement microcopy for Report | Mirror Snapshot §5.2 intent with Report framing |
| **OQ-5** | Revisit strategy-deferred items: acquisition/regression appendix, cycle movement **summary** section beyond row arrows? | Defer — standing exclusions for strip/grid remain |
| **OQ-6** | Is a dedicated Report export route (`#/assessment/:id/report/export`) required in v1? | No — print-only sufficient (§6.1) |
| **OQ-8** | “Report date” vs `metadata.generatedAt` — which timestamp(s) should the header show? | **Stop — do not invent**; current UI uses both inconsistently |
| **OQ-9** | **New (surfaced by OQ-1 resolution):** When a dedicated Report export route is founder-approved (OQ-6), does PHI acknowledgement gate **route entry** (Snapshot `#/snapshot/export` pattern) in addition to the print-only gate on the main Report view? | **Stop — do not invent**; OQ-1 locks main view only; export-route gate is a separate founder call |

---

# 13. Underspecifications explicitly not resolved in this contract

The Architecture Agent did **not** assign values for:

1. Report export mode identifier(s) (OQ-3).
2. Report date header semantics (OQ-8).
3. PHI dialogue exact strings (OQ-4).
4. CSV export PHI/audit contract (sibling artifact).

Builder must not silently choose these during Layer 2C implementation.

---

# 14. Document history

| Date | Change |
|------|--------|
| 2026-08-19 | Initial Layer 2C architecture contract — purpose boundary, cycle scope, PHI/audit posture, export channel model, G-law compliance path, `note` field framework |
| 2026-08-19 | Founder amendment — OQ-1 locked (print-only PHI gate); OQ-7 locked (`note` excluded from v1 render; overrides §8.3 recommendation); INV-R5b / INV-R11 / INV-R12 updated; OQ-9 surfaced for future export route |
| 2026-08-19 | Purpose reframe — §1–§2 and related sections superseded by [`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md); egress §5–§6 and cycle §4 carried forward |
