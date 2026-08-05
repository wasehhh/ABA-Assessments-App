# Assessment Snapshot Export Contract (PR14A)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Snapshot — HTML export subsystem |
| **Milestone** | PR14A |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Commit `0c37e67` |
| **References** | [`assessment_snapshot_production_architecture.md`](./assessment_snapshot_production_architecture.md) · [`assessment_snapshot_design_manifesto.md`](./assessment_snapshot_design_manifesto.md) · [`assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) · [`security_and_roles.md`](./security_and_roles.md) |
| **Non-goals** | Implementation · code · print CSS hardening at scale · Learner Map semantic changes · Phase B scoring · Builder UX · new Snapshot visual concepts |

This document is the authoritative product contract for the Assessment Snapshot export subsystem.

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work.

---

# 1. Goals

## 1.1 What this solves

Assessment Snapshot (Layer 2A) is Evalis’s permanent evidence record. It answers **“What happened?”** and contains no interpretation.

At commit `0c37e67`, production Snapshot is live at `#/assessment/:id/snapshot` with Target Threads, layout engine, and PrintRenderPlan wired. Export remains incomplete:

| Gap | Current state |
|-----|---------------|
| HTML export serializer | Absent — Print button calls `window.print()` only |
| PHI acknowledgement gate | Absent — no export route, dialog, or gate |
| Target index for compacted labels | Compaction/disambiguation exist; reference index does not |
| Print CSS hardening at scale | **Out of scope for PR14A** — QA verification task only |

Learner Map already has a production-validated export stack. Snapshot must adopt a **narrow shared extraction** of three nearly artifact-agnostic modules — not a duplicated stack, and not a full generalization.

## 1.2 Success statement

After PR14A:

> A clinician can acknowledge PHI risk, open a dedicated Snapshot export surface, and obtain a standalone HTML evidence record that matches the assessment’s frozen `pack_snapshot`, includes every target and cycle, introduces no interpretation, and — when labels were compacted or otherwise abbreviated — includes a Target Index that restores full authored identity.

## 1.3 What this does NOT solve

| Out of scope | Owner |
|--------------|--------|
| Print CSS hardening / full-size pack print QA | Separate QA task (PR13.6D machinery already shipped) |
| Changing Learner Map export modes, copy, or UX semantics | Forbidden |
| Full generalization of Learner Map export (mode/availability/estimate/appendix) | Forbidden by founder decision |
| Phase B canonical scoring / inheritance | Separate track |
| Assessment Builder UX | Forbidden |
| New Snapshot visual geometries | Target Threads v1 is settled |
| Selected-domain / cycle-range / de-identified Snapshot export | Deferred (§3.4) |
| Competency vocabulary rename (“Mastered” / “Not Yet”) | Unresolved founder decision — do not rename (§11) |

---

# 2. Binding constraints (carry forward)

These constraints are non-negotiable for PR14A:

| ID | Constraint |
|----|------------|
| **G8** | Exports resolve Effective Scoring exclusively from the assessment’s frozen `pack_snapshot`. Never from live pack state. |
| **Effective Scoring** | All scoring interpretation for beads/labels flows through `resolveEffectiveScoring` (Phase A). The export path introduces no independent scoring-definition logic. |
| **Evidence only** | Snapshot export contains no clinical conclusions, recommendations, movement, coverage, or inferred progress narrative in any mode. |
| **Not a publisher clone** | Export layout must not drift toward ABLLS-R / VB-MAPP / AFLS / PEAK publisher forms. IP risk. |
| **No silent score mutation** | Do not silently clamp or mutate out-of-scale recorded scores in exports. |
| **Competency vocabulary** | “Mastered” / “Not Yet” and related legend copy remain as currently shipped until a separate founder rename decision. Note touchpoints only (§11). |

---

# 3. Shared module boundary

## 3.1 Founder decision (binding)

Snapshot will **not** duplicate the Learner Map export stack and will **not** trigger a full generalization of it.

Extract **exactly three** modules into a shared, artifact-agnostic export foundation:

| Source (Learner Map) | Approx. size | Shared role |
|----------------------|--------------|-------------|
| `learnerMapExportAcknowledgment.ts` | 38 lines | PHI acknowledgement persistence + mode-gated requirement check |
| `learnerMapExportErrors.ts` | 25 lines | Load-error kind → clinician-facing title/message |
| `learnerMapExportState.ts` | 111 lines | Export session state helpers (continue gating, param parse/normalize, hash builders parameterized by artifact) |

**Do not extract or generalize:**

- export mode catalogues (`learnerMapExportMode.ts`)
- availability (`learnerMapExportAvailability.ts`)
- size estimate (`learnerMapExportEstimate.ts`)
- appendix segmentation (`learnerMapAppendixSegmentation.ts`)

Those encode artifact-specific semantics and remain per artifact. Layer 2C Report is a known future third consumer of the shared three only.

## 3.2 Module location and naming

| Decision | Value |
|----------|--------|
| Location | `frontend/src/clinicalExport/` |
| Naming prefix | `clinicalExport*` (artifact-agnostic) |
| Learner Map residual | Thin adapters under `components/learnerMap/export/` that preserve existing import paths **or** update call sites in one PR — either approach is allowed if behaviour is unchanged (§8) |

Canonical shared modules:

| Shared module | Responsibility |
|---------------|----------------|
| `clinicalExportAcknowledgment.ts` | Session acknowledgement storage keyed by artifact kind + assessment id; `requiresAcknowledgment(mode, policy)`; `isAcknowledged(...)` |
| `clinicalExportErrors.ts` | `resolveExportLoadError(error, artifactCopy)` → `{ kind, title, message }` |
| `clinicalExportState.ts` | Generic continue-gating; domain-id normalization; generic preview query parse helpers; **parameterized** hash builders |

## 3.3 Artifact kind parameterization

Introduce a closed artifact-kind identifier used only by the shared three:

| Kind | Storage key namespace | Notes |
|------|----------------------|-------|
| `learner-map` | Must remain `learner-map-full-export-ack:` | **Bit-for-bit continuity** with existing session acknowledgements |
| `snapshot` | `snapshot-export-ack:` | New |
| `report` | `report-export-ack:` | Reserved for Layer 2C — no Snapshot/Report coupling beyond the shared three |

### Storage key namespacing

```text
{namespace}{assessmentId}
```

| Artifact | Namespace string (exact) |
|----------|--------------------------|
| Learner Map | `learner-map-full-export-ack:` |
| Snapshot | `snapshot-export-ack:` |
| Report (future) | `report-export-ack:` |

Learner Map’s existing key prefix must **not** change. Migrating existing browser sessions is not required if the prefix is preserved.

### Mode type genericity

Shared acknowledgement and continue-gating accept:

- a **mode value** typed per artifact (Learner Map keeps `'standard' | 'selected-domains' | 'full'`; Snapshot uses its own mode union — §4)
- a **policy predicate** or policy table declaring which modes require acknowledgement for that artifact

Shared code must not hard-code Learner Map mode names as the only lawful modes.

### Error taxonomy

Shared load-error kinds remain:

| Kind | Meaning |
|------|---------|
| `assessment_not_found` | Assessment missing / bad link |
| `load_failed` | Any other prepare/load failure |

Artifact-specific **title and message strings** are supplied by the calling artifact (Learner Map copy unchanged; Snapshot supplies Snapshot-oriented copy). Shared code owns kind resolution; artifacts own prose.

## 3.4 Exact Learner Map call-site changes

Allowed changes (behaviour-preserving only):

1. Re-point acknowledgement / errors / state imports to `clinicalExport/*` (directly or via thin LM wrappers).
2. Pass `artifactKind: 'learner-map'` (or equivalent) and existing mode union into shared APIs.
3. Preserve `learner-map-full-export-ack:` key prefix exactly.
4. Preserve `requires…Acknowledgment` semantics: **only** Learner Map mode `full` requires acknowledgement.
5. Preserve route hashes, query params (`mode`, `domains`), dialog continue rules, and export page deep-link blocking behaviour.

Forbidden Learner Map changes:

- Renaming clinician-visible mode labels or descriptions
- Changing which modes exist
- Changing when acknowledgement is required
- Changing availability, estimate, or appendix segmentation behaviour
- Changing export HTML content or pagination semantics

## 3.5 Learner Map bit-for-bit guarantee

See §8 for the full regression contract.

## 3.6 Report (Layer 2C) adoption without further refactor

Report later adopts the shared three by:

1. Using `artifactKind: 'report'` and `report-export-ack:` namespace
2. Defining Report-owned mode union + acknowledgement policy
3. Defining Report-owned availability, estimate (if any), and document composition **outside** `clinicalExport/`

No second extraction pass should be required for acknowledgement, load-error kinds, or generic continue/param helpers.

---

# 4. Snapshot export modes

## 4.1 Clinical framing (not symmetry)

Learner Map modes (`standard` / `selected-domains` / `full`) exist because Learner Map is an **interpretive supervision artifact**: Standard can omit appendix detail and still answer “Should I sign off?” for many workflows.

Snapshot is a different artifact. It is an **evidence record**. A Snapshot that omits domains or cycles is an incomplete permanent record and is clinically dangerous if filed or shared as “the Snapshot.”

Therefore Snapshot modes must **not** mirror Learner Map by default.

## 4.2 Decision — reduce relative to Learner Map

| Decision | Detail |
|----------|--------|
| **V1 / PR14A mode set** | Exactly one production mode: **`full`** |
| **Meaning of `full`** | Entire assessment evidence record: every primary group, every secondary group, every target, every included cycle, in authored order |
| **Not shipped in PR14A** | `standard`, `selected-domains`, cycle-range, de-identified |

### What `full` includes

- Snapshot chrome metadata (learner display name per org policy, assessment/pack name, pack version if available, cycle range, generated timestamp)
- Structure legend / clinical chrome already defined for Snapshot print (evidence-only; no movement/coverage)
- Complete Target Threads evidence geometry for all domains/groups/targets/cycles from the frozen `pack_snapshot`
- Target Index when the trigger condition in §6 is met
- Minimal PHI / clinical-document disclaimer (raw evidence ≠ diagnosis/treatment) — shorter than Learner Map export prose; no interpretive narrative

### What `full` excludes

- Movement indicators
- Coverage percentages / distribution bars / competency rollups
- Domain competency summaries
- Recommendations, narrative, AI
- Edit affordances
- Live pack content
- Publisher-grid visual mimicry
- Selected-domain appendix patterns from Learner Map

## 4.3 Why not selected-domains in PR14A

Selected primary groups can be valuable later for large packs, but only with an unmistakable **partial-record** banner and filename signalling. Shipping that without the banner discipline would create incomplete evidence files that look complete.

**Defer** selected primary groups and cycle-range to a post-PR14A milestone. Do not leave stubs that imply partial export is available.

## 4.4 Mode persistence in shared state

Even with one mode, Snapshot export state still carries `exportMode: 'full'` so:

- shared continue-gating and acknowledgement policy stay uniform
- future modes can extend the Snapshot-owned union without reshaping the shared three
- URL preview params can include `mode=full` for symmetry with Learner Map routing patterns

Default and only lawful PR14A value: `full`. Unknown mode params coerce to `full` (not to a partial mode).

## 4.5 Delivery channels vs modes

| Channel | Relationship to mode |
|---------|----------------------|
| Standalone HTML export | Serializes `full` Snapshot evidence document |
| Browser Print / Save as PDF from export surface | Prints the same `full` document |
| On-screen Snapshot Print control | Prints the on-screen Snapshot evidence surface (same clinical content contract as `full`, screen/print composition may differ per existing PrintRenderPlan) |

Channels are not additional modes. They are egress paths for the same evidence record.

---

# 5. PHI acknowledgement gate

## 5.1 Which Snapshot modes require acknowledgement

| Mode | Requires acknowledgement? | Why |
|------|---------------------------|-----|
| `full` (only PR14A mode) | **Yes** | Snapshot export is always a complete longitudinal clinical evidence file containing learner identifiers and scores — equivalent PHI egress risk to Learner Map Full, without a lighter “summary-only” mode |

There is no Snapshot mode that skips acknowledgement in PR14A.

## 5.2 What the clinician is acknowledging

The clinician acknowledges that:

1. The artifact contains **personal health information** (learner identity and assessment scores).
2. They are creating an **offline / printable clinical document** that can leave Evalis access control.
3. Distribution and retention are governed by **organization PHI policy**.
4. Snapshot is **raw evidence**, not a diagnosis, treatment plan, or interpretive report.

Exact microcopy is an implementation/UX detail, but must not imply interpretive sign-off (that is Learner Map / Report territory).

## 5.3 Session scope and storage

| Rule | Value |
|------|--------|
| Storage | `sessionStorage` |
| Key | `snapshot-export-ack:{assessmentId}` |
| Value | `'1'` when acknowledged |
| Scope | Current browser tab session × assessment id |
| Cross-assessment | Acknowledgements do not transfer across assessment ids |
| Cross-artifact | Snapshot ack does **not** satisfy Learner Map Full ack (and vice versa) |

## 5.4 Storage unavailable

If `sessionStorage` throws or is unavailable:

- Treat as **not acknowledged**
- Do not invent memory-only “sticky” acknowledgement that survives navigation unless the user re-checks in the same dialog instance before continue
- Preview/export route must deny access until acknowledgement is recorded successfully **or** re-confirmed in-flow on that page when storage failed after dialog continue (fail closed)

This matches Learner Map’s fail-closed posture.

## 5.5 Deep-link to export route without acknowledgement

Route (canonical):

```text
#/assessment/:id/snapshot/export
```

Optional query: `?mode=full` (only lawful mode).

**Behaviour when acknowledgement is missing:**

1. Do **not** render the exportable evidence document.
2. Show a blocking status panel (Learner Map pattern): explain that PHI acknowledgement is required.
3. Provide actions: return to Snapshot (optionally re-open export dialog), and return to assessment overview.
4. Do not silently acknowledge.

## 5.6 On-screen `window.print()` — decision

**Decision: Yes — the on-screen Snapshot Print control requires the same PHI acknowledgement gate.**

### Justification

1. Print → Save as PDF is an explicit PHI egress path equal in risk to HTML download for clinical filing and sharing.
2. Snapshot’s only mode is full evidence; there is no “safe light print.”
3. Aligns Snapshot with treating the artifact as a clinical document under org PHI policy (`security_and_roles.md` posture; production architecture §6.2).
4. Avoids a product contradiction where Export is gated but Print silently ships the same PHI.

### Gate mechanics for Print

| Path | Required behaviour |
|------|--------------------|
| In-app **Print** button on `#/assessment/:id/snapshot` | If not acknowledged for this assessment session, open the Snapshot export/PHI dialog (or equivalent gate) before calling `window.print()` |
| After acknowledgement in-session | Print may proceed without re-prompting |
| Export surface Print button | Allowed only if acknowledgement already satisfied to reach that surface; may print without a second prompt |
| Native browser print (Ctrl/Cmd+P, menu) | **Cannot be reliably blocked**; document as known limitation. Product gate covers intentional in-app Print and Export actions only |

### What Print does **not** require

- Navigating to the HTML export route (Print may remain on the Snapshot page after acknowledgement)
- A different acknowledgement namespace (use `snapshot-export-ack:`)

## 5.7 Export availability vs acknowledgement

Acknowledgement is independent of Snapshot availability.

| Gate | Rule |
|------|------|
| Snapshot availability | Existing `getAssessmentSnapshotAvailability` — pack snapshot present, domains/targets exist, ≥1 cycle |
| Unscored evidence | Allowed (unscored cells are valid raw evidence) — unchanged |
| PHI acknowledgement | Required for Print (in-app) and Export after availability is satisfied |

Do not invent a “must have scored targets” export gate that Learner Map uses; Snapshot’s evidence-empty state remains printable/exportable with the existing empty-evidence notice semantics.

---

# 6. Target index

## 6.1 Purpose

Compaction and disambiguation (`snapshotTargetIdentity.ts`) shorten visible thread codes for density. The Target Index is the **reference table** that maps each displayed code back to full authored identity so clinicians can file, audit, and cross-walk to the pack without hover tooltips.

PR14A does **not** invent new abbreviation logic.

## 6.2 Index row contents

Each index row contains:

| Field | Meaning |
|-------|---------|
| **Displayed code** | Final visible thread code after compaction and disambiguation |
| **Authored target ID** | Full `target_id` from the frozen pack snapshot |
| **Authored label** | Full authored target title |
| **Primary group context** | Domain / primary group id + title (structure labels as authored) |
| **Secondary group context** | Secondary group id + title when present; empty/omitted when flat |

Ordering: authored pack order (primary group → secondary group → target order). Same order as evidence threads.

## 6.3 Trigger condition

**Decision: conditional — not always present.**

Include the Target Index when **any** target on the Snapshot satisfies at least one of:

1. **Compaction** — visible code is a compacted form of a longer authored id (`resolveThreadDisplayLabel` / compact path; including cases where `accessibilityIdentity` retains the full authored id).
2. **Disambiguation** — visible code received a `-2`, `-3`, … suffix from `disambiguateVisibleCodes`.
3. **Non-authored visible code** — visible code was derived from title helpers or positional fallback because the authored id was unusable (`isUnusableAuthoredTargetId`), so the printed code is not the raw target id.

If none of the above occur for any target, **omit** the Target Index (no empty appendix).

## 6.4 Where it appears

| Surface | Include index? | Justification |
|---------|----------------|---------------|
| **On-screen Snapshot** | **Yes, when triggered** | Screen has tooltips, but ABLLS-scale scanning still needs a scannable legend; place as a collapsible “Target index” section after the evidence record |
| **Print document** | **Yes, when triggered** | Paper/PDF has no hover tooltips; index is required for clinical filing |
| **HTML export document** | **Yes, when triggered** | Offline readers and recipients lack Evalis tooltip behaviour; same clinical need as print |

## 6.5 Evidence vs presentational chrome

**Decision: The Target Index is presentational chrome, not part of the evidence record geometry.**

| Implication | Rule |
|-------------|------|
| Clinical meaning | Index does not add interpretation; it restores identity for display codes |
| RenderPlan / PrintRenderPlan | Index is **outside** domain/thread/bead evidence planning |
| Composition | Evidence pages compose via existing `snapshotPrintRenderPlan`; index is appended as document chrome after evidence |
| Data invariance | Including/excluding the index never changes scores, order of evidence threads, or bead values |

## 6.6 Print / export pagination and placement

When the index is triggered:

1. Complete all evidence pages first (existing PrintRenderPlan rules unchanged).
2. Start the Target Index on a **new page** (do not interleave mid-domain).
3. Title the section clearly, e.g. “Target index”.
4. Allow the index itself to paginate across multiple pages if needed.
5. Repeat a minimal document header on index continuation pages if print chrome already supports repeating headers; do not invent Learner Map–style multi-page prose.

HTML export follows the same logical order: evidence document body, then index appendix when triggered.

## 6.7 On-screen placement

- After the Target Threads evidence view
- Collapsible; default **expanded when triggered** on first paint of a session view is acceptable; do not hide solely behind hover
- `no-print` vs print-only: on-screen collapsible may be screen-oriented if print uses the dedicated print index section — both must stay content-identical when triggered

---

# 7. Export document contract

## 7.1 Format

| Property | Requirement |
|----------|-------------|
| Primary format | Standalone HTML file |
| Offline | Opens without Evalis login or network |
| Self-contained | Inline CSS; scores visible in DOM; no runtime API calls |
| Read-only | No editing affordances |
| PDF | Browser Print → Save as PDF of the same document; no dedicated PDF engine in PR14A |
| Filename | Includes assessment identity + date; must not look like a publisher form name |

## 7.2 Data authority

| Input | Source |
|-------|--------|
| Structure, targets, scales | Assessment `pack_snapshot` only (G8) |
| Scores | Assessment score rows for included cycles |
| Effective Scoring for display | `resolveEffectiveScoring` only |
| Profile assembly | Existing Snapshot profile path (`buildAssessmentSnapshotProfile` over production learner-map production data) — no forked scoring meaning |

## 7.3 Parity

Exported HTML evidence must match the production Snapshot evidence meaning for the same assessment:

- same targets, same order, same cycles, same recorded scores, same Effective Scoring-derived bead labels
- layout may use print/export composition tiers already defined; presentation factoring must not drop marks

## 7.4 Minimum metadata block

- Learner name (org policy)
- Assessment / pack name and version
- Cycle range
- Generated timestamp
- Structure-label legend copy as already defined for Snapshot
- Evidence-only disclaimer (non-interpretive)

## 7.5 Route and entry points

| Entry | Behaviour |
|-------|-----------|
| Snapshot page **Export** control (to be added) | Opens dialog → acknowledgement → `#/assessment/:id/snapshot/export?mode=full` |
| Snapshot page **Print** control | Acknowledgement gate (§5.6) then `window.print()` on Snapshot print surface |
| Direct hash navigation | Acknowledgement enforced (§5.5) |

Dialog may be simpler than Learner Map’s (single mode) but must still collect acknowledgement before continue.

---

# 8. Learner Map regression guarantee

## 8.1 What must remain unchanged

For Learner Map export, after the shared extraction:

| Area | Must remain unchanged |
|------|------------------------|
| Modes | `standard` / `selected-domains` / `full` definitions and copy |
| Acknowledgement policy | Only `full` requires ack |
| Storage key prefix | `learner-map-full-export-ack:` exact string |
| Continue gating | Selected-domains requires ≥1 domain; full requires ack |
| Routes | `#/assessment/:id/learner-map/export` and query param semantics |
| Availability | `getLearnerMapExportAvailability` behaviour |
| Estimates | Appendix size estimate behaviour |
| Appendix segmentation | Unchanged |
| Export document content | Unchanged clinician-visible output for the same inputs |

## 8.2 How it will be verified

QA / Builder verification must include:

1. Existing Learner Map export unit tests still pass without semantic assertion changes (import path updates only).
2. Manual or automated checks that:
   - Standard export still does not require acknowledgement
   - Full export still requires acknowledgement and still writes the same storage key
   - Selected-domains still requires domain selection
   - Deep-link without ack still blocks Full export preview
3. No Snapshot-only code paths execute during Learner Map export.

## 8.3 Failure condition

If any Learner Map clinician-visible export behaviour changes, PR14A is **not** complete — regardless of Snapshot export success.

---

# 9. Product invariants (QA-testable)

QA may test these directly without reading implementation plans.

### Shared extraction

- [ ] **INV-S1** Shared modules live under `frontend/src/clinicalExport/` (or the location named in §3.2 if adjusted only by founder amendment).
- [ ] **INV-S2** Only acknowledgement, errors, and generic state helpers are shared — not LM mode/availability/estimate/appendix modules.
- [ ] **INV-S3** Learner Map Full ack still uses storage key prefix `learner-map-full-export-ack:`.
- [ ] **INV-S4** Snapshot ack uses `snapshot-export-ack:` and does not clear/satisfy Learner Map ack.

### Snapshot modes

- [ ] **INV-M1** PR14A Snapshot export offers only mode `full`.
- [ ] **INV-M2** Full export includes all domains, targets, and cycles from the assessment snapshot.
- [ ] **INV-M3** Export contains no movement, coverage, recommendations, or interpretive narrative.
- [ ] **INV-M4** Unknown mode query params do not create a partial export; they coerce to `full` or fail closed without partial content.

### PHI gate

- [ ] **INV-P1** Export route without acknowledgement does not render the exportable document.
- [ ] **INV-P2** In-app Snapshot Print without acknowledgement does not call print until acknowledgement succeeds.
- [ ] **INV-P3** After acknowledgement in-session for an assessment, Export and Print proceed without re-prompt for that assessment.
- [ ] **INV-P4** When `sessionStorage` is unavailable, acknowledgement fails closed.
- [ ] **INV-P5** Snapshot acknowledgement is per `assessmentId`.

### G8 / scoring

- [ ] **INV-G8** Changing the live content pack after assessment creation does not change scores/scales shown in Snapshot export for that assessment.
- [ ] **INV-E1** Export bead labels/maxima match on-screen Snapshot for the same assessment (Effective Scoring authority).
- [ ] **INV-E2** Out-of-scale recorded scores are not silently clamped in export.

### Target index

- [ ] **INV-I1** When any visible code was compacted, disambiguated, or non-authored-fallback, Target Index appears on screen, print, and HTML export.
- [ ] **INV-I2** When no such abbreviation occurred, Target Index is omitted.
- [ ] **INV-I3** Every index row includes displayed code, authored target id, authored title, primary group context, and secondary group context when applicable.
- [ ] **INV-I4** Index order matches authored evidence order.
- [ ] **INV-I5** Print/export place the index after evidence, starting on a new page.
- [ ] **INV-I6** Index presence does not change evidence thread scores or order.

### Artifact boundary

- [ ] **INV-A1** Export is not visually positioned as a publisher grid clone.
- [ ] **INV-A2** Competency legend vocabulary remains unchanged from current Snapshot shipping strings pending founder rename (§11).

### Learner Map regression

- [ ] **INV-L1** Learner Map export modes/ack/routes/content unchanged per §8.

---

# 10. Risks

| Risk | Severity | Mitigation in contract |
|------|----------|------------------------|
| Partial Snapshot exports filed as complete | High | Single `full` mode only in PR14A |
| Print bypasses PHI gate while Export is gated | High | Gate in-app Print with same ack |
| Native Ctrl/Cmd+P ungated | Medium | Documented limitation; gate intentional controls |
| Shared extraction accidentally changes LM keys | High | Exact prefix freeze + regression §8 |
| Target Index omitted when disambiguation-only | Medium | Trigger includes disambiguation and non-authored fallbacks |
| Index treated as evidence → RenderPlan churn | Medium | Explicit chrome / outside PrintRenderPlan |
| Competency rename mid-export | Low/Med | §11 touchpoints; no rename in PR14A |
| Publisher-like export chrome creep | High | Binding constraint + INV-A1 |

---

# 11. Competency vocabulary (unresolved — do not rename)

Founder decision on “Mastered” / “Not Yet” (and related competency labels) is **unresolved**.

PR14A must:

- Keep current Snapshot legend and bead accessibility strings as shipped
- Not design export-specific synonyms
- Not couple export completion to a rename

**Future rename touchpoints on the export path** (for a later decision only):

- Snapshot visual system legend labels (`snapshotVisualSystem` and equivalents)
- Bead/`aria-label` / tooltip competency phrases reused by print and export serialization
- Any export metadata legend that reprints competency colour meanings
- QA fixtures asserting legend copy

Do not expand this list into a rename design.

---

# 12. Open questions (founder)

Anything below is **not** decided by this contract and must not be silently assumed by Builder.

| ID | Question | Notes |
|----|----------|-------|
| **OQ-1** | Final clinician-facing PHI acknowledgement microcopy for Snapshot | Contract defines meaning (§5.2); exact sentences can be founder/UX approved later without changing gate semantics |
| **OQ-2** | Whether org policy requires logging acknowledgement events to `audit_logs` | Not required by current Learner Map pattern; Alpha posture may defer |
| **OQ-3** | Competency vocabulary rename | Explicitly unresolved (§11) |
| **OQ-4** | Post-PR14A partial export (selected primary groups / cycle range) filename and banner standards | Deferred; do not stub UI |
| **OQ-5** | Whether standalone HTML should embed a machine-readable JSON audit block alongside DOM evidence | Optional enhancement; not required for PR14A acceptance if DOM evidence is complete |

If Builder encounters a product choice not covered here and not listed above, **stop and escalate** — do not invent policy.

---

# 13. Acceptance criteria for PR14A completion

PR14A is complete only when:

1. Shared `clinicalExport` three-module extraction exists and Learner Map uses it without semantic drift (§8, INV-L*).
2. Snapshot export route + dialog + HTML serializer ship mode `full` only (§4).
3. PHI acknowledgement gates Export and in-app Print (§5; INV-P*).
4. Target Index appears per trigger on screen, print, and export; omitted otherwise (§6; INV-I*).
5. G8 and Effective Scoring invariants hold for export (§2; INV-G8, INV-E*).
6. Print CSS hardening at scale is **not** treated as a PR14A blocker (separate QA).
7. No competency rename and no Snapshot visual redesign landed under this milestone.
8. QA checklist in §9 is green.

---

# 14. Closing contract statement

**PR14A Snapshot export:**

1. Extract only acknowledgement, errors, and generic export-state helpers into `clinicalExport/`.
2. Snapshot exports a single mode — **full evidence** — not a Learner Map mode mirror.
3. PHI acknowledgement is mandatory for Snapshot Export and in-app Print; fail closed; per assessment session.
4. Target Index is conditional presentational chrome mapping displayed codes to authored identity; outside evidence RenderPlan; after evidence in print/export.
5. Runtime scoring remains Phase A Effective Scoring from frozen `pack_snapshot` (G8).
6. Learner Map export behaviour remains unchanged and regression-verified.
7. Unresolved founder items stay in §12 — Builder does not decide them.

This is the implementation contract for Builder, QA, and Overseer for Assessment Snapshot export.
