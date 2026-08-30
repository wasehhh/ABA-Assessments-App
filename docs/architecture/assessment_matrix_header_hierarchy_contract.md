# Assessment Matrix Header Hierarchy Contract

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (assessment Matrix header information architecture) |
| **Status** | Authoritative contract — founder decisions locked through 2026-08-30; Builder implements without further product interpretation on resolved items |
| **Binding context** | Structural audit 2026-08-27; header hierarchy design 2026-08-27; founder corrections 2026-08-29; M6 Approve strip ruling + first live M6 observation 2026-08-30 |
| **Scope** | Assessment Matrix header control hierarchy at **all breakpoints** (desktop ≥1024, tablet 768–1023). Phone out of scope. |
| **References** | [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) (touch targets + layout chrome on tablet; Model 3 three-slot geometry) · [`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) · vault G4 (Display = Export) — rule name only · [`assessment_lifecycle.md`](../product/assessment_lifecycle.md) |
| **Verified against** | `AssessmentMatrix.tsx` · `AssessmentMatrixHonestySurface.tsx` · `assessmentScoreEditRules.ts` · `assessmentMatrixReportEntry.ts` · `DomainScoreboard.tsx` · `assessments.ts` `startNewCycle` · `types/index.ts` statuses |

**Anchor:** The Matrix screen’s job is **scoring**. Header chrome makes the **current workflow action** obvious and keeps **side doors** findable without competing.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns Matrix header **modes**, **single primary per mode**, **job-class grouping**, **More menu structure**, **document-door naming**, **back-control disambiguation**, **footer vs header primary deconfliction**, and **New Cycle gating as workflow policy**. The tablet contract owns form-factor commitments, touch-target sizes, sticky budget, and the three-slot Model 3 geometry (primary strip / context row / More) as applied on tablet. This document does not restate Effective Scoring, Snapshot bead rendering, Report body authoring, or tablet score-track Approach C.

---

## Amendment banner — founder corrections (2026-08-29)

| # | Decision | Disposition of 2026-08-27 draft |
|---|----------|----------------------------------|
| **1** | **Submit stays in the header** as the single filled accent control whenever submitting is legal. Two-primaries problem is solved by **demoting competitors**, not by relocating Submit. **No filled footer Submit.** | Prior footer-last-domain Submit placement **rejected** |
| **2** | Document doors as proposed: Assessment Snapshot / Write Report / Communication Report + one-line subtitles | **Approved** |
| **3** | New Cycle gated `approved` ∧ admin/senior, inside More only | **Approved** as **deliberate workflow policy**, not a bug fix |
| **4** | No per-cycle domain assignment in product; unscored ≠ unassigned is ambiguous | **Recorded gap** — post-Alpha; do **not** design for it now |

**Filing:** Hierarchy content previously misplaced in [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) §4.6–§4.12 is **owned here**. The tablet contract retains Model 3 placement geometry and adds touch/layout-chrome rules only.

---

## Amendment banner — M6 Approve in primary strip (2026-08-30)

**Source:** First live observation of M6 (submitted assessment constructed in QA 2026-08-30). Prior M6 row was designed from code only — no submitted assessment existed during the C0 audit. Build (`01ddb1c`) correctly put Approve in More first row; closed chrome still read generic `More`, identical to M5 — reviewer could not see that a review commit existed.

**Founder ruling (binding — do not re-litigate):**

| # | Decision | Rejected alternatives |
|---|----------|----------------------|
| **5** | In **M6**, **Approve** is a real **filled accent** control in the **header primary strip**, occupying the position and visual weight Submit holds for the therapist in **M1** | Renaming M6’s closed More label to “Review”; leaving Approve in the overflow |

**Rule intent (founder):** the single-filled-accent rule is **one filled control for the person whose job that screen is**, not a global styling budget spent on nobody. In M6, Submit is not rendered, so Approve has no competitor.

---

## 1. Problem statement

The header presents eight controls as a flat peer list from four unrelated job classes:

| Job class | Controls (pre-hierarchy) |
|-----------|--------------------------|
| Analysis | Compare |
| Workflow commit | Submit |
| Lifecycle | New Cycle |
| Navigation / output | Learner Map, Report, Finalized Report, View Assessment Snapshot, Export |

**Specific faults (audit 2026-08-27):**

- Two controls compete for primary (Submit vs New Cycle visual weight).
- On approved assessments, Submit is absent and New Cycle becomes the only coloured control — readers are aimed at lifecycle.
- Three document doors share outline style; two share an icon; labels do not distinguish author / locked output / score snapshot.
- Export is an unlabelled icon (no `aria-label`).
- Longest label (“View Assessment Snapshot”) dominates primary-row width.
- Two Back arrows (header → Assessments; domain scoreboard → Domain Overview) share glyph story; tablet hamburger shares the vertical band.
- Footer “Next domain” filled navy + header Submit filled green = two primaries on one screen.

---

## 2. What is preserved

| Obligation | Binding |
|------------|---------|
| **Identity** | Client / pack / cycle visible while scoring |
| **Progress** | One readable progress line with competency-state counts (existing summaries) — see §8 for assignment ambiguity |
| **Submit honesty** | Submit may stay visible but **disabled** while saving / blocked, with a **stated reason** |
| **Approved lock** | Approved state is explicitly locked; **Submit absent** |

---

## 3. Header modes — state enumeration

Modes are derived from product dimensions in code, not from styling alone.

### 3.1 Dimensions (inputs)

| Dimension | Values (code) | Affects |
|-----------|---------------|---------|
| **Assessment status** | `draft` \| `in_progress` \| `submitted` \| `approved` | Submit, Approve, document doors, lock badge |
| **Viewed cycle status** | `in_progress` \| `locked` | Score edit, Submit eligibility |
| **Role** | `therapist` \| `senior_therapist` \| `admin` \| `viewer` | Edit, Approve, New Cycle, Report authoring |
| **Scores load** | `loading` \| `loaded` \| `error` | Submit disable reason; scoring entry |
| **View surface** | Domain Overview \| Domain Scoreboard | Footer nav chrome only (does **not** move Submit) |
| **Compare availability** | ≥1 other cycle \| none | Context row visibility |
| **Document availability** | finalized row exists; snapshot available | Overflow Documents subsection |

`draft` and `in_progress` **collapse to one header mode** for scoring — both expose Submit under the same rules (`showSubmitAssessmentButton`).

### 3.2 Header modes (binding enumeration)

| Mode | When (assessment × cycle × role × load) | Notes | Observation |
|------|----------------------------------------|-------|-------------|
| **M1 — Active scoring** | `(draft \| in_progress)` ∧ cycle `in_progress` ∧ role ≠ `viewer` ∧ scores `loaded` | Default Matrix mode | Observed (scoring path QA) |
| **M2 — Active scoring (blocked)** | M1 except scores `loading` \| `error` ∨ pending saves ∨ failed saves | Submit **visible, disabled** + reason | Observed (honesty path) |
| **M3 — View only (role)** | `viewer` OR scores not editable for role | No Submit | **Unobserved** — provisional |
| **M4 — Historical cycle** | Viewed cycle `locked` (assessment may still be active) | No Submit; read badges | **Unobserved** — provisional |
| **M5 — Submitted (therapist)** | `submitted` ∧ therapist ∧ cycle `in_progress` | No Submit; no Approve | Not asserted in 2026-08-30 M6 round |
| **M6 — Submitted (review)** | `submitted` ∧ (`senior_therapist` \| `admin`) ∧ cycle `in_progress` | Review mode — Approve is workflow action; scores editable for this actor | **First live observation 2026-08-30** (was provisional until then) |
| **M7 — Approved locked** | `approved` | No Submit; read / evidence mode | Observed (approved lock path) |
| **M8 — Post–new-cycle scoring** | After New Cycle (assessment → `in_progress`, new cycle `in_progress`) | Same as **M1** (resolver returns M1) | **Unobserved as a distinct post–New Cycle path** — provisional |

**Provenance (binding):** Any mode row written **without live observation** of that state is **provisional** until observed. At first sight it is **re-checked** against the contract — not treated as verified merely because the row shipped. **M6** is the worked example: designed from code in the C0 audit era, shipped in `01ddb1c`, corrected after first live QA on 2026-08-30. **Still provisional / unobserved:** **M3**, **M4**, **M8**.

**M6 is the only mode where Approve is the workflow-primary control.**

**Not a ninth header mode:** cycle scores loading skeleton — chrome shows identity + save idle until `loaded` or honest error (then M2).

### 3.3 M6 badge and editability (confirmed 2026-08-30)

Under M6 (`submitted` ∧ admin/senior ∧ cycle `in_progress`):

- **Workflow badge:** **`In review (editable)`** — matches QA observation and `AssessmentMatrix.tsx` (`scoresEditable ? 'In review (editable)' : 'In review'`).
- **Score edit:** `canEditAssessmentScores` allows `admin` and `senior_therapist` to edit scores while the assessment is `submitted` and the viewed cycle is `in_progress`. That is intentional review behaviour, not a lock.
- The alternate badge **`In review`** (non-editable) is only for when `scoresEditable` is false; under a well-formed M6 (cycle actually `in_progress`), the M6 actor is editable. Do not describe M6 as view-only.

---

## 4. Single primary control per mode

**Rule (founder 2026-08-29; intent restated 2026-08-30):** At most **one** filled accent commit control is visible to the **current actor** in the **current mode**, and every mode in which a commit action is legal for that actor **MUST** render it as that control. Competitors are demoted. **Submit is never relocated to the footer.**

**What this means:**

- The budget is **per actor / per mode**, not a viewport-wide styling quota that may be spent on nobody.
- In **M1 / M2** the actor is the scorer → **Submit** is that control (enabled or disabled-with-reason).
- In **M6** the actor is the reviewer → **Approve** is that control. Submit is not rendered, so Approve has no competitor.
- In modes with **no** legal commit for the actor (**M3–M5**, **M7**), there is **no** filled accent commit control.

**Outside this rule (explicit):** Selected **score chips** are **selection state**, not commit styling. They are **outside** this rule. QA has checked the rule against score chips twice; do not treat a selected chip as consuming the single-primary budget.

**Submit placement (binding — unchanged 2026-08-29):**

- When submitting is legal (**M1**, and **M2** disabled), **Submit stays in the primary sticky strip** as the **single filled accent** control for that actor.
- Domain Overview and Domain Scoreboard use the **same** header Submit — surface does not change placement.
- Domain footer carries **Previous / Next domain only** — **no Submit control at all** (filled or otherwise).
- Footer “Next domain” / “Previous domain” are **secondary** (outline or text) — never filled navy competing with header Submit.

**Approve placement (binding — 2026-08-30):**

- In **M6**, **Approve** stays in the **primary sticky strip** as the **single filled accent** control for the reviewer — same strip slot and visual weight as Submit in M1.
- Approve is **not** placed in More. Rejected: rename closed More to “Review”; leave Approve in overflow.

| Mode | **Single primary** (filled accent) | Where | Header strip | Context row | Overflow (“More”) |
|------|------------------------------------|-------|--------------|-------------|-------------------|
| **M1** | **Submit assessment** | **Header primary strip** | Identity + save + **filled Submit** + More | Compare (if cycles) | Computer / admin items (§6) |
| **M2** | **Submit assessment** (disabled) | **Header primary strip** | Same + disable reason | Compare | Same as M1 |
| **M3** | **None** | — | Identity + More | Compare if applicable | Documents as needed |
| **M4** | **None** | — | Identity + More | Compare if applicable | Documents as needed |
| **M5** | **None** | — | Identity + More | Compare | Documents / Export / Learner Map as gated |
| **M6** | **Approve assessment** | **Header primary strip** | Identity + save + **filled Approve** + More; badge **In review (editable)** | Compare | Documents / Export / Learner Map only — **no** Workflow section (§4.1, §6.1) |
| **M7** | **None** — reader must not be aimed at lifecycle | — | Identity + More (**neutral** — no lone coloured control) | Compare | New Cycle **inside** More only |
| **M8** | Same as **M1** | Header | — | — | — |

### 4.1 M6 Approve — enabled, confirm, and error (from code)

Verified against `handleApprove` / `executeApprove` in `AssessmentMatrix.tsx` and `assessmentService.finalize`:

| Question | Finding |
|----------|---------|
| Can Approve be **illegal** while M6 is otherwise active? | **No.** M6’s definition already is the Approve eligibility gate (`submitted` ∧ admin/senior ∧ cycle `in_progress`). There is no pending-save, unscored-count, or scores-load disable path for Approve analogous to Submit’s M2 gate. |
| Pre-click control state | **Enabled** whenever shown in M6. No disabled-with-reason pattern on the strip control. |
| Activation | Opens existing confirm dialog (`Approve Assessment` / `Approve & Finalize`); `executeApprove` calls `finalize`. |
| Failure after confirm | Error alert (`Failed to finalize assessment: …`); dialog closes. That is **post-commit feedback**, not a disabled strip control. |
| Session precondition | `executeApprove` no-ops if `profile.org_id` or `user.id` is missing — not an M6 product state; not modeled as a disabled Approve. |

**Binding:** Do **not** invent an M2-style disabled Approve for M6. While M6 holds, the strip Approve control is enabled; honesty for Approve is confirm + error alert, not a disabled primary.

### 4.2 Tablet fit for M6 (hierarchy confirms; tablet owns chrome rules)

[`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) owns touch targets and layout chrome. This section **confirms** the amended M6 strip against those rules; it does **not** move header ownership into the tablet contract.

