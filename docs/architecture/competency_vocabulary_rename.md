# Competency Vocabulary Rename Contract

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (implementation contract) |
| **Feature** | Layer 0 competency vocabulary — clinician-facing display labels |
| **Milestone** | Competency vocabulary rename (post–founder decision 2026-08-10) |
| **Status** | Authoritative product contract — Builder makes zero product decisions from this document |
| **Verified against** | Code inspection of listed touchpoints (2026-08-11); no SQL/DB occurrences of Evalis vocabulary strings; G8 definition in [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) §G8 |
| **References** | [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §2 / §11 · [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) · [`assessment_builder_universal_architecture_plan.md`](./assessment_builder_universal_architecture_plan.md) §5.1 (CSV `scale_labels` encoding) · Layer 0 interpretation: `frontend/src/utils/scoreInterpretation.ts` · display SSOT candidate: `frontend/src/components/assessment/domainProfile/stateDisplay.ts` |
| **Non-goals** | Implementation · Phase B canonical scoring · Snapshot aesthetics / continuation grouping / trailing-blank-sheet defect · Learner Map behavioural changes beyond vocabulary display · rewriting authored packs or CSV import semantics · data migration of stored scores or `pack_snapshot` |

This document is the authoritative product contract for renaming Evalis’s competency vocabulary.

It resolves semantic ambiguities so Builder implements behaviour; it does not invent behaviour.

**Do not commit this document as part of an implementation PR unless separately instructed.** Founder approval of this contract precedes Builder work.

**Supersession:** This contract resolves the previously unresolved competency rename in [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §11 / OQ-3 / INV-A2. After founder approval, that export contract’s “do not rename” posture is obsolete for product meaning; export surfaces must follow this vocabulary contract.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns product meaning (which Evalis state maps to which clinician-facing words; what must not be rewritten). It references canonical code modules for structure and location. It does not restate CSS class maps, full consumer call graphs, or parser algorithms. Implementation must not treat this document as a second string table to copy into multiple modules — see §6.

---

# 1. Goals

## 1.1 What this solves

Layer 0 maps a recorded score against a target’s Effective Scoring definition into a `CompetencyState`. Downstream surfaces display that state with clinician-facing words.

**Founder decision (locked 2026-08-10) — do not re-litigate:**

| Internal state | Current display | New display |
|----------------|-----------------|-------------|
| `not_yet` | Not Yet | **Not Demonstrated** |
| `at_maximum` | Mastered | **Demonstrated** |
| `in_progress` | Emerging | **Undecided** — see §9 OQ-1 |
| `unscored` | Unscored | Unchanged |

**Clinical rationale** (AIM clinical supervisor Rayah Realista, 2026-07-18): a score records what a learner did on a given day under given conditions. “Mastered” asserts a durable property of the learner; “Demonstrated” asserts an observation. “Not Yet” embeds a prediction that the skill is coming — sometimes clinically wrong, and not the score’s job.

The rename also reduces the contradiction that Assessment Snapshot is an evidence record yet its legend prints overclaiming interpretive words. Observational wording is still colour-key chrome for Layer 0 bands; it must not introduce clinical conclusions, recommendations, or progress narrative (Snapshot “evidence only” remains binding).

## 1.2 Success statement

After implementation of this contract:

> Every clinician-facing Evalis competency-state label reads **Not Demonstrated** / *(Emerging or founder-chosen middle label)* / **Demonstrated** / **Unscored** from a single code source of truth. Clinic-authored `scale_labels` (including packs, CSV imports, Builder fields, frozen `pack_snapshot` blobs, and matrix score-button labels derived from those fields) are byte-for-byte unchanged. Score values, Effective Scoring resolution, G8, and `pack_snapshot` structure are unchanged. Historical assessments reopen with the same underlying states and the new Evalis display vocabulary. Already-downloaded HTML/PDF artifacts retain whatever words they had when exported.

## 1.3 What this does NOT solve

| Out of scope | Owner |
|--------------|--------|
| Phase B canonical scoring / inheritance | Separate track |
| Snapshot layout, print CSS, Target Index, export channels | Existing Snapshot contracts |
| Learner Map movement, coverage, or export-mode semantics | Forbidden beyond label text |
| Rewriting clinic packs, CSV files, or `scale_labels` that happen to say “Mastered” | Forbidden — see §3 |
| Migrating already-exported static HTML/PDF | Accepted consequence — §8 |
| Renaming internal enum identifiers `not_yet` / `in_progress` / `at_maximum` | Forbidden — §5 |
| Deciding the middle-state label (“Emerging”) | Founder — §9 OQ-1 |

---

# 2. Binding constraints

| ID | Constraint |
|----|------------|
| **V1** | Locked rename only: `not_yet` → “Not Demonstrated”; `at_maximum` → “Demonstrated”. No alternate synonyms on any surface. |
| **V2** | No change to score values, scoring resolution, or `resolveEffectiveScoring`. |
| **V3** | No change to `pack_snapshot` structure or G8 semantics ([`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) §G8). |
| **V4** | No change to authored pack content, CSV import behaviour, or clinic-supplied `scale_labels` text. |
| **V5** | Snapshot remains evidence-only: the rename must not add conclusions, recommendations, movement language, or inferred progress narrative. |
| **V6** | Internal `CompetencyState` enum string values remain `unscored` \| `not_yet` \| `in_progress` \| `at_maximum`. |
| **V7** | Canadian spelling in clinician-facing prose outside code identifiers. Do not rename API fields, DB columns, or TypeScript type/property names unless this contract explicitly requires it (it does not). |
| **V8** | Evalis vocabulary and authored scale labels are distinct namespaces. Coincident strings (a clinic labelling score `2` as “Mastered”) are allowed and must be preserved. |

---

# 3. Evalis vocabulary versus authored content

## 3.1 Definitions

| Term | Meaning |
|------|---------|
| **Evalis vocabulary** | Clinician-facing words Evalis uses to name Layer 0 `CompetencyState` values (legends, distribution labels, aria-labels/tooltips that name the state, Snapshot colour key, Learner Map score bands, report distribution chrome). Owned by Evalis. |
| **Authored content** | Clinic- or author-supplied text stored on the pack (and frozen into `pack_snapshot`), especially `scoring.scale_labels` / Effective Scoring `scaleLabels`. Displayed as labels for **numeric score values** on scoring controls (e.g. matrix score buttons), not as names of competency states. Owned by the clinic. |
| **Neither** | Engineer-facing identifiers, dead fields, comments, or test descriptions that are not clinician-facing Evalis vocabulary and are not pack content. |

**Boundary rule:** Evalis may change Evalis vocabulary freely. Evalis must never scan, rewrite, or “normalize” authored `scale_labels` (or CSV cells that become `scale_labels`) because they resemble Evalis words.

## 3.2 How the two appear in the product

```text
Recorded score + Effective Scoring  →  CompetencyState (enum)  →  Evalis vocabulary (display)
Authored scale_labels[score]        →  score-control label text (matrix / Builder) — unchanged by this rename
```

A pack may author `2:Mastered`. After the rename, Evalis still shows **Demonstrated** for `at_maximum` on legends and competency chrome, while that target’s score button for value `2` still shows **Mastered** if that is what the pack authored.

## 3.3 File classification (investigation list)

| Path | Class | Resolution |
|------|-------|------------|
| `frontend/src/components/assessment/domainProfile/stateDisplay.ts` | **Evalis vocabulary** | Canonical display map today (`STATE_DISPLAY_LABELS` / `STATE_BUCKET_DISPLAY`). Must adopt locked strings; remains SSOT per §6. |
| `frontend/src/components/assessmentSnapshot/v1/snapshotVisualSystem.ts` | **Evalis vocabulary** | `resolveSnapshotLegendCopy()` currently **restates** the same labels independently. Must consume SSOT; must not keep a parallel string table. Comment mentioning “Mastered” is engineer-facing hygiene only. |
| `frontend/src/components/assessmentSnapshot/v1/snapshotVisualSystem.test.ts` | **Evalis vocabulary** (test expectations) | Assert new Evalis legend strings; must not assert authored `scale_labels`. |
| `frontend/src/utils/assessmentPackAuthoring.ts` | **Authored content** (documentation example only) | Comment on `parseScaleLabelsCsv` shows an encoding example (`0:Not Yet|…|2:Mastered`). Parser behaviour is format-only; example text is authored-content shaped. **Do not change parser behaviour.** Example comment need not track Evalis rename (§9 OQ-2). |
| `frontend/src/utils/assessmentPackAuthoring.test.ts` | **Authored content** | Fixtures exercise `scale_labels` round-trip. Strings must remain valid authored examples; **must not** be rewritten to Demonstrated/Not Demonstrated as if they were Evalis vocabulary. |
| `frontend/src/utils/assessmentPackStructure.test.ts` | **Authored content** | Fixtures for resolved pack `scale_labels`. Same rule. |
| `frontend/src/utils/matrixDisplayHelpers.test.ts` | **Authored content** | Asserts matrix buttons show authored labels (e.g. `{ 2: 'Mastered' }`). That proves authored-path behaviour; keep “Mastered” as authored fixture text. |
| `frontend/src/services/contentPackCsv.test.ts` | **Authored content** | CSV import fixtures with `scale_labels` column. Preserve fixture authored text; assert import fidelity, not Evalis legend copy. |
| `frontend/src/components/AssessmentBuilder.tsx` | **Authored content (product-shipped exemplar)** — ambiguous resolved | CSV template starter row and `# scale_labels format: …` comment are samples of **clinic-authored** encoding, not Layer 0 display. See §3.4. |
| `frontend/src/services/analytics.ts` | **Neither** — ambiguous resolved | See §3.5. |

## 3.4 AssessmentBuilder.tsx (ambiguous case — resolved)

`downloadTemplate()` embeds:

- a starter data row whose `scale_labels` cell is `"0:Not Yet|1:Emerging|2:In Progress|3:Advanced|4:Mastered"`
- a comment line documenting the encoding form with a shorter example

**Classification:** authored-content exemplars shipped by the product to teach CSV shape. When a clinic imports that row, those strings become pack `scale_labels`. They are not Snapshot/Learner Map competency legend copy.

**Contract decision:** The Evalis vocabulary rename **does not require** rewriting the CSV template. Leaving the examples unchanged preserves the authored-content boundary and avoids implying that clinics must adopt Evalis’s new words as their scale labels.

Optional clarification of examples (to reduce accidental conflation) is **OQ-2**, not part of the locked rename.

## 3.5 analytics.ts (ambiguous case — resolved)

`CycleStat.targetsMastered` is a TypeScript field name with an engineer comment; `calculateCycleStats` always returns `targetsMastered: 0` (placeholder). No clinician-facing UI in the investigated surfaces renders this field as “Mastered”.

**Classification:** neither Evalis display vocabulary nor authored content.

**Contract decision:** Out of scope for this rename. Do not rename the property as part of vocabulary work (V7). Do not treat analytics as a vocabulary surface on the QA checklist unless a future change renders this field to clinicians.

---

# 4. Storage, migration, and frozen assessments

## 4.1 Database and SQL

Independent confirmation: **zero** occurrences of “Mastered”, “Not Yet”, or “Emerging” as Evalis vocabulary in SQL migrations or the database schema. Competency-state labels are not persisted as Evalis display strings.

What *is* stored:

- recorded scores (numeric / null)
- assessment `pack_snapshot` JSONB (may contain authored `scale_labels` text, including the word “Mastered” if a clinic authored it)
- live content pack JSON (same)

**Consequence:** no data migration for Evalis vocabulary. Forbidden: any job that rewrites `pack_snapshot` or pack JSON replacing “Mastered” → “Demonstrated” (that would corrupt authored content).

## 4.2 G8 and historical interpretation

**G8** (Frozen Assessment Consistency): Effective Scoring for an assessment resolves exclusively from that assessment’s frozen `pack_snapshot`, never from later live pack edits. Same scores + same snapshot ⇒ same Effective Scoring ⇒ same `CompetencyState` enum values.

**Display labels** are a render-time mapping from `CompetencyState` → Evalis vocabulary. They are product chrome, not part of the frozen scoring definition.

| Question | Answer |
|----------|--------|
| Does the rename alter historical **interpretation** (state assignment)? | **No.** States remain `not_yet` / `in_progress` / `at_maximum` / `unscored` from unchanged scores + frozen Effective Scoring. |
| Does reopening a historical assessment show the **new** vocabulary? | **Yes.** Correct behaviour. G8 guarantees scoring continuity, not display-string continuity of product chrome. |
| Does G8 require old labels on old assessments forever? | **No.** G8 does not freeze Evalis UI copy. |
| Must `pack_snapshot` gain stored display labels? | **No.** Forbidden scope creep; would duplicate vocabulary into frozen blobs and break V4. |

## 4.3 Already-exported artifacts

Static HTML and PDF files already downloaded by clinicians permanently carry whatever legend/aria text was rendered at export time.

| Action | Decision |
|--------|----------|
| Rewrite or recall downloaded files | **Impossible / not required** |
| Server-side mutation of past exports | **None** (exports are client-held artifacts) |
| Product posture | **Accepted consequence** — document in release notes if founder wants clinician communication; not a Builder defect |

New exports after the rename use the new vocabulary.

---

# 5. Internal enum values

| Decision | Value |
|----------|--------|
| Keep | `unscored`, `not_yet`, `in_progress`, `at_maximum` |
| Change | Display strings only |

**Why:** Display is already decoupled (`stateDisplay.ts` comment: display-only; internal enum values unchanged). Renaming enums would force a wide identifier churn across interpretation, profiles, Learner Map, Snapshot, reports, and tests with **no clinical gain**. Persistence does not store these as display words. V6 is binding.

---

# 6. Single source of truth

## 6.1 Models compared

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **A — `stateDisplay.ts` as SSOT** | Keep `STATE_DISPLAY_LABELS` as the only string table; all surfaces (including Snapshot legend) import it | Already the de facto SSOT for most surfaces; smallest conceptual move | Module lives under domainProfile path while serving Learner Map / Snapshot / reports |
| **B — colocate with `scoreInterpretation.ts`** | Put labels next to `CompetencyState` | Discoverability beside the enum | Mixes pure interpretation/scoring helpers with UI copy; invites non-UI packages to depend on display strings |
| **C — new dedicated module** e.g. `competencyVocabulary.ts` | Neutral home for Evalis vocabulary only | Clearest namespace boundary vs authored labels | Extra file move; more churn for the same semantic outcome |

**Choice: Model A** for this contract — with a hard rule that Snapshot and every other surface **must** read labels from `STATE_DISPLAY_LABELS` / `STATE_BUCKET_DISPLAY` (or a single re-export from that module). Model C remains an allowed pure refactor later if path naming bothers maintainers; it must not create a second string table.

**Forbidden:** a second hardcoded legend map (today: `resolveSnapshotLegendCopy()` in `snapshotVisualSystem.ts`). That duplication is exactly what makes renames multi-touch and drift-prone.

## 6.2 Post-change rule (Reference-Not-Duplicate)

1. **One code table** maps `CompetencyState` → clinician-facing Evalis label.
2. Surfaces may compose accessible names (`Target X, Demonstrated, 2/2`) but must obtain the state word from the SSOT — never hardcode “Demonstrated” / “Not Demonstrated” / middle-state label at the call site.
3. Authored `scaleLabels` remain a separate map keyed by **score value**, never merged into the competency SSOT.
4. Docs may state the product mapping once (this contract §1.1). Other architecture docs should link here rather than restating the table (§5.5).

## 6.3 Adjacent copy (not SSOT competency vocabulary)

These clinician-facing phrases already avoid “Mastered” and are **not** the locked rename targets:

- Matrix / target modal: “At Maximum Score”, “Not Scored”, “Scored” (`TargetDetailModal`, `DomainScoreboard` filter)

They describe score status relative to the scale maximum, not the Evalis competency legend words. **Leave unchanged** unless founder expands scope (OQ-3).

---

# 7. Surface inventory (QA checklist)

QA verifies clinician-visible Evalis vocabulary (and accessible names that include the state word). Authored `scale_labels` on scoring controls are a **negative** check: they must still show clinic text even when that text is “Mastered”.

### 7.1 Domain competency summaries / overview

- [ ] Domain state distribution legend and tooltips (`DomainStateDistribution` and equivalent)
- [ ] Target sequence strip `aria-label` / title paths that include state labels (`DomainSequenceStrip`)
- [ ] Any domain profile chrome that prints bucket labels from `STATE_BUCKET_DISPLAY`

### 7.2 Learner Map

- [ ] Score bands card labels (“Canonical Evalis competency states…”)
- [ ] Domain summary segment labels and related `title` tooltips
- [ ] Cell `aria-label` strings that include `bucket.label`
- [ ] Learner Map export HTML/PDF legends that reuse the same bands (label text only; no behavioural change)

### 7.3 Assessment Snapshot

- [ ] Production threads legend (`AssessmentSnapshotThreadsLegend` via legend copy resolver)
- [ ] Any residual / alternate legend using `STATE_BUCKET_DISPLAY` (`AssessmentSnapshotLegend` if still reachable)
- [ ] Bead / cell `title` and `aria-label` strings that include `snapshotCellLabel(state)`
- [ ] Print document (same legend + accessible names as print path)
- [ ] HTML export serialization (legend + bead accessible names)
- [ ] PDF via browser print-to-PDF (same as print)

### 7.4 Reports

- [ ] Report domain score distribution labels
- [ ] Report assessment-level score distribution labels
- [ ] Report domain summary table bucket headers/labels that use `STATE_BUCKET_DISPLAY`

### 7.5 Builder / matrix authored path (negative tests)

- [ ] Builder CSV template still imports; authored `scale_labels` round-trip unchanged (byte-for-byte for existing packs)
- [ ] Matrix score buttons still show authored labels from Effective Scoring `scaleLabels` (e.g. clinic “Mastered” remains “Mastered”)
- [ ] Builder per-target scale label fields still edit/store arbitrary clinic text

### 7.6 Analytics

- [ ] No clinician-facing “Mastered” / “Not Yet” string introduced or required from `analytics.ts` for this rename (field remains out of scope)

### 7.7 Ops / docs hygiene (non-blocking for product acceptance unless founder requires)

- [ ] Ops QA checklists that say “Mastered beads” updated when convenient (`docs/operations/assessment_snapshot_print_qa.md`)
- [ ] Architecture examples of CSV `scale_labels` treated as authored examples, not Evalis vocabulary ([`assessment_builder_universal_architecture_plan.md`](./assessment_builder_universal_architecture_plan.md) §5.1)

---

# 8. Invariants (QA-testable)

| ID | Invariant |
|----|-----------|
| **INV-V1** | For any fixture assessment, UI competency chrome for `at_maximum` displays **Demonstrated**, never **Mastered**. |
| **INV-V2** | For any fixture assessment, UI competency chrome for `not_yet` displays **Not Demonstrated**, never **Not Yet**. |
| **INV-V3** | Middle state `in_progress` displays the founder-approved label from OQ-1 (until decided, implementation must not invent a replacement). |
| **INV-V4** | `unscored` continues to display **Unscored**. |
| **INV-V5** | **Authored-content-survives-intact:** Given a pack (or frozen `pack_snapshot`) whose `scale_labels` contain any string S (including “Mastered”, “Not Yet”, “Emerging”), after the rename S is unchanged in storage and still appears on score-value controls that render authored labels. Byte-for-byte equality of the `scale_labels` object before vs after rename. |
| **INV-V6** | CSV import of a row with `scale_labels` `0:Not Yet\|1:Emerging\|2:Mastered` still yields exactly those three label strings on the target scoring object. |
| **INV-V7** | `CompetencyState` enum wire values remain `not_yet` / `in_progress` / `at_maximum` / `unscored` in code and in any `data-competency-state` attributes. |
| **INV-V8** | Re-resolving a historical assessment after live pack edits still yields the same Effective Scoring and the same competency **states** as before the rename (G8); only Evalis display strings differ from pre-rename screenshots. |
| **INV-V9** | No module other than the SSOT (§6) hardcodes the Evalis competency display strings for the four states. |
| **INV-V10** | Snapshot export/print introduce no new interpretive narrative beyond the colour-key state labels required for the legend. |
| **INV-V11** | `resolveEffectiveScoring` outputs and recorded scores are unchanged for identical inputs. |
| **INV-V12** | Already-downloaded HTML/PDF are not modified by the product (accepted permanence of old vocabulary in those files). |

---

# 9. Open questions (founder)

Anything below is **not** decided by this contract and must not be silently assumed by Builder.

| ID | Question | Candidates | Implications | Recommendation |
|----|----------|------------|--------------|----------------|
| **OQ-1** | Does **Emerging** (`in_progress`) change, and to what? | **(a)** Keep “Emerging”. **(b)** “In Progress” (matches internal name; procedural). **(c)** “Partial” / “Partially Demonstrated” (observational of incomplete band). **(d)** Another founder-chosen observational term. | **(a)** Leaves one characterization-style claim in the triad while ends become observational — inconsistent philosophy. **(b)** Avoids predicting future mastery but still implies a trajectory. **(c)** Best alignment with Rayah’s observation framing; may need brief clinician education. **(d)** Flexible but needs explicit copy. | Prefer **(c)** clinically (same category of fix as the locked ends), but **do not implement until founder sign-off**. Architecture Agent does not decide. |
| **OQ-2** | Should Builder CSV template examples be rewritten to non-Evalis words (e.g. `0:Absent\|1:Partial\|2:Present`) to teach the boundary? | **(a)** Leave examples as-is. **(b)** Replace with clearly distinct authored examples. | **(a)** Zero risk to authored-boundary messaging; continued coincidence with old Evalis words. **(b)** Pedagogically clearer; still must not use Demonstrated/Not Demonstrated as if required. | **(a)** for the rename PR; consider **(b)** as a separate Builder UX/docs tweak. |
| **OQ-3** | Should adjacent “At Maximum Score” / “Not Scored” matrix copy be aligned with Demonstrated language? | **(a)** Leave. **(b)** Align toward Demonstrated wording. | **(a)** Preserves prior clinical wording pass; scale-relative and already non-“Mastered”. **(b)** Broader copy sweep; risk of conflating score-max status with competency legend. | **(a)** Leave unless founder wants a wider language pass. |
| **OQ-4** | Clinician release communication about already-exported PDFs/HTML retaining old words? | **(a)** Silent. **(b)** Short release note. | Communication only; no engineering change. | Prefer **(b)** if AIM supervisors circulate Snapshot PDFs widely. |

---

# 10. Snapshot evidence posture

Snapshot answers “What happened?” and must not carry clinical interpretation in the sense of conclusions or recommendations.

| Concern | Contract position |
|---------|-------------------|
| Legend naming competency colour bands | Necessary chrome so colours are readable; not a progress narrative |
| Old words “Mastered” / “Not Yet” | Overclaim relative to evidence; locked rename reduces overclaim |
| New words “Demonstrated” / “Not Demonstrated” | Observation-aligned naming of the same Layer 0 bands; **not** new interpretive analytics |
| Must Snapshot drop the legend entirely? | **Out of scope** for this contract — would be a separate Snapshot product decision |

---

# 11. Relationship to other contracts

| Document | Relationship |
|----------|--------------|
| [`assessment_snapshot_export_contract.md`](./assessment_snapshot_export_contract.md) §11 / OQ-3 / INV-A2 | Superseded on rename posture once this contract is founder-approved |
| [`assessment_builder_phase_a_runtime_truth.md`](./assessment_builder_phase_a_runtime_truth.md) G8 | Affirmed: scoring freeze unchanged; display chrome not part of G8 freeze |
| [`assessment_builder_universal_architecture_plan.md`](./assessment_builder_universal_architecture_plan.md) §5.1 | CSV `scale_labels` encoding remains authored content; examples are not Evalis vocabulary |

---

# 12. UNDERSPECIFIED — needs decision

No silent defaults. Until the items below are resolved, Builder must stop rather than invent.

1. **OQ-1 Emerging** — middle-state clinician-facing string is required for a complete SSOT update. Candidates and recommendation are in §9. **Implementation of end-state rename may proceed only if founder explicitly authorizes shipping with Emerging temporarily unchanged**; otherwise wait for OQ-1.
2. **OQ-2 / OQ-3 / OQ-4** — non-blocking for the locked end-state rename if founder accepts recommendations in §9; still need explicit sign-off if Builder is asked to touch those surfaces in the same PR.

---

# 13. Acceptance criteria

This contract is ready for Builder only when founder has:

1. Confirmed the locked end-state mapping (§1.1) remains binding.
2. Resolved **OQ-1** (or explicitly waived middle-state change for a first PR).
3. Accepted authored-content boundary and INV-V5 (no pack/`scale_labels` rewriting).
4. Accepted G8 display behaviour (§4.2): historical reopen shows new Evalis words against unchanged states.
5. Accepted permanence of already-exported artifacts (§4.3).

Builder completion requires INV-V1–INV-V12 green on the §7 checklist, with SSOT compliance (INV-V9).

---

# 14. Closing contract statement

**Competency vocabulary rename:**

1. Evalis display language for `not_yet` / `at_maximum` becomes **Not Demonstrated** / **Demonstrated**.
2. Authored `scale_labels` and all pack/CSV/Builder authored text are a separate namespace and survive byte-for-byte.
3. Internal enums, scores, Effective Scoring, and G8 are unchanged; display is render-time product chrome.
4. One SSOT module owns Evalis labels; Snapshot must not restate them.
5. Emerging is founder-gated (OQ-1). Already-exported files keep old words forever.

_Document steward: Architecture Agent. Commit is a separate Builder task after founder approval._
