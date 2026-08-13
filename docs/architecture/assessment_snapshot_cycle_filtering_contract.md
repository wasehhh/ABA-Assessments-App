# Assessment Snapshot Cycle Filtering Contract

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Assessment Snapshot — cycle filtering / cycle-scoped evidence |
| **Milestone** | Post-PR14A Alpha (clinical advisor ask 2026-07-18) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | `main` at `1c8b79e` · export contract [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) · vault `(C) G1–G8 Runtime Laws.md` (2026-08-02) · Phase A G4/G5 text in [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) §10 · code surfaces listed in §0 |
| **References** | [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §4 / §7 / §9 / §10 · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) G1–G8 · bead-numeral precedent `snapshotShowScores.ts` / `1c8b79e` · profile `assessmentSnapshotProfile.ts` · layout `snapshotLayoutEngine.ts` / `snapshotPrintRenderPlan.ts` · header Cycles field: `AssessmentSnapshotHeader.tsx`, `PrintDocumentHeader.tsx` |
| **Non-goals** | Implementation · Learner Map cycle/mode redesign (INV-L1 holds) · domain / primary-group / target filtering design beyond generalization check · de-identified export · parked trailing-blank-print-sheet defect · Snapshot aesthetics pass · competency vocabulary (locked `f9a6aef`) · restoring banner / distinct artifact title / partial running headers |

This document is the authoritative product contract for Assessment Snapshot cycle filtering.

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns product meaning (egress policy, scope taxonomy, cycle scope line format, structural-omission rule, invariants). It references the export contract and code modules for existing machinery. It does not restate layout algorithms, print CSS, or full export HTML serializers. Where this contract amends the export contract, §10 lists the amendment; do not silently fork duplicate mode tables elsewhere.

---

## Amendment banner (this contract) — original

**Founder-directed Alpha feature** (clinical advisor 2026-07-18): clinicians need cycle-scoped historical views of Assessment Snapshot evidence.