At **768×1024** (Tablet class):

- M6 primary strip is **Identity + filled Approve + More** — same three-slot right-cluster geometry as M1’s Identity + Submit + More.
- **Approve** and **More** remain fully visible and operable; Approve meets the same minimum hit target as header Submit on tablet (**≥ 44×44** CSS px).
- Primary strip has **no** `overflow-x` scroller and **no** clipped primary actions (tablet §1.3 / §4.3).
- Sticky height stays within the tablet **≤ 72** CSS px primary-strip budget (tablet §5.2).

**If Identity + Approve + More cannot fit at width 768 without overflow:**

1. **Truncate / compress identity** (learner name, pack title) first — already allowed on tablet.
2. **Never** introduce a horizontal scroller on the primary strip.
3. **Never** clip or bury **Approve** or **More**.
4. **Never** move Approve into More to reclaim width (founder rejected overflow placement).

Builder measures at 768×1024 after shipping the strip Approve; if identity truncation alone is insufficient, **stop and report** — do not invent a second overflow pattern here.

**Rejected (2026-08-29):** Footer Submit on last domain; hiding header Submit on scoreboard; outlined-only Submit on overview pending “all domains visited.” Those assumed sequential domain completion and made Submit unreachable when therapists score a subset of domains (see §8).

**Rejected (2026-08-30):** Approve only in More; renaming closed More to “Review” in M6.

