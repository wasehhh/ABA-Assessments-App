# Assessment Snapshot Export Contract (PR14A / PR14B)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Snapshot — export subsystem (HTML + PDF channels) |
| **Milestone** | PR14A (base) · **PR14B amendment** (export channel semantics) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Commit `0c37e67` (PR14A baseline) · contract commit `9049eb1` · PR14B amends in place |
| **References** | [`assessment_snapshot_production_architecture.md`](./assessment_snapshot_production_architecture.md) · [`assessment_snapshot_design_manifesto.md`](./assessment_snapshot_design_manifesto.md) · [`assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) · [`security_and_roles.md`](./security_and_roles.md) |
| **Non-goals** | Implementation · code · print CSS hardening at scale · print-path / PR14A-4 index planner changes · Learner Map semantic changes · Phase B scoring · Builder UX · new Snapshot visual concepts |

This document is the authoritative product contract for the Assessment Snapshot export subsystem.

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work. PR14A-4 (print-path / index planner) must commit before any PR14B implementation work is entangled with it.

---

## PR14B amendment banner (2026-08-06)

**Founder-directed reversal** of the 2026-08-04 “one document for all egress paths” decision in §4.5 and §7.

| Export page offers | Does not offer |
|--------------------|----------------|
| **HTML** — looks like on-screen Snapshot (screen RenderPlan) | A redundant **Print** button (main Snapshot page already has Print) |
| **PDF** — looks like main Snapshot **Print** output (PrintRenderPlan + PR14A-4 index pages), via browser print-to-PDF | A PDF generation library or second layout engine |

Superseded 2026-08-04 text is preserved under dated notes in §4.5 and §7 so the reversal remains visible.

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

After PR14A + PR14B:

> A clinician can acknowledge PHI risk, open a dedicated Snapshot export surface, and choose **HTML** or **PDF**. HTML matches the on-screen Snapshot (screen layout, frozen at the canonical export viewport). PDF matches the main Snapshot Print output (print composition + planned index pages) via browser print-to-PDF. Both channels carry the full evidence record from the frozen `pack_snapshot`, introduce no interpretation, and — when labels were compacted or otherwise abbreviated — include a Target Index appropriate to that channel.

## 1.3 What this does NOT solve

| Out of scope | Owner |
|--------------|--------|
| Print CSS hardening / full-size pack print QA | Separate QA task (PR13.6D machinery already shipped) |
| Changing print path or PR14A-4 index planner | Forbidden by PR14B — untouched |
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
| **Evidence only** | Snapshot export contains no clinical conclusions, recommendations, movement, coverage, or inferred progress narrative in any mode or channel. |
| **Not a publisher clone** | Export layout must not drift toward ABLLS-R / VB-MAPP / AFLS / PEAK publisher forms. IP risk. |
| **No silent score mutation** | Do not silently clamp or mutate out-of-scale recorded scores in exports. |
| **Mode vs channel** | Mode remains `full` only. HTML and PDF are channels, not modes (§4.5). |
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

**Restatement (binding):** Mode remains **`full` only**. Channels are **not** modes. A channel chooses *how the full evidence record is materialized for a medium*; it does not change which targets, cycles, or scores are included.

### PR14B channel model (authoritative)

| Channel | Clinician label (export page) | Layout authority | Mechanism |
|---------|-------------------------------|------------------|-----------|
| **HTML** | Download HTML (or equivalent) | Screen RenderPlan (`buildSnapshotRenderPlan` / on-screen Target Threads) | Standalone `.html` download |
| **PDF** | PDF / Save as PDF (or equivalent) | PrintRenderPlan (`buildPrintRenderPlan`) + PR14A-4 planned index pages | `window.print()` → browser Save as PDF against the **print document** |
| **Print** (main Snapshot page only) | Print | Same print document as PDF channel | `window.print()` on Snapshot page |

| Rule | Detail |
|------|--------|
| Export page controls | Exactly **two** options: HTML and PDF. **No Print button** on the export page (avoids duplicating the main Snapshot Print control). |
| HTML looks like | On-screen Snapshot |
| PDF looks like | Main Snapshot Print output |
| PDF implementation | Browser print-to-PDF only. No PDF library. No second layout engine. `snapshotPrintRenderPlan.ts` and `snapshotPrintPageProfile.ts` stay untouched. |

### Why this is not the rejected pattern

#### What the 2026-08-04 one-document decision got right

It correctly rejected **one mode name (`full`) producing two different clinical documents depending on which button was clicked without naming the difference**. Under that defect, “full” could mean tabular download geometry on one path and Target Threads print geometry on another — same label, different records. That ambiguity is clinically and product-unsafe.

#### Why PR14B is not a return to that defect

PR14B allows **two named channels** with **explicit medium contracts**:

| Rejected pattern (2026-08-04) | Allowed pattern (PR14B) |
|-------------------------------|-------------------------|
| One name (`full`) hides two documents | One mode (`full`) = complete evidence content; channels name the medium |
| Download vs print silently disagree | HTML ↔ screen layout; PDF ↔ print layout — stated in UI and audit |
| Clinician cannot predict output from the control label | Control label matches output medium |

Two representations are coherent when each is **separately named and bound to its medium**. Two representations under one undifferentiated name were not.

### Superseded text — 2026-08-04 (retained for history)

> | Channel | Relationship to mode |
> |---------|----------------------|
> | Standalone HTML export | Serializes `full` Snapshot evidence document |
> | Browser Print / Save as PDF from export surface | Prints the same `full` document |
> | On-screen Snapshot Print control | Prints the on-screen Snapshot evidence surface (same clinical content contract as `full`, screen/print composition may differ per existing PrintRenderPlan) |
>
> Channels are not additional modes. They are egress paths for the same evidence record.

**Supersession note (2026-08-06):** The 2026-08-04 reading that print and download must render **one document from one plan** is reversed. Content completeness (`full`) remains identical across channels; **layout plan** is channel-specific as in the PR14B table above.

---

## 4.6 HTML channel — viewport and plan freeze (PR14B)

`buildSnapshotRenderPlan` is viewport-dependent. A standalone HTML file has no live app viewport at open time, and the recipient’s window width is unknown.

### Decisions

| Question | Decision |
|----------|----------|
| Serialization viewport | Freeze the screen plan at **`SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM` (96)** — the existing canonical screen fallback in `snapshotLayoutEngine.ts` |
| Where the constant lives | Product references that existing constant by name; do not invent a parallel “export-only” width unless founder amends this contract |
| Fixed vs reflow | The HTML artifact is a **fixed-plan clinical record**: geometry matches the plan built at that viewport. The file may allow horizontal scrolling if the recipient window is narrower; it must **not** rebuild packing to “fit” the recipient |
| Recompute on resize? | **No.** Inline JS must **not** recompute `buildSnapshotRenderPlan` on resize. The plan is frozen at export time |

### Justification

1. A filed clinical evidence record must be **deterministic**: two clinicians opening the same file see the same domain packing and thread geometry.
2. Recomputing on recipient resize would make the serialized plan disagree with the rendered result — the core defect this section exists to prevent.
3. “Exactly as on the exporter’s live monitor” is rejected: exporter viewport is ephemeral and not part of the assessment record. The canonical default screen viewport is the shared, testable freeze point already used when measurement is unavailable.
4. Matching “on-screen Snapshot” means Target Threads **screen** visual system and screen RenderPlan semantics — not the exporter’s incidental pixel width at click time.

### Evidence completeness

Plan freeze must never drop targets, cycles, beads, or index rows. Viewport choice affects packing/presentation only (data-invariant principle).

---

## 4.7 HTML channel — inline script and self-containment (PR14B)

| Rule | Requirement |
|------|-------------|
| Inline `<script>` | **Permitted** for collapsible Target Index and bead hover parity with on-screen Snapshot |
| External `src` | **Forbidden** (no CDN, no Evalis-hosted runtime fetch for behaviour) |
| External stylesheets / fonts by URL | **Forbidden** for behaviour-critical presentation; CSS must be inlined |
| Network at open | Standalone file opens offline; no runtime API calls |

### Self-containment invariant (precise)

> A Snapshot HTML export is self-contained when a recipient can open the file without network access and still see **all evidence** (every target, cycle, score/bead, metadata, and — when triggered — the full Target Index content) using only bytes inside the file. Progressive JS enhancements may add collapse/hover; they must not be required to reveal evidence or index rows.

### Graceful degradation

| Condition | Required behaviour |
|-----------|-------------------|
| JS disabled | Target Index (when present) renders **expanded** and fully readable |
| Script stripped by mail/org gateway | Same — index content remains in HTML; collapse must not rely on “closed by default in markup” |
| Collapse behaviour | **JS enhancement only** — never the reverse (never ship collapsed-only markup that needs JS to expand) |
| Bead hover | Enhancement only; scores remain visible without hover |

### Accepted delivery tradeoff

Some organization gateways strip scripted HTML. That may remove collapse/hover polish. **Evidence and index readability must survive.** This is a known accepted tradeoff, not a defect to “fix” by externalizing scripts.

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

## 5.6 On-screen Print and export-page PDF — decision

**Decision: Yes — the on-screen Snapshot Print control requires the same PHI acknowledgement gate.**

**PR14B:** The export page’s **PDF** action is the same clinical egress class (browser print-to-PDF of the print document) and is covered by the same acknowledgement session. The export page does **not** host a separate Print button.

### Justification

1. Print / Save as PDF is an explicit PHI egress path equal in risk to HTML download for clinical filing and sharing.
2. Snapshot’s only mode is full evidence; there is no “safe light print.”
3. Aligns Snapshot with treating the artifact as a clinical document under org PHI policy (`security_and_roles.md` posture; production architecture §6.2).
4. Avoids a product contradiction where HTML Export is gated but Print/PDF silently ships the same PHI.

### Gate mechanics

| Path | Required behaviour |
|------|--------------------|
| In-app **Print** on `#/assessment/:id/snapshot` | If not acknowledged for this assessment session, open the Snapshot export/PHI dialog (or equivalent gate) before calling `window.print()` |
| Export page **HTML** download | Acknowledgement already required to reach/use the export surface; download may proceed without a second prompt |
| Export page **PDF** | Acknowledgement already required to reach the export surface; PDF may call `window.print()` on the print document without a second prompt |
| After acknowledgement in-session | Print, HTML, and PDF proceed without re-prompting for that assessment |
| Native browser print (Ctrl/Cmd+P, menu) | **Cannot be reliably blocked**; document as known limitation. Product gate covers intentional in-app Print, HTML, and PDF actions only |

### What Print / PDF do **not** require

- A different acknowledgement namespace (use `snapshot-export-ack:`)
- Re-acknowledgement when switching between HTML and PDF on the export page in the same session

### PHI gate scope (unchanged by PR14B channel split)

The PHI acknowledgement gate **does not** change its storage, fail-closed rules, or per-assessment session semantics. It continues to cover:

1. Main Snapshot page **Print**
2. Export page **HTML**
3. Export page **PDF**

---

## 5.7 Export availability vs acknowledgement

Acknowledgement is independent of Snapshot availability.

| Gate | Rule |
|------|------|
| Snapshot availability | Existing `getAssessmentSnapshotAvailability` — pack snapshot present, domains/targets exist, ≥1 cycle |
| Unscored evidence | Allowed (unscored cells are valid raw evidence) — unchanged |
| PHI acknowledgement | Required for Print (main page), HTML, and PDF after availability is satisfied |

Do not invent a “must have scored targets” export gate that Learner Map uses; Snapshot’s evidence-empty state remains printable/exportable with the existing empty-evidence notice semantics.

---

## 5.8 Audit trail (PR14B)

Shared vocabulary in `clinicalExportAudit.ts` remains four events with **one meaning per name** across artifacts:

| Event | Meaning (unchanged) |
|-------|---------------------|
| `acknowledgement` | Clinician confirmed PHI risk for this assessment session |
| `export_view` | Export preview surface rendered with acknowledgement satisfied (not a file download) |
| `html_export` | Standalone HTML document was generated and downloaded |
| `print` | In-app Print / Save-as-PDF path invoked (`window.print()` against the print document) |

| Channel field | Meaning (unchanged) |
|---------------|---------------------|
| `export` | Export-surface / download-oriented egress context |
| `print` | Print / Save-as-PDF egress context |

### Snapshot emissions after PR14B

| User action | `event` | `channel` | Distinguishing `details` |
|-------------|---------|-----------|---------------------------|
| PHI ack confirmed | `acknowledgement` | `export` or `print` per dialog intent (existing pattern) | `artifact: 'snapshot'`, `mode: 'full'` |
| Export page opens (acked + ready) | `export_view` | `export` | `artifact: 'snapshot'`, `mode: 'full'` |
| Download HTML | `html_export` | `export` | `artifact: 'snapshot'`, `mode: 'full'` — **stays `html_export`** |
| Export page **PDF** | `print` | `print` | `artifact: 'snapshot'`, `mode: 'full'`, **`surface: 'export'`** |
| Main Snapshot **Print** | `print` | `print` | `artifact: 'snapshot'`, `mode: 'full'`, **`surface: 'snapshot'`** |

### Rules

1. Removing the export-page Print button removes that control; PDF replaces it as the print-document egress from the export page and **still emits `print`** (not `html_export`).
2. `html_export` remains exclusively the standalone HTML download event.
3. `surface` distinguishes Snapshot main-page Print from export-page PDF without splitting the `print` event into two vocabulary names.
4. **Learner Map behaviour must not change.** Learner Map may omit `surface`; absence of `surface` remains lawful for `artifact: 'learner-map'`. Do not require LM call-site changes for this field.

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

| Surface | Include index? | Form | Justification |
|---------|----------------|------|---------------|
| **On-screen Snapshot** | **Yes, when triggered** | Collapsible section; **expanded by default**; collapse is JS enhancement | Screen scanning + tooltip complement |
| **Print document / PDF channel** | **Yes, when triggered** | PR14A-4 **planned index pages** with “page N of M” numbering | Paper/PDF has no hover; planner unchanged by PR14B |
| **HTML export document** | **Yes, when triggered** | Same collapsible pattern as on-screen: **expanded by default** in markup; inline JS may collapse; bead hover enhancement allowed (§4.7) | Offline readers need identity map; must survive script stripping |

## 6.5 Evidence vs presentational chrome

**Decision: The Target Index is presentational chrome, not part of the evidence record geometry.**

| Implication | Rule |
|-------------|------|
| Clinical meaning | Index does not add interpretation; it restores identity for display codes |
| RenderPlan / PrintRenderPlan | Index is **outside** domain/thread/bead evidence planning |
| Print/PDF composition | Evidence pages compose via existing `snapshotPrintRenderPlan`; index pages append per PR14A-4 — **planner unaffected by this amendment** |
| HTML composition | Index follows evidence in document order; not part of screen RenderPlan geometry |
| Data invariance | Including/excluding the index never changes scores, order of evidence threads, or bead values |

## 6.6 Print / PDF pagination and placement

When the index is triggered for the **print/PDF** channel:

1. Complete all evidence pages first (existing PrintRenderPlan rules unchanged).
2. Start the Target Index on a **new page** (do not interleave mid-domain).
3. Title the section clearly, e.g. “Target index”.
4. Allow the index itself to paginate across multiple pages if needed (“page N of M” per PR14A-4).
5. Repeat a minimal document header on index continuation pages if print chrome already supports repeating headers; do not invent Learner Map–style multi-page prose.

**PR14B confirmation:** `snapshotPrintRenderPlan.ts` / `snapshotPrintPageProfile.ts` and the PR14A-4 index planner remain untouched by the HTML/PDF channel split.

## 6.7 On-screen and HTML placement

- After the Target Threads evidence view
- Collapsible; **expanded by default** when triggered (HTML must ship expanded in markup — §4.7)
- Do not hide solely behind hover
- Screen may use `no-print` for the collapsible block while print/PDF uses planned index pages; **row content** (codes ↔ authored identity) must remain equivalent when both are triggered
- No truncation or omission of evidence or index rows in any channel

---

# 7. Export document contract

## 7.0 PR14B dual-document rule (authoritative)

| Channel | Document | Must match |
|---------|----------|------------|
| HTML | Screen-layout Snapshot document | On-screen Snapshot (Target Threads + screen RenderPlan at frozen export viewport §4.6) |
| PDF | Print-layout Snapshot document | Main Snapshot **Print** output (PrintRenderPlan + PR14A-4 index pages) |

Both documents are mode **`full`** (complete evidence). They differ in **layout plan and chrome**, not in which scores exist.

### Superseded text — 2026-08-04 (retained for history)

> | Property | Requirement |
> |----------|-------------|
> | Primary format | Standalone HTML file |
> | … | … |
> | PDF | Browser Print → Save as PDF of **the same document**; no dedicated PDF engine in PR14A |
>
> … Exported HTML evidence must match the production Snapshot evidence meaning …
> layout may use print/export composition tiers already defined …

**Supersession note (2026-08-06):** “Same document for HTML and PDF” is reversed. See §4.5 for why this is not a return to unnamed dual outputs under one control.

## 7.1 Formats

| Property | HTML channel | PDF channel |
|----------|--------------|-------------|
| Primary mechanism | Standalone `.html` download | Browser print-to-PDF via `window.print()` |
| Offline | Opens without Evalis login or network | PDF filing is offline once saved |
| Self-contained | Inline CSS + permitted inline JS (§4.7); no external `src` | N/A (print document in-app / printed bytes) |
| Read-only | No editing affordances | No editing affordances |
| PDF engine | — | **None** — browser Save as PDF only |
| Layout | Screen RenderPlan @ `SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM` | PrintRenderPlan (existing) |

## 7.2 Data authority

| Input | Source |
|-------|--------|
| Structure, targets, scales | Assessment `pack_snapshot` only (G8) |
| Scores | Assessment score rows for included cycles |
| Effective Scoring for display | `resolveEffectiveScoring` only |
| Profile assembly | Existing Snapshot profile path (`buildAssessmentSnapshotProfile` over production learner-map production data) — no forked scoring meaning |

Applies to **both** channels.

## 7.3 Parity

| Channel | Parity requirement |
|---------|-------------------|
| HTML | Same targets, order, cycles, recorded scores, Effective Scoring–derived bead labels as on-screen Snapshot; screen packing frozen per §4.6 |
| PDF / main Print | Same targets, order, cycles, scores, labels as each other; print composition may paginate/factor per existing print rules without dropping marks |

Presentation factoring must not drop marks in either channel. No truncation or omission of evidence or index rows.

## 7.4 Minimum metadata block

Both channels include:

- Learner name (org policy)
- Assessment / pack name and version
- Cycle range
- Generated timestamp
- Structure-label legend copy as already defined for Snapshot
- Evidence-only disclaimer (non-interpretive)

## 7.5 Export page composition (PR14B)

| Element | Requirement |
|---------|-------------|
| Preview | **Screen-layout** preview only (matches HTML). Do **not** preview print layout beside an HTML control — that would mislead. |
| Print document on export page | May exist as a print-only / off-screen surface for the PDF action (same pattern as main Snapshot print surface); must not be presented as the interactive preview of the HTML option |
| Actions | **HTML** and **PDF** only — no Print button |
| PHI | Unchanged (§5.6) |

## 7.6 Filenames

| Channel | Convention |
|---------|------------|
| HTML | `buildSnapshotExportFilename` (or successor) — includes assessment identity + date; `.html`; must not resemble a publisher form name |
| PDF | Browser Save as PDF controls the file name; set a clear **document title** so the suggested PDF name reflects Snapshot + assessment identity + date where the browser allows |

## 7.7 Route and entry points

| Entry | Behaviour |
|-------|-----------|
| Snapshot page **Export** | Opens dialog → acknowledgement → `#/assessment/:id/snapshot/export?mode=full` |
| Snapshot page **Print** | Acknowledgement gate (§5.6) then `window.print()` on Snapshot print surface; audit `surface: 'snapshot'` |
| Export page **HTML** | Download screen-layout standalone HTML; audit `html_export` |
| Export page **PDF** | `window.print()` on print document; audit `print` + `surface: 'export'` |
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

### Snapshot modes and channels

- [ ] **INV-M1** Snapshot export offers only mode `full`.
- [ ] **INV-M2** Full content includes all domains, targets, and cycles from the assessment snapshot in **both** HTML and PDF channels.
- [ ] **INV-M3** Neither channel contains movement, coverage, recommendations, or interpretive narrative.
- [ ] **INV-M4** Unknown mode query params do not create a partial export; they coerce to `full` or fail closed without partial content.
- [ ] **INV-C1** Export page offers exactly two actions: HTML and PDF — **no Print button**.
- [ ] **INV-C2** HTML output uses screen RenderPlan geometry (Target Threads on-screen look), not PrintRenderPlan pagination.
- [ ] **INV-C3** PDF output matches main Snapshot Print output (PrintRenderPlan + PR14A-4 index pages when triggered).
- [ ] **INV-C4** Channels are not modes: switching HTML ↔ PDF never changes which scores exist, only layout/chrome.

### HTML viewport / script

- [ ] **INV-H1** HTML export serializes screen plan at `SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM` (96).
- [ ] **INV-H2** Exported HTML does not recompute RenderPlan on recipient resize.
- [ ] **INV-H3** No external script `src`; inline script only (if present).
- [ ] **INV-H4** With JS disabled/stripped, all evidence and (when triggered) full Target Index rows remain visible and expanded.
- [ ] **INV-H5** Collapse/hover are enhancements only — never required to reveal evidence.

### PHI gate

- [ ] **INV-P1** Export route without acknowledgement does not render the exportable document.
- [ ] **INV-P2** In-app Snapshot Print without acknowledgement does not call print until acknowledgement succeeds.
- [ ] **INV-P3** After acknowledgement in-session for an assessment, HTML, PDF, and main Print proceed without re-prompt for that assessment.
- [ ] **INV-P4** When `sessionStorage` is unavailable, acknowledgement fails closed.
- [ ] **INV-P5** Snapshot acknowledgement is per `assessmentId`.

### Audit

- [ ] **INV-U1** HTML download emits `event: 'html_export'` (not `print`).
- [ ] **INV-U2** Export-page PDF emits `event: 'print'` with `surface: 'export'`.
- [ ] **INV-U3** Main Snapshot Print emits `event: 'print'` with `surface: 'snapshot'`.
- [ ] **INV-U4** Four-event vocabulary meanings unchanged; Learner Map call sites need no change for `surface`.

### G8 / scoring

- [ ] **INV-G8** Changing the live content pack after assessment creation does not change scores/scales shown in Snapshot HTML or PDF for that assessment.
- [ ] **INV-E1** Bead labels/maxima match Effective Scoring authority for both channels.
- [ ] **INV-E2** Out-of-scale recorded scores are not silently clamped in either channel.

### Target index

- [ ] **INV-I1** When any visible code was compacted, disambiguated, or non-authored-fallback, Target Index appears on screen, in HTML (collapsible, expanded by default), and in print/PDF (planned pages).
- [ ] **INV-I2** When no such abbreviation occurred, Target Index is omitted in all channels.
- [ ] **INV-I3** Every index row includes displayed code, authored target id, authored title, primary group context, and secondary group context when applicable.
- [ ] **INV-I4** Index order matches authored evidence order.
- [ ] **INV-I5** Print/PDF place the index after evidence on new planned pages (“page N of M”); planner unchanged by PR14B.
- [ ] **INV-I6** Index presence does not change evidence thread scores or order.
- [ ] **INV-I7** No truncation or omission of evidence or index rows in any channel.

### Artifact boundary

- [ ] **INV-A1** Neither channel is visually positioned as a publisher grid clone.
- [ ] **INV-A2** Competency legend vocabulary remains unchanged from current Snapshot shipping strings pending founder rename (§11).

### Learner Map regression

- [ ] **INV-L1** Learner Map export modes/ack/routes/content unchanged per §8.

---

# 10. Risks

| Risk | Severity | Mitigation in contract |
|------|----------|------------------------|
| Partial Snapshot exports filed as complete | High | Single `full` mode only |
| Unnamed dual documents under one control | High | Named HTML vs PDF channels (§4.5); rejected pattern documented |
| Print bypasses PHI gate while HTML is gated | High | Gate main Print + HTML + PDF with same ack |
| Native Ctrl/Cmd+P ungated | Medium | Documented limitation; gate intentional controls |
| HTML plan disagrees with recipient window | Medium | Freeze at `SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM`; no resize recompute |
| Gateway strips script → hidden index | High | Expanded-by-default markup; JS enhancement only |
| Preview shows print layout next to HTML | High | Screen-layout preview only (§7.5) |
| Shared extraction accidentally changes LM keys | High | Exact prefix freeze + regression §8 |
| Target Index omitted when disambiguation-only | Medium | Trigger includes disambiguation and non-authored fallbacks |
| Index treated as evidence → RenderPlan churn | Medium | Explicit chrome / outside evidence plans |
| Competency rename mid-export | Low/Med | §11 touchpoints; no rename in PR14A/B |
| Publisher-like export chrome creep | High | Binding constraint + INV-A1 |

---

# 11. Competency vocabulary (unresolved — do not rename)

Founder decision on “Mastered” / “Not Yet” (and related competency labels) is **unresolved**.

PR14A / PR14B must:

- Keep current Snapshot legend and bead accessibility strings as shipped
- Not design export-specific synonyms
- Not couple export completion to a rename

**Future rename touchpoints on the export path** (for a later decision only):

- Snapshot visual system legend labels (`snapshotVisualSystem` and equivalents)
- Bead/`aria-label` / tooltip competency phrases reused by print, PDF, and HTML serialization
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
| **OQ-5** | Whether standalone HTML should embed a machine-readable JSON audit block alongside DOM evidence | Optional enhancement; not required for acceptance if DOM evidence is complete |
| **OQ-6** | Exact clinician-facing labels for the two export-page buttons (“Download HTML” / “Save as PDF” vs alternatives) | Semantics fixed; wording can be founder-approved without changing channels |
| **OQ-7** | Whether HTML export should offer an optional “use my current viewport width” advanced override | **Default under this contract: no** — freeze at canonical default. Escalate only if founder wants a documented exception |

If Builder encounters a product choice not covered here and not listed above, **stop and escalate** — do not invent policy.

---

# 13. Acceptance criteria

## 13.1 PR14A completion (base)

PR14A is complete only when:

1. Shared `clinicalExport` three-module extraction exists and Learner Map uses it without semantic drift (§8, INV-L*).
2. Snapshot export route + dialog ship mode `full` only (§4).
3. PHI acknowledgement gates Export and in-app Print (§5; INV-P*).
4. Target Index appears per trigger; omitted otherwise (§6; INV-I*).
5. G8 and Effective Scoring invariants hold (§2; INV-G8, INV-E*).
6. Print CSS hardening at scale is **not** treated as a PR14A blocker (separate QA).
7. No competency rename and no Snapshot visual redesign landed under this milestone.

## 13.2 PR14B completion (channel amendment)

PR14B is complete only when:

1. Export page offers **HTML** and **PDF** only — Print button removed from export page (INV-C1).
2. HTML matches on-screen Snapshot semantics with frozen viewport plan (INV-C2, INV-H*).
3. PDF matches main Print via browser print-to-PDF; print planner untouched (INV-C3).
4. Audit events match §5.8 (INV-U*).
5. PHI gate still covers main Print + HTML + PDF without semantic change to storage rules.
6. QA checklist in §9 is green for amended invariants.
7. Implementation of this amendment is **not** entangled with PR14A-4 print-path commit.

---

# 14. Closing contract statement

**Snapshot export (PR14A + PR14B):**

1. Extract only acknowledgement, errors, and generic export-state helpers into `clinicalExport/`.
2. Mode is **`full` only** — complete evidence. **Channels are not modes.**
3. Export page: **HTML** (screen layout, frozen at `SNAPSHOT_DEFAULT_VIEWPORT_SCREEN_REM`) and **PDF** (print layout via browser print-to-PDF). No export-page Print button.
4. The 2026-08-04 one-document rule correctly rejected unnamed dual outputs under one label; PR14B allows two **named** medium-bound channels — not a return to that defect (§4.5).
5. PHI acknowledgement is mandatory for main Print, HTML, and PDF; fail closed; per assessment session.
6. Target Index is conditional presentational chrome; collapsible/expanded-by-default on screen and HTML; planned pages on print/PDF (PR14A-4 planner unchanged).
7. Runtime scoring remains Phase A Effective Scoring from frozen `pack_snapshot` (G8).
8. Learner Map export behaviour remains unchanged and regression-verified.
9. Unresolved founder items stay in §12 — Builder does not decide them.

This is the implementation contract for Builder, QA, and Overseer for Assessment Snapshot export.