This fulfils the post-PR14A deferral of cycle-range ([`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §4.3 / OQ-4) by defining an orthogonal **scope** axis and the minimum downstream-reader signal required when cycles are omitted.

Superseded export-contract language is listed in §10 and must be retained in that file under dated “Superseded text” blocks (same convention as the PR14B banner).

---

## Amendment banner — founder reduction (2026-08-12)

**Founder review outcome:** Core architecture approved (egress policy, orthogonal scope, non-contiguous selections, structural omission, target rows remaining, complete-scope default, fail-closed-to-complete). **Partial-record ceremony reduced.**

| Withdrawn | Retained / replacing |
|-----------|----------------------|
| Distinct artifact class / title change (§3 “cycle-scoped Snapshot extract”) | Document remains **Assessment Snapshot** |
| On-document banner (§5.1) | **Cycle scope line** in existing §7.4 Cycles metadata field (§5.1 amended) |
| Partial-specific print running headers (§5.4) | None — continuation pages unchanged |
| Heavy “unmistakable” multi-signal apparatus | Filename token `partial` + cycle scope line (included cycles **and** assessment total) + structural omission |

**Founder reasoning (binding product judgment):** The clinician operating the filter can see the selection; columns are labelled and dated. Separate artifact naming, banners, and per-page running-header treatment are ceremony relative to that. The residual risk is the **downstream reader** who never saw the filter UI — especially when column labels alone do not imply missing cycles (e.g. showing `C1`, `C2` of six). That asymmetry justifies a single honest scope statement in metadata, and nothing more.

Resolved open questions: OQ-1, OQ-2, OQ-3, OQ-4, and G4/G5 scope-clause substance — see §12.

Superseded text from the pre-reduction draft is retained in place under dated notes in §2.2, §3, and §5 so the heavier position remains visible as considered-and-reduced, not never held.

---

# 0. Code facts relied on (verified)

| Fact | Where verified |
|------|----------------|
| Export mode union is `'full'` only; unknown mode params coerce to `full` | `frontend/src/components/assessmentSnapshot/export/snapshotExportMode.ts` |
| Export dialog clinician copy: export “always includes every domain, target, and cycle” | `SnapshotExportDialog.tsx` |
| HTML filename pattern: `assessment-snapshot-${safeId}-${date}.html` | `buildSnapshotExportFilename` in `snapshotExportHtml.ts` |
| Profile carries `cycles: LearnerMapCycleSummary[]`; Snapshot wraps Learner Map profile without forking scoring | `assessmentSnapshotProfile.ts` |
| Cycle Reference documents “cycles are never omitted” | `snapshotCycleReference.ts` comment on `buildSnapshotCycleReferenceEntries` |
| **Cycles metadata field today** renders label `Cycles` and value **`{count}`** only (`profile.cycles.length` / `identity.cycleCount`) — not a `C1–Cn` range string | `AssessmentSnapshotHeader.tsx` (compact); `PrintDocumentHeader.tsx` + `resolveSnapshotPrintIdentity` in `printClinicalChrome.ts` |
| Screen and print plans size columns from `profile.cycles.length` | `snapshotLayoutEngine.ts`; `snapshotPrintRenderPlan.ts` |
| Bead-numeral preference is per-assessment `sessionStorage`, survives export navigation; numerals stay in DOM and are CSS-suppressed with an explicit “scores remain in this record” legend note | `snapshotShowScores.ts`, `snapshotVisualSystem.ts` |
| Print artifact label string is `Assessment Snapshot` | `printClinicalChrome.ts` (`SNAPSHOT_PRINT_ARTIFACT_LABEL`) |
| Print footers also echo a cycle count derived from `profile.cycles.length` | `PrintDocumentFooter.tsx`, `AssessmentSnapshotThreadsFooter.tsx` |
| Target Index trigger is about visible **target codes**, not cycle count | export contract §6.3; `snapshotTargetIndex*.ts` |

Could not verify inside this repo: vault file is outside the git tree at `…/Evalis/03 Documentation/(C) G1–G8 Runtime Laws.md` — read for this contract; Phase A repo text differs in wording (argued in §2.2).

---

# 1. Goals

## 1.1 What this solves

Clinicians need different historical scopes for different questions: most recent vs baseline, last few administrations, or specific non-contiguous cycles (e.g. C1 and C4). Today Snapshot always includes every assessment cycle on every egress path (`exportMode: 'full'` only; dialog copy asserts complete cycle inclusion).

This contract defines lawful cycle scope, shared egress, structural omission, and the minimum metadata/filename signal so a downstream reader can see that a file does not contain every assessment cycle.

## 1.2 Success statement

After the phased delivery in §13:

> A clinician can select which assessment cycles appear in Assessment Snapshot. The document remains an Assessment Snapshot. When the selection is a proper subset, every egress path that carries that view structurally omits non-selected cycle marks (not CSS-hiding them), shows the **cycle scope line** (included cycles and assessment total) in the Cycles metadata field, and — for HTML — uses a `partial` filename token. Every included mark still agrees with Matrix under Effective Scoring. Screen and export of the same scope match (G4). Learner Map behaviour is unchanged (INV-L1).

## 1.3 What this explicitly does NOT solve

| Out of scope | Notes |
|--------------|--------|
| Learner Map cycle handling / LM export modes | INV-L1; LM is interpretive with its own partial posture |
| Domain, primary-group, or target filtering UI | Generalization reserved (§14); not designed here |
| De-identified Snapshot export | Separate concern |
| Changing score meaning, Effective Scoring, or `pack_snapshot` | G1–G3, G7–G8 untouched |
| Competency vocabulary | Locked `f9a6aef` |
| Trailing blank print sheet / aesthetics pass | Parked |
| Banner, distinct artifact title, partial running headers | Withdrawn by founder reduction |

---

# 2. Binding constraints (carry forward)

## 2.1 From the export contract (still binding unless amended in §10)

| ID | Constraint |
|----|------------|
| **Evidence only** | No movement, coverage, recommendations, or interpretive narrative |
| **G8** | Effective Scoring from frozen `pack_snapshot` only |
| **Mode ≠ channel** | HTML / PDF / Print are channels; they do not redefine content completeness by themselves |
| **PHI gate** | Acknowledgement still gates Export route, main Print, HTML, and PDF |
| **INV-L1** | Learner Map export semantics unchanged |
| **Not a publisher clone** | Scope signalling must not drift toward publisher forms |
| **§4.1 — amended posture** | See §2.3. Original absolute ban on omitting cycles from a filed “Snapshot” is replaced by lawful clinician-selected scope plus the cycle scope line, filename token, and structural omission |

## 2.2 G4 and G5 — readings retained; clause shortened

### Vault wording (binding product laws, 2026-08-02)

- **G4 — Display = Export:** What appears on screen must appear identically in export outputs. No consumer may transform the score differently.
- **G5 — Snapshot = Matrix:** If Matrix shows target X at score 3, Snapshot must show target X at score 3. “No aggregation, **filtering**, or interpretation logic may cause them to diverge.”

### Phase A repo wording ([`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) §10)

- **G4 — On-screen ≡ Export:** CSV/JSON exports that include max or scale meaning match on-screen Effective Scoring.
- **G5 — Snapshot ≡ Matrix:** Snapshot **score meaning** matches Matrix for the same snapshot and Recorded Scores.

### Reading A — Record-scope reading (broad)

G4 forbids any screen/export mismatch of which marks are present. G5’s word “filtering” forbids Snapshot from showing fewer cycles than Matrix at all.

| Consequence | |
|-------------|--|
| Cycle filtering on Snapshot | Forbidden, or Matrix must filter identically (rejected — Matrix is the entry surface for all cycles) |
| Screen-only filter + always-full export | Forbidden by G4 |
| Clinical Alpha ask | Cannot ship |