---

## 5. Three-slot geometry (shared with tablet contract)

Same Model 3 structure on **Desktop and Tablet** — one placement model. Geometry and sticky budget details for tablet live in [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) §4–§5. This contract binds **what goes in each slot** and **which control is primary**.

```
┌─ PRIMARY STRIP (sticky) ──────────────────────────────────────────────────┐
│ [← Assessments]  Client | Pack  Cycle N  [badge]  Save  [Submit*|Approve†] [More] │
└───────────────────────────────────────────────────────────────────────────┘
┌─ CONTEXT ROW (non-sticky) ────────────────────────────────────────────────┐
│ Compare with cycle ▾                                                         │
└───────────────────────────────────────────────────────────────────────────┘
┌─ BODY — scoring grid / domain scoreboard ─────────────────────────────────┐
│ …                                                                          │
│ Footer (scoreboard): [Previous domain]     [Next domain]  ← secondary      │
└───────────────────────────────────────────────────────────────────────────┘
* Submit only when legal (M1 / M2).
† Approve only in M6 (header filled accent — never both Submit and Approve).
```

---

## 6. Grouping rationale

| Job class | Controls | Placement | Rationale |
|-----------|----------|-----------|-----------|
| **Session identity** | Back, learner, pack, cycle badge, workflow badge, save | Primary strip (left) | Always visible while scoring; no competition with commits |
| **Workflow commit** | Submit | **Primary strip — filled** when legal (M1 / M2) | Must remain reachable without visiting a particular domain order |
| **Workflow commit** | Approve | **Primary strip — filled** in **M6** only | Same strip weight as Submit for the reviewer; never buried in More |
| **Mid-session analysis** | Compare + cycle select | Non-sticky context row | Needed while scoring; must not widen sticky strip |
| **Lifecycle** | New Cycle | More only; gated per §7 | Rare; must not shout on read-only approved visits |
| **Navigation / output** | Learner Map, documents, Export | More → grouped submenus (§6.1) | Computer surfaces; not the scoring path |

### 6.1 Overflow (“More”) structure

Fixed sections in order (**omit empty sections** entirely — including omitting the section header):

1. **Workflow** — reserved for strip-eligible commit actions that are temporarily overflow-only. **After 2026-08-30:** Approve no longer lives here. With no remaining Workflow members, the **Workflow group is omitted** in M6 (group header disappears with the group).
2. **Lifecycle** — New Cycle (`approved` ∧ admin/senior) — §7.
3. **Documents** — §9 doors, each gated independently.
4. **Analysis export** — Export… → Matrix CSV / Analytics CSV (existing submenu).
5. **Computer surfaces** — Learner Map (desktop-first; tablet reachable but deprioritized).

**M6 More contents (binding):** Documents (as gated) · Export · Learner Map. No Approve. No Workflow section.

**Stays out of More:** Submit (must not be buried), **Approve** (must not be buried), Compare (context row), Back, identity.

**Tablet (`768 ≤ width < 1024`):** Primary strip = identity + save + **Submit when legal (M1/M2)** or **Approve when M6** + More. Compare in context row. Therapist More often contains only sections 3–5.

---

## 7. New Cycle — deliberate workflow policy

**Founder decision (2026-08-29):** New Cycle appears **only** when:

- `assessment.status === 'approved'`, **and**
- role is `admin` or `senior_therapist`, **and**
- inside **More** (never a coloured strip sibling).