### Reading B — Score-meaning reading (narrow) — **adopted**

G4 and G5 govern **what an included mark asserts** (Effective Scoring, recorded score identity), not **whether every assessment cycle is present**. “Filtering” in G5 sits with aggregation and interpretation as ways to make the **same** target/cycle appear to disagree with Matrix.

| Consequence | |
|-------------|--|
| Complete scope | All cycles; every bead matches Matrix |
| Clinician-selected subset | Lawful; every **included** bead matches Matrix; on-screen scope = egress scope |
| Screen-only filter + always-full export | Still rejected — violates G4 |

**Why not Reading A:** Collides with the clinical need and with §4.3’s anticipation of partial exports. Vault G5’s worked example is score identity; the laws centre `resolveEffectiveScoring` / split-truth prevention.

**Why not screen-only full export:** Fails the clinical share/print ask and vault G4 (“what appears on screen must appear identically in export outputs”).

**Bead-numeral precedent (`1c8b79e`) is the mirror image, not the template:** Numerals stay in the DOM because redaction was not intended. Cycle filtering **does** remove evidence. CSS-hiding would leave omitted scores copyable while the file appears to show a subset. **Structural omission is required** (§5.3) — not as withdrawn ceremony, but as the anti-false-redaction / anti-hidden-evidence rule.

### Authoritative scope clause (founder-approved substance; insert into vault under G4 and G5)

> **Scope (cycle selection).** G4 and G5 govern the accuracy and consistency of the marks a document contains — not whether the document contains every mark that exists. Clinician-selected cycle scope is lawful. Every included mark must match Matrix under Effective Scoring. On-screen scope must equal egress scope.

### Superseded long clause — pre-reduction draft (2026-08-12, retained)

> **Scope clause for G4 / G5 (cycle-scoped Snapshot extracts):**  
> G4 and G5 govern **score meaning** of marks that are in scope. They do not forbid a separately identified **cycle-scoped evidence extract** from including only a clinician-selected subset of assessment cycles.  
> - For the **complete** Assessment Snapshot (all cycles): G4 and G5 apply over the full evidence record; exports match the complete on-screen Snapshot.  
> - For a **cycle-scoped** extract: (1) every included target/cycle mark must match Matrix for that assessment under Effective Scoring (G5 for included marks); (2) on-screen scoped view and egress of that same scope must match (G4 for the active scope); (3) the extract must satisfy partial-record discipline (§5) so it cannot be mistaken for the complete Snapshot.  
> Silent omission of cycles from a document still labelled only as the complete Assessment Snapshot remains a G5 / §4.1 violation.

**Supersession note:** Distinct-extract identity and multi-signal “partial-record discipline” are withdrawn. Substance retained: score-meaning reading; lawful clinician-selected scope; included-mark Matrix agreement; on-screen ≡ egress scope.

## 2.3 Reconciling export contract §4.1

**Original §4.1 (still on disk until amended):** a Snapshot that omits domains or cycles “is an incomplete permanent record and is clinically dangerous if filed or shared as ‘the Snapshot.’”

**This amendment permits** filing and sharing an Assessment Snapshot whose cycle axis is a clinician-selected proper subset — still named Assessment Snapshot — provided:

1. Non-selected cycles are **structurally absent** (§5.3)
2. The **cycle scope line** states included cycles **and** assessment total (§5.1)
3. HTML filename carries `partial` (§5.2)

### What changed in the product position

| Before | After |
|--------|-------|
| Omitting cycles from anything called “the Snapshot” treated as clinically dangerous per se | Omitting cycles is lawful when the operator chose the scope and the file states included cycles + total |
| Assumed incomplete files need heavy unmistakable chrome to be safe enough to ship | Founder judges operator-visible selection + labelled columns + one metadata statement + structural omission sufficient for Alpha |

### Architecture assessment (recorded dissent / candour)

This **is a genuine weakening** of protective ceremony relative to §4.1’s absolute framing and relative to this contract’s pre-reduction draft (banner, distinct extract identity, running headers). A downstream reader who skims only the bead grid and ignores the Cycles metadata field can still under-count administrations; `partial` in a filename is easily lost once the file is renamed or filed under a chart title.

**Why Architecture still accepts the founder outcome as proportionate rather than reckless:** the load-bearing failure mode the founder named (first-two-of-six looking like a complete early history) is exactly what the total-count in the cycle scope line repairs; structural omission prevents the worse failure (file looks like two cycles but contains eight). The withdrawn banner/title/running-header stack duplicated a signal the metadata field can carry once without inventing a second artifact class. Residual risk is **Medium** for “partial filed as if complete by a skim reader,” down from **High** under silent omission, and accepted by founder judgment.

**Do not paper over §4.1:** when amending the export contract, replace the absolute sentence with this posture explicitly — do not leave §4.1 claiming danger while this feature ships.

---