**Intended restriction:** A new cycle **cannot** be started from an `in_progress` or `submitted` assessment via the UI. That is **workflow policy**, not a bug fix of a mismatched button.

**Service alignment:** `startNewCycle` already requires `approved`. UI must match — do not show New Cycle when the call would fail.

**On M7 (approved):** New Cycle remains available inside More for eligible roles, but is **never** the only coloured control on the screen (More trigger stays neutral).

---

## 8. Related gap — no per-cycle domain assignment (do not design now)

**Fact:** The app has **no** notion of per-cycle domain assignment. Senior therapists assign domains **verbally**; therapists are told which domains to score for a cycle.

**Consequence:** An unscored domain is **ambiguous** — *not-yet-done* and *not-assigned-this-cycle* are indistinguishable in product data.

**Tracking:** Post-Alpha. **Do not invent assignment UI or data model in this contract.**

**Implications for this hierarchy (explicit):**

| Mechanism | Behaviour under missing assignment |
|-----------|-------------------------------------|
| **Submit placement** | Header Submit is legal whenever `showSubmitAssessmentButton` rules say so — **independent of which domains were visited or completed**. No “last domain” or “all domains visited” gate. |
| **Progress line** | Continues to report competency-state / unscored counts over the **full pack snapshot**. Unassigned domains look like incomplete work. That ambiguity is **accepted until post-Alpha**. |
| **Footer Next/Previous** | Navigates the domain list in pack order; does not encode assignment. Secondary styling only. |
| **Any future “completeness” copy** | Must not claim “all domains scored” as proof of cycle completion without assignment semantics — out of scope here. |

---

## 9. Document doors — names and distinction

**Founder approved (2026-08-29)** as proposed. Structural fix: different **verbs**, **icons**, and **overflow labels** — not colour alone.

| User-facing name (binding) | Prior UI label | What it is | Who | Icon family |
|----------------------------|----------------|------------|-----|-------------|
| **Assessment Snapshot** | View Assessment Snapshot | Layer 2A **evidence grid** — every target, every cycle, no interpretation | All roles when available | List / grid |
| **Write Report** | Report | Layer 2C **authoring workspace** — clinician builds communication doc | `senior_therapist` \| `admin` when `approved` | Pen / edit on document |
| **Communication Report** | Finalized Report | Layer 2C **locked issued** document (specific version) | Roles with finalized view when row exists | Check / lock on document |

**One-line distinction (UI copy):**

- **Assessment Snapshot** — “All scores, all cycles — source data.”
- **Write Report** — “Draft the family-facing report.”
- **Communication Report** — “Read the issued report (locked).”

**Overflow presentation:** Documents subsection with the three rows above (only rows that apply). Short labels in menu; subtitles optional on desktop wide More panel.

**Export:** visible text **“Export”** on `sm+`; icon + **`aria-label="Export assessment data"`** always. Not icon-only.

### 9.1 Terminology sweep (follows C1)

**“Finalized Report”** remains existing terminology in:

- [`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md)
- Vault / G4 language (Display = Export on the finalized artifact)

**UI** uses **Communication Report**. A **terminology sweep** of architecture docs and G4-facing language to match the UI name **follows C1** — do not block header Builder work on that sweep. Until then, docs may say “finalized report” when referring to the issued artifact; Matrix overflow shows **Communication Report**.

---

## 10. Back controls and footer precedence

### 10.1 Two backs — must not share one glyph story

| Control | Destination | Binding treatment |
|---------|-------------|-------------------|
| **Header back** | Assessments list (`#/assessments`) | Chevron-left + visible **“Assessments”** on `sm+`; `aria-label="Back to Assessments"` always |
| **Domain scoreboard back** | Domain Overview (same assessment) | **Text button “All domains”** (or pack primary-group label) — **not** a lone chevron; **no** `ArrowLeft` reuse |

Domain exit reads as **in-assessment navigation**, not leave-assessment. On tablet the global hamburger shares the header vertical band — shared chevron story is especially harmful there.

### 10.2 Footer vs header — one primary filled commit

| Control | Styling class | When |
|---------|---------------|------|
| **Submit assessment** | **Primary** — filled emerald | **M1 / M2** in **header only** |
| **Approve assessment** | **Primary** — filled accent (existing Approve accent family; same strip weight as Submit) | **M6** in **header only** |
| **Next / Previous domain** | **Secondary** — outline or text (no filled navy) | Domain scoreboard footer always |
| **Footer Submit** | **Removed** | Never |

Submit and Approve never appear together: Submit is absent in M6; Approve is absent in M1/M2.

---

## 11. Builder touch list

| File | Change class |
|------|----------------|
| `frontend/src/pages/AssessmentMatrix.tsx` | Primary strip + context row + More; **header filled Submit** (M1/M2); **header filled Approve** (M6); gate New Cycle per §7 |
| `frontend/src/pages/AssessmentMatrixHonestySurface.tsx` | Header Submit control only; honesty disable reasons; **no footer Submit** |
| `frontend/src/pages/assessmentMatrixHeaderModes.ts` | Mode resolver M1–M8; **Approve shown in strip for M6** (not More-only helper) |
| `frontend/src/pages/assessmentMatrixReportEntry.ts` | Document door labels/routes (Snapshot / Write Report / Communication Report) |
| `frontend/src/pages/assessmentMatrixOverviewContract.ts` | Update `MATRIX_ACTION_MARKERS` / labels for document doors |
| `frontend/src/components/assessment/DomainScoreboard.tsx` | “All domains” back; demote Next/Prev to secondary; **remove footer Submit entirely** |
| `frontend/src/components/assessment/MatrixHeaderMoreMenu.tsx` | Grouped overflow; **omit Workflow section when empty** (M6 has no Approve in More) |
| `frontend/src/components/assessment/MatrixContextRow.tsx` | Compare strip below primary |
| `frontend/src/pages/AssessmentMatrixHonestySurface.test.ts` | Header Submit visibility/disable; no footer Submit coupling |
| `frontend/src/pages/assessmentMatrixHeaderModes.test.ts` | M6 Approve-in-strip; More contents without Approve |
| `frontend/src/pages/assessmentMatrixOverviewContract.test.ts` | Label/marker contracts |
| `frontend/src/pages/assessmentMatrixReportEntry.test.ts` | Door gating + labels |
| `docs/architecture/assessment_matrix_header_hierarchy_contract.md` | This contract |
| `docs/architecture/tablet_touch_viability_contract.md` | Touch/chrome only; placement tables that still say “Approve → Overflow” must be **pointer-aligned** to this contract (not re-owned) |

**Out of scope this round:** `Layout.tsx` nav breakpoint (tablet T2); score track Approach C; Report/Snapshot page layouts; per-cycle domain assignment; terminology sweep of “Finalized Report” in authoring/G4 docs (post-C1); `executeApprove` `window.location.reload()`; M2 disable-reason visibility conformance (existing contract text — Builder slice, no amendment).

---

## 12. Resolved decisions (formerly open)

| ID | Decision | Locked |
|----|----------|--------|
| **OQ-MH-1** (was OQ-TT-16) | Document door strings + one-line subtitles as §9 | 2026-08-29 founder |
| **OQ-MH-2** (was OQ-TT-17) | Submit **always header filled** when legal; no overview/scoreboard split; no last-domain footer Submit | 2026-08-29 founder |
| **OQ-MH-3** (was OQ-TT-18) | ~~Approve in More first row in M6~~ | **Superseded 2026-08-30** — Approve in **header primary strip** in M6 (founder ruling § amendment banner) |
| **OQ-MH-4** | New Cycle = deliberate `approved`-only workflow | 2026-08-29 founder |
| **OQ-MH-5** | Single-primary rule is **per actor / per mode**; M6 strip Approve; score chips outside the rule | 2026-08-30 founder |

**Not product-open (implementation taste only):** emerald vs purple exact hues for the filled commit (Submit emerald / Approve existing purple family); More menu glyph; whether overflow uses chevron vs “More” label.

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-27 | Hierarchy design drafted (then filed under tablet contract §4.6–§4.12) |
| 2026-08-29 | Founder corrections: header Submit; document doors approved; New Cycle as workflow policy; domain-assignment gap recorded; extracted to this document |
| 2026-08-30 | M6 first live observation; Approve moved to header primary strip; single-primary rule restated per-actor; Approve enabled/error from code; M6 badge/editability confirmed; mode provenance note; tablet fit confirmation |