# 3. Artifact identity

## 3.1 Alternatives compared (retained reasoning)

| Option | Definition | Clinical consequence when emailed / filed / attached |
|--------|------------|------------------------------------------------------|
| **(a) Snapshot + view** | Still Assessment Snapshot; cycles narrowed | Downstream reader may miss that cycles are missing unless signalled |
| **(b) Distinct derived artifact** | Proper subset gets its own name/chrome class | Stronger filing distinction; more ceremony |
| **(c) Screen-only; egress always full** | Filter for scan only | Fails share/print need; violates G4 |

### Superseded decision — pre-reduction (retained)

The first draft of this contract chose **(b)** (cycle-scoped Snapshot extract as a distinct class) and rejected (a) and (c).

## 3.2 Decision (binding) — founder reduction

| Condition | Artifact identity |
|-----------|-------------------|
| Any lawful scope (complete or proper subset) | **Assessment Snapshot** — same product name and title chrome (`SNAPSHOT_PRINT_ARTIFACT_LABEL` / screen “Assessment Snapshot”) |

- **OQ-1 resolved:** no separate artifact name; no title change.
- **(c)** remains rejected (egress policy §4).
- **(a)** is adopted **with** the cycle scope line + `partial` filename + structural omission — not silent narrowing.

---

# 4. Egress policy

| Egress path | May carry cycle selection? | Rule |
|-------------|----------------------------|------|
| **On-screen Snapshot view** | **Yes** | Active scope drives Target Threads cycle axis |
| **Main Print** | **Yes** | Prints the **active scope** |
| **Export-page PDF** | **Yes** | Same print document / scope as main Print for that session (PDF matches Print) |
| **Export-page HTML** | **Yes** | Serializes the **active scope** |

### Why not screen-only

Evaluated and rejected (§2.2): fails clinical sharing need and vault G4.

### Why all four paths share one scope

G4 applied to the active scope: the clinician must not review scope S on screen and egress scope T without an explicit scope change. Persistence across Snapshot → export route (§7) exists so HTML/PDF inherit the same selection.

### Completeness rule

When scope is complete, all four paths remain today’s full evidence record.

---

# 5. Cycle scope signalling and structural omission

Applies when scope is a proper subset of assessment cycles. Complete scope must **not** add `partial` filename tokens or partial-format scope lines.

### Superseded apparatus — pre-reduction §5 (retained summary)

The first draft required: on-document banner (§5.1), multi-part filename/title signalling, partial running headers (§5.4), and dialog/chrome rules framed as an “unmistakable” bar. **Withdrawn** by founder reduction except where replaced below. Structural omission was part of that draft and **is not withdrawn** — see §5.3 justification.

## 5.1 Cycle scope line (amends export contract §7.4 “Cycle range”)

Export contract §7.4 requires a cycle field in the metadata block. **Amend that field** — do not add a banner or parallel chrome region.

### Current complete-scope rendering (verified)

| Surface | Label | Value today |
|---------|-------|-------------|
| Screen header (compact) | `Cycles` | Integer count only, e.g. `6` |
| Print first-page metadata | `Cycles` | Integer count only (`identity.cycleCount`) |
| HTML | Same as screen document header (screen-layout serialize) | Same count |

There is **no** shipped `C1–C6` range string in that metadata field today. Cycle identity detail lives in **Cycle Reference** (`C{n} — {date}`).

### Complete scope — format (unchanged)

| Element | Specification |
|---------|---------------|
| Label | `Cycles` |
| Value | Decimal integer = assessment cycle count (= included count when scope is complete) |
| Example | `Cycles` `6` |

### Partial scope — format (normative)

| Element | Specification |
|---------|---------------|
| Label | `Cycles` (unchanged) |
| Value grammar | `C` + cycleNumber for each **included** cycle, comma+space separated, in ascending `cycleNumber` order, then ` of ` + assessment total cycle count |
| Example (contiguous) | `C1, C2 of 6` |
| Example (non-contiguous) | `C1, C4 of 6` |
| Example (single cycle) | `C3 of 6` |

**Rules:**

1. **Total is mandatory** under partial scope — it is the load-bearing signal when column headers alone do not imply missing cycles.
2. **No en-dash / range elision** in this field (never `C1–C4`, never `C1-C4`). Comma lists only. This makes false contiguous ranges impossible and keeps contiguous and non-contiguous selections consistent.
3. Use the assessment’s real `cycleNumber` values (as Cycle Reference / column headers do), not positional indices into the selection.
4. Assessment total = count of cycles on the assessment (unfiltered), not the included count.
5. When included count equals assessment total, scope is `complete` — use the complete-scope format, not the partial grammar.

### Placement

| Channel | Where the cycle scope line appears |
|---------|-------------------------------------|
| **Screen** | Document header metadata `Cycles` field (same slot as today) |
| **HTML** | Same header metadata in the serialized document body |
| **Print / PDF** | First-page document header metadata (`PrintDocumentHeader` slot). **No** partial-specific continuation running-header treatment (founder withdrew §5.4) |

**Pagination:** One metadata placement on the document header (screen / HTML / print page 1) is the required signal. Continuation print pages do not repeat the Cycles field today and will not gain a partial marker. Architecture accepts that a continuation sheet viewed alone is weaker; the founder explicitly removed per-page treatment. Column headers on those pages still show which cycle columns are present.

**Other chrome that currently prints `profile.cycles.length`:** After structural omission, a naive footer count would equal **included** cycles only and would **omit the total** — misleading under partial scope. Any footer / secondary count derived from the scoped profile must either (a) use the same partial grammar as the cycle scope line, (b) show assessment total explicitly, or (c) be omitted under partial scope. It must not show an unqualified included-only count.

### Script stripping (HTML)

The cycle scope line **must** be real document markup in the metadata block, visible with inline JS disabled or stripped.

**Reason against export contract §4.7 / INV-H4 family:** HTML is a self-contained clinical record; progressive JS must not be required to reveal evidence **or** identity/scope metadata needed to interpret that evidence. A scope line injected only by script would leave a stripped file looking like a complete early history (e.g. columns `C1`, `C2` with no total). Same class of hazard as hiding Target Index rows behind script.

## 5.2 Filename

| Scope | Filename |
|-------|----------|
| **Complete** | Unchanged: `assessment-snapshot-${safeId}-${date}.html` |
| **Partial** | `assessment-snapshot-partial-${safeId}-${date}.html` |

Token `partial` is inserted as its own hyphen-delimited segment immediately after `assessment-snapshot` and before `${safeId}`. No other filename tokens are required for Alpha (cycle numbers live in the cycle scope line, not the filename).

**PDF / Print:** Where the browser Save as PDF suggested name is influenced by document title (export contract §7.6), the title under partial scope must include `partial` analogously so the suggested name is not indistinguishable from a complete Snapshot. Exact title string composition beyond including `partial` may follow existing Snapshot title patterns.

## 5.3 Mechanism — structural omission (not withdrawn)

| Approach | Allowed? |
|----------|----------|
| Omit non-selected cycles from the cycle arrays / plans / serializers | **Required** |
| CSS-hide cycle columns while leaving beads in DOM/export | **Forbidden** |
| Leave scores in HTML comments / hidden nodes / data attributes for “convenience” | **Forbidden** |

**Justification (explicit — do not confuse with withdrawn ceremony):** Structural omission prevents a file that **visually** presents two cycles from still **containing** eight cycles in copyable or script-recoverable form. That is an evidence-integrity / false-redaction hazard (mirror of the bead-numeral decision). It is not banner theatre; trimming §5.1/§5.4 does not authorize CSS-only filtering.

## 5.4 Cycle Reference, legend, Target Index

| Element | Under complete scope | Under partial scope |
|---------|----------------------|---------------------|
| **Cycle Reference** | All assessment cycles | **Only included cycles** (dates as today). Total lives in the cycle scope line, not by re-listing omitted cycles here |
| **Competency legend** | Unchanged | Unchanged |
| **Target Index** | Per §6.3 trigger | Unchanged trigger (§8.2) |

## 5.5 Export dialog honesty (not a banner)

When active scope is partial, dialog and helper copy **must not** claim that export always includes every cycle (today’s `SnapshotExportDialog.tsx` string). This is ordinary truthfulness, not a restored banner. Complete-scope copy may keep completeness language.

---

# 6. Control model and scope taxonomy

## 6.1 Rayah’s three affordances → one mechanism

| Stated affordance | Role in this contract |
|-------------------|------------------------|
| Select which cycles are displayed | **Primary mechanism:** explicit multi-select (non-contiguous allowed) |
| Limit visible cycle beads | **Preset:** most recent **3** (OQ-4 resolved) |
| Compare specific cycles | **Same selection** (e.g. C1 and C4); optional later “baseline + latest” preset |

**Decision:** One control surface — an ordered **cycle selection set** — with presets that only write into that set.

**Non-contiguous selections are first-class.** Never coerce to or describe as a single contiguous range. Cycle scope line comma lists enforce the same rule (§5.1).

**Slice 1 control surface:**

1. Per-cycle toggles (profile order)
2. **All cycles** (complete scope)
3. **Most recent 3** preset

**Deferred to Slice 2:** “baseline + latest” preset (OQ-5), URL-encoded scope.

Empty selection is unlawful: fail closed toward **complete** (or retain previous lawful selection) — never a silent empty evidence grid.

## 6.2 Scope taxonomy (orthogonal to mode and channel)

| Dimension | Values | Meaning |
|-----------|--------|---------|
| **Mode** | `full` only (Alpha) | **Structural completeness of domains/targets** in authored order |
| **Channel** | screen · print · html · pdf | Medium / layout plan |
| **Scope** | `complete` \| `cycles` | Which assessment cycles’ marks are included |

```text
mode     = full
channel  = html | pdf | print | screen
scope    = complete | { kind: 'cycles', cycleIds: <non-empty subset, profile order> }
```

**Chosen over extending `exportMode`:** preserves `full` as structure; matches INV-C4; generalizes to future primary-group scope without mode explosion.

Switching HTML ↔ PDF **must not** change mode or scope.

## 6.3 URL params vs §4.4

**Keep:** Unknown **`mode`** params coerce to `full`.

**Add:** Scope is not a mode enum value. Malformed scope coerces to **`complete`**.

| Slice 1 | URL does **not** encode cycle scope; session state (§7) is authoritative |
| Slice 2 | Optional URL grammar; malformed/empty → `complete`; must still render cycle scope line + filename rules |

---

# 7. Defaults, persistence, and PHI

## 7.1 Default

**Default scope = `complete`.**

## 7.2 Persistence

Follow `snapshot-show-scores:${assessmentId}` precedent (`snapshotShowScores.ts`):

| Decision | Value |
|----------|--------|
| Storage | `sessionStorage` |
| Key | Per `assessmentId` (prefix must not collide with show-scores or PHI ack) |
| Survives navigation to export route? | **Yes** |
| Survives tab session end? | No |
| Cross-assessment? | No |

**Persisted representation (semantic):**

- `complete`, or
- `cycles` + ordered cycle id list, or
- sticky preset `recent` + N=3 (**OQ-6 resolved**: sticky recomputes when cycles are added; a control labelled “most recent 3” must show the three most recent — expand-to-ids would silently drift)

Do not persist a bare id list labelled “all” without a `complete` kind.

## 7.3 New cycle added after persistence

| Prior state | Behaviour |
|-------------|-----------|
| `complete` | New cycle included automatically |
| Explicit `cycles` list | Unchanged; new cycle not auto-selected; visible as unselected in the control |
| Sticky `recent` + 3 (if used) | Recompute from updated list |

## 7.4 PHI acknowledgement

Filtering does not waive the PHI gate. Acknowledgement still required per export contract §5.

Extra ack sentence when partial = OQ-7 (still open; non-blocking for Slice 1).

---

# 8. Structural and layout consequences

## 8.1 What layout / print planners receive

Present a **scope-filtered** cycle list / profile to RenderPlan and PrintRenderPlan so density, `resolveDomainColumnWidthRem`, beads, and page breaks reflect **included** cycles only. HTML viewport freeze (§4.6) unchanged. Do not CSS-hide full-axis geometry (§5.3).

## 8.2 Target Index trigger

**Confirmed inert** to cycle filtering as a trigger input (export contract §6.3 — target code abbreviation). INV-I7 amended in §10: no truncation **within declared scope**; lawful cycle omission only under conforming partial scope.

## 8.3 Targets whose scores fall only outside the selection

**Target rows remain.** Mode `full` = every target in authored order. Included-cycle beads show actual scores or unscored for those cycles. Omitted-cycle scores are absent (column not present). Stealth dropping of targets is forbidden.

---

# 9. Product invariants (QA-testable)

IDs use **`INV-CF*`**. Surviving IDs are not renumbered. Banner / distinct-title / running-header checks are removed from INV-CF2.

### Identity and mechanism

- [ ] **INV-CF1** Clinician-facing artifact title remains **Assessment Snapshot** under both complete and partial scope (no distinct extract title).
- [ ] **INV-CF2** Under partial scope, the Cycles metadata field renders the cycle scope line per §5.1 (`C… of {total}`, comma-separated, no en-dash ranges, total = assessment cycle count). Under complete scope, Cycles remains count-only as today.
- [ ] **INV-CF3** Non-selected cycle scores are structurally absent from screen DOM evidence, print document, and HTML export (not merely CSS-hidden). HTML with JS stripped still lacks those scores.
- [ ] **INV-CF4** Non-contiguous selections remain lawful; cycle scope line and any clinician-facing description must not render them as a contiguous range.

### Egress / G4

- [ ] **INV-CF5** For a given assessment session scope S, on-screen Snapshot, main Print, export PDF, and export HTML all carry the same cycle set S.
- [ ] **INV-CF6** Switching HTML ↔ PDF does not change mode or scope.

### G5 / scoring

- [ ] **INV-CF7** Every included bead’s displayed score/meaning matches Matrix for the same assessment, target, and cycle under Effective Scoring / G8.
- [ ] **INV-CF8** Cycle scoping does not alter `resolveEffectiveScoring` outputs or recorded scores.

### Structure

- [ ] **INV-CF9** All authored targets/groups remain present under cycle scope (no stealth target/domain drop).
- [ ] **INV-CF10** Layout/print plans use included cycle count for column sizing/density inputs.
- [ ] **INV-CF11** Target Index trigger remains per §6.3 (code abbreviation), not per cycle filter.

### Defaults / safety

- [ ] **INV-CF12** Default scope is `complete`.
- [ ] **INV-CF13** Empty selection cannot be applied; fail closed to a lawful prior selection or `complete`.
- [ ] **INV-CF14** Unknown `mode` URL params still coerce to `full` (no new partial **mode** values).
- [ ] **INV-CF15** Learner Map export behaviour unchanged (INV-L1).

### Filename and HTML self-containment

- [ ] **INV-CF16** HTML filename is `assessment-snapshot-partial-${safeId}-${date}.html` iff scope is a proper subset; complete scope keeps `assessment-snapshot-${safeId}-${date}.html`.
- [ ] **INV-CF17** Cycle scope line is present as real HTML markup in the metadata block and remains visible when inline JS is disabled or stripped.

---

# 10. Amendments to `assessment_snapshot_export_contract.md`

Re-derived after founder reduction. Follow that file’s amendment-banner + retained superseded-text convention.

| Location | Change |
|----------|--------|
| **§1.3** | Cycle-range filtering no longer “deferred only”; point to this contract. Keep selected-domains / de-identified deferred. |
| **§2 Mode vs channel** | Mode remains `full` (structure). Add orthogonal **scope** (`complete` \| `cycles`). Channels do not change scope. |
| **§4.1** | **Replace** absolute “omitting cycles is clinically dangerous if filed as the Snapshot” with the §2.3 posture: clinician-selected cycle scope is lawful for an Assessment Snapshot when the cycle scope line, structural omission, and (HTML) `partial` filename rules hold. Retain superseded §4.1 text in a dated block. |
| **§4.2** | `full` = every group/target; cycles follow active scope. Note cycle filtering ships under this contract. |
| **§4.3** | Mark cycle-range deferral superseded for cycles; selected primary groups remain deferred and must reuse §5.1 scope-line + §5.3 omission pattern (not the withdrawn banner stack). |
| **§4.4** | Unknown mode → `full`. Unknown/malformed scope → `complete`. Scope ≠ mode. |
| **§4.5 / INV-C4 narrative** | Channel switch never changes scope. |
| **§7.3** | Parity within active scope. |
| **§7.4** | Define Cycles field formats per §5.1 of this contract (complete count-only; partial `C… of {total}`). |
| **§7.6** | Partial HTML filenames per §5.2; document title includes `partial` when scoped. |
| **Dialog copy** | Must not claim “every cycle” when scope is partial. |
| **§9 INV-M1** | Remains mode `full` only; clarify ≠ cycle scope. |
| **§9 INV-M2** | Complete scope: all cycles in both channels. Partial scope: exactly selected cycles + all domains/targets; cycle scope line required. |
| **§9 INV-M4** | Unknown mode params still coerce to `full`; partial scope is not a mode value. |
| **§9 INV-C4** | HTML ↔ PDF never changes scores **or** scope. |
| **§9 INV-I7** | No truncation within declared scope; lawful cycle omission only under conforming partial scope. |
| **§9** | Cross-link **INV-CF*** here (do not renumber export INV-*). |
| **§10 Risks** | Replace “Single `full` mode only” mitigation with: complete default + cycle scope line + structural omission + `partial` filename (this contract). Risk of skim-reader under-count remains, severity Medium. |
| **§12 OQ-4** | Superseded for cycle filename/banner standards by this contract; selected primary groups still open. |

---

# 11. Risks

| Risk | Severity | Mitigation in this contract |
|------|----------|------------------------------|
| Downstream reader treats partial Snapshot as complete history | **Medium** | Cycle scope line with **total** (§5.1); `partial` filename (§5.2). *(Ceremony reduction accepts this is weaker than banner+running-header.)* |
| First-two-of-six looks complete from columns alone | **High → mitigated** | Mandatory ` of {total}` in cycle scope line |
| Screen scope ≠ export scope | **High** | INV-CF5; persistence §7 |
| CSS-hidden cycles leave scores copyable | **High** | INV-CF3 / §5.3 (retained) |
| Non-contiguous selection shown as false range | **High** | INV-CF4; comma-only scope line |
| Footer shows included-only count after filter | **Med** | §5.1 secondary-chrome rule |
| Continuation print page viewed alone lacks Cycles field | **Low/Med** | Accepted after founder withdrew running-header treatment; columns still labelled |
| Folding scope into `exportMode` | **High** | Orthogonal scope §6.2 |
| Target rows dropped when scores fall outside selection | **Med** | INV-CF9 / §8.3 |
| Learner Map regression | **High** | INV-CF15 / INV-L1 |
| Sticky id list stale when cycles added | **Med** | `complete` vs explicit vs recent kinds §7.3 |

---

# 12. Open questions (founder)

### Resolved

| ID | Decision |
|----|----------|
| **OQ-1** | No separate artifact name; no title change. Remains Assessment Snapshot. |
| **OQ-2** | No banner. No banner prose required. |
| **OQ-3** | Filename token is `partial` (§5.2). |
| **OQ-4** | Most recent **N = 3**. |
| **OQ-6** | Persist “most recent 3” as sticky preset that recomputes when cycles are added — not expand-to-ids. Explicit multi-select persists as ids and does not auto-absorb new cycles. A control labelled “most recent 3” that silently shows anything else would be incorrect. |
| **G4/G5 scope clause** | Approved in substance; authoritative short clause in §2.2. |

### Still open

| ID | Question | Candidates | Recommendation |
|----|----------|------------|----------------|
| **OQ-5** | Baseline definition for future “baseline + latest” preset | **(a)** Lowest `cycleNumber` **(b)** Earliest anchored date **(c)** Clinician-marked baseline (does not exist) | **(a)** for Slice 2; defer preset |
| **OQ-7** | Extra PHI ack sentence when partial? | **(a)** No change **(b)** Add one sentence | **(a)** for Slice 1 |
| **OQ-8** | Encode scope in export URL in Alpha? | **(a)** Session only **(b)** URL in Slice 1 | **(a)** |

---

# 13. Phasing

## Slice 1 — Alpha minimum (ship)

Smaller than the pre-reduction draft: no banner, no title fork, no running-header work.

| Include | Exclude |
|---------|---------|
| Explicit multi-select + All + **Most recent 3** | Baseline+latest preset |
| Structural omission on all four egress paths | Domain / group filtering |
| Cycle scope line (§5.1) + `partial` filename (§5.2) | Banner / distinct title / partial running headers |
| sessionStorage persistence §7 | URL-encoded scope |
| Layout/print replan from scoped cycles | Aesthetics / blank-sheet work |
| Dialog honesty when partial (§5.5) | |

**Most recent 3:** N is resolved — the preset **ships in Slice 1** with multi-select and All; it does not need a separate sequencing gate.

**Acceptance:** INV-CF1–CF17 green; export-contract amendments in §10 applied; OQ-5, OQ-7, and OQ-8 may remain open (OQ-6 resolved — sticky recent).

## Slice 2 — Follow-on

- Baseline + latest preset (OQ-5)
- Optional URL scope grammar (OQ-8)
- Ack microcopy if OQ-7 chooses (b)

## Later

- Selected primary groups using generalized scope-line + structural-omission pattern (§14)
- De-identified export

---

# 14. Generalization (selected primary groups)

The **general** reusable model after ceremony reduction is:

| Shared across future scope dimensions | Not required to generalize |
|---------------------------------------|----------------------------|
| Orthogonal **scope** axis (not mode pollution) | Distinct artifact titles |
| Structural omission of out-of-scope evidence | Banners |
| Single honest scope statement in existing metadata (what is included **and** how large the full set is) | Per-page running-header partial markers |
| G4 within active scope; G5 on included marks | Cycle-specific presets |

Filename partial-token habit may generalize with a scope-reason segment later; do not hard-wire only the word `cycles` as the sole reason code in platform APIs (`cycles` \| `primary_groups` \| …).

Do **not** design domain filtering UI here.

---

# 15. UNDERSPECIFIED — needs decision

| Detail | Status |
|--------|--------|
| Most recent N | **Resolved — 3** |
| OQ-6 sticky recent vs expand-to-ids | **Resolved — sticky `recent`+3** (recomputes; expand-to-ids rejected) |
| Banner / title / running-header prose | **Withdrawn — N/A** |
| Cycle scope line format | **Specified in §5.1** — not underspecified |
| Filename token | **Resolved — `partial`** |

### Still needs founder/Builder product choice before encoding behaviour

| Detail | Candidates | Implications | Recommendation |
|--------|------------|--------------|----------------|
| **OQ-5** baseline definition | (a)(b)(c) in §12 | Only blocks Slice 2 preset | Defer |
| **OQ-7 / OQ-8** | as §12 | Ack copy / URL | (a) / (a) for Alpha |

No silent defaults beyond what this amendment locks.

---

# 16. Closing contract statement

1. Cycle-filtered Snapshots remain **Assessment Snapshots**; there is no distinct extract product name.
2. **All four egress paths** share the active scope.
3. **Structural omission** is mandatory; CSS suppression is forbidden — for hidden-evidence integrity, not as withdrawn ceremony.
4. Downstream-reader protection is the **cycle scope line** (`C… of {total}`) plus HTML **`partial`** filename — not banners or running headers.
5. **Mode `full`** remains structural completeness; **scope** is orthogonal.
6. **G4 / G5** use the short §2.2 clause: accuracy of contained marks and on-screen ≡ egress scope — not mandatory completeness of the cycle set.
7. **Slice 1** ships multi-select + All + most recent 3 with the reduced signalling set.

_Document steward: Architecture Agent. Commit is a separate Builder task after founder approval of this amendment._
