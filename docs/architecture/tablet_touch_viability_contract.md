# Tablet & Touch Viability Contract

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (tablet / touch viability) |
| **Status** | Authoritative contract — founder/SPM decisions locked 2026-08-25; Builder implements without further product interpretation on resolved OQs |
| **Binding context** | Founder statement 2026-08-25: tablet is for conducting and scoring assessments; everything else is a computer surface |
| **Evidence base** | QA measurements at 1440×900, 1024×768, 768×1024 with touch emulation (2026) |
| **References** | [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) (header modes, primary control, More grouping, document doors — all breakpoints) · [`assessment_lifecycle.md`](../product/assessment_lifecycle.md) · vault G4 (Display = Export) / G5 (Snapshot = Matrix) — rule names only · SPM Operating Contract §5.5 (Reference-Not-Duplicate) |
| **Verified against** | `Layout.tsx` · `AssessmentMatrix.tsx` · `AssessmentMatrixHonestySurface.tsx` · `DomainScoreboard.tsx` · `TargetScoreControls.tsx` · `TargetDetailModal.tsx` · `assessments.ts` `startNewCycle` · `Login.tsx` (scope only; not QA-measured) |

This document is the **first** tablet behaviour contract in `docs/architecture/`. Existing responsive behaviour is incidental Tailwind breakpoint usage, not designed intent. It defines how Evalis behaves on clinic tablets used for in-session scoring. Assessment Matrix **header control hierarchy** (modes, which control is primary, document-door naming, New Cycle policy) is owned by [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) at all breakpoints; this document only adds **touch-target** and **layout-chrome** rules on top of that shared Model 3 geometry.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns form-factor commitments, tablet surface scope, touch rules on the scoring path, score-column / reserved-track layout (including measured reflow cliffs), navigation breakpoint intent, Sign Out in-viewport guarantees by axis, the three-slot header **geometry** on tablet (sticky primary / non-sticky context row / More), domain-identity-while-scrolling behaviour, score-criterion discoverability without an extra scoring tap, and Login tablet obligations. Header **modes, primary-per-mode, document doors, and New Cycle workflow policy** are owned by the header hierarchy contract. It references lifecycle status meaning and vault G4/G5 by rule name. It does not restate Effective Scoring, Snapshot bead rendering, Report consolidation, or Builder Phase D.

---

# 0. Verified facts (design against these)

## 0.1 Navigation (`Layout.tsx`)

- Desktop nav and profile/sign-out cluster: `hidden md:flex` (Tailwind `md` = **768px**).
- Mobile drawer: `md:hidden` — therefore **at exactly 768 (iPad portrait) the desktop nav renders**, not the drawer.
- QA: at 768, `scrollWidth` 999 vs `clientWidth` 768 (**231px overflow**). Routes therapists need (Clients, Assessments) remain in view; **Audit, profile, Account Settings, and Sign Out** fall outside the viewport and require horizontal page scroll.
- Drawer omits Org and Audit (admin-only desktop items). Sign Out **is** in the drawer when the drawer is shown (`< 768`).

## 0.2 Scoring path (`AssessmentMatrix` + `DomainScoreboard` + `TargetScoreControls`)

- Assessment header: `sticky top-0 z-30` (`AssessmentMatrix.tsx`).
- Domain title: `<h2>` is **not sticky** (`DomainScoreboard.tsx`) — QA: after scrolling a 19-target domain, domain heading at **y ≈ −1586**.
- Score buttons: `h-9 min-w-9` → **36×36 CSS px** (`TargetScoreControls.tsx`); criterion text in `title` / conditional `aria-label` only; visible label is bare numeral (or Yes/No).
- **`title` tooltips do not fire on touch** — criterion text unreachable mid-session without AT.
- One tap scores one target; no horizontal scroll required to score at 768×1024.
- 19-target domain: 71 score buttons; 14 in first 1024px; last button **y ≈ 2847**.
- Domain scoreboard also has a **fixed bottom** domain-nav footer (`z-20`) — Prev/Next today; Submit must not live here (header hierarchy contract).
- Matrix route is wrapped in **`Layout`** (`App.tsx`) — top app nav and assessment sticky header both consume vertical space before content.

## 0.3 Assessment header control set (complete sibling set)

Enumerated from `AssessmentMatrix.tsx` header (right actions + left identity):

| Control | Current gating (code) |
|---------|------------------------|
| Back (chevron) | Always; **no** `aria-label` / `title` |
| Learner name + pack title | Always |
| Cycle badge | Always |
| Workflow badge | Always |
| Save status | When saving / saved / error |
| Compare With Another Cycle + select | `hidden md:flex` — **visible at 768+** |
| Submit | `AssessmentMatrixSubmitControl` — `hidden sm:flex`; only when scorable |
| Approve | `submitted` + admin / senior_therapist; `hidden sm:flex` |
| New Cycle | admin / senior_therapist; `hidden sm:flex`; **not** gated on `approved` in current UI (service requires `approved`; hierarchy contract aligns UI to that policy) |
| Learner Map | Always (sm+); navigates off Matrix |
| Report | Authoring entry conditions |
| Finalized Report | Finalized row conditions |
| View Assessment Snapshot | Snapshot availability |
| Export menu | Always (icon); Printable Report / Matrix CSV / Analytics CSV |

QA: at 768 the actions cluster becomes an overflowing row (~**1050px** content width); Export past viewport.

**UI/service mismatch (current code):** `startNewCycle` requires `assessment.status === 'approved'` (`assessments.ts`), but the button is shown whenever the role matches. Alignment is **deliberate workflow policy** in [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) §7 — New Cycle only when approved, inside More — not a casual bugfix.

## 0.4 Target Detail Modal

Close ~36×36; score buttons same compact 36×36; Clinical Notes save on blur; Previous/Next ~149×36 / 125×38. Matrix “View” control is text-only (~32×20).

## 0.5 Login

`Login.tsx` is in tablet scope (§1.2) but was **not** included in the QA measurement pass. Obligations are defined in §3.5 from product necessity, not from measured defects.

---

# 1. Supported form factors and surface scope

## 1.1 Viewport classes (CSS pixels)

Boundaries are justified against **QA-measured clinic viewports** (1024×768, 768×1024), not against inventing a specific tablet SKU. AIM’s exact devices are **not** assumed (**OQ-TT-1 RESOLVED — A**, 2026-08-25).

| Class | CSS viewport | Alpha status | Obligation |
|-------|--------------|--------------|------------|
| **Desktop** | `width ≥ 1024` | **Supported** | Full product; computer-primary surfaces designed here |
| **Tablet** | `768 ≤ width < 1024` | **Supported** | Scoring-path tablet obligations in this contract |
| **Phone** | `width < 768` | **Out of scope** | Must remain *reachable and not broken* (no hard dead-ends); **no** tablet layout obligation |

**Locked (OQ-TT-2 — A, 2026-08-25):** Treat **1024×768 landscape** as **Desktop class for layout chrome** (desktop nav may fit), but still apply **scoring-path touch rules** (§2) whenever the primary pointer is coarse / touch. Layout chrome follows width; touch rules follow pointer.

**Not supported as design targets:** foldables, watch, print layouts, split-screen widths below 768.

## 1.2 Tablet surface scope (founder-binding)

**In tablet scope (must meet this contract):**

- Login (§3.5)
- Navigation needed to reach an assessment (Clients list, Assessments list, and any Client → Assessment entry already used in product)
- Assessment Matrix (overview + domain scoreboard)
- Domain Scoreboard
- Target Detail Modal
- Submit

**Explicitly NOT in tablet scope (computer surfaces):**

- Content Packs and Assessment Builder
- Team Members
- Organization Settings
- Audit Log
- Report Authoring
- Finalized Report
- Assessment Snapshot
- Learner Map
- Profile / Account Settings
- Dashboard

**Boundary rule:** Out-of-scope surfaces must remain **reachable and not broken** from a tablet (a therapist who opens Packs or Snapshot must not hit a dead end or a blank trap). They carry **no** tablet layout, hit-target, or sticky-chrome obligation. A future reader **must not** re-expand tablet scope to those surfaces without a new founder decision.

## 1.3 What “supported” means for Tablet class (and Sign Out at 1024)

On Tablet class viewports, for in-scope surfaces:

1. No horizontal page scroll required to reach **Sign Out**, primary nav destinations for scoring (Clients, Assessments), or in-session scoring controls.
2. Assessment **primary strip** has **no internal horizontal scroller** and no clipped primary actions (§4.3). The non-sticky context row (§4.4) must also fit without page-level horizontal scroll.
3. Touch rules in §2 apply to scoring controls.
4. Domain identity remains determinable while scrolling (§5).
5. Login meets §3.5.
6. Score controls use **Approach C** layout (§2.3) so 44px buttons do not force one-button-per-row reflow.

**Additionally (Desktop class lower bound / tablet landscape):** at **width = 1024**, Sign Out must remain in-viewport without horizontal page scroll (§3.1) — width-scoped, not pointer-scoped.

---

# 2. Touch as a first-class input (scoring path)

## 2.1 Binding rules

On the scoring path (Matrix, Domain Scoreboard, Target Detail Modal, Submit), for Tablet class and for touch-primary use on landscape tablets (**OQ-TT-2 A**):

| ID | Rule |
|----|------|
| **T1** | No control may depend on `:hover` alone to be **discoverable or operable**. Hover may enhance desktop; touch must have an equivalent visible affordance. |
| **T2** | No information a therapist needs **mid-session** may exist **only** in a `title` attribute. (`title` is not a touch UI.) |
| **T3** | Primary scoring controls meet a **minimum hit target** of **44×44 CSS px** (see §2.2). |
| **T4** | Scoring cadence remains **one tap → one score**. No long-press, double-tap, or mandatory modal open to apply a score. |
| **T5** | Icon-only controls on the tablet scoring path (Back, Close, and nav icon controls) must have an accessible name (`aria-label` or visible text). |

Login primary controls follow the same hit-target and T1/T5 spirit (§3.5); Login is not part of the one-tap scoring cadence.

## 2.2 Score button size (the control this section is about)

**Shipped (T1):** 44×44 (`h-11 min-w-11`) in `TargetScoreControls` for the compact (non-checkbox) path. Pre-T1 was 36×36.

**Binding minimum:** **44×44 CSS px** stands.

| Compared option | Pros | Cons |
|-----------------|------|------|
| **Keep 36×36** | No scroll regression | Below common touch guidance; QA already shows dense 19-target domains; miss-taps risk wrong clinical scores |
| **44×44 (stands)** | Protects against miss-taps that write a **wrong clinical score** | Scroll cost is a **layout** problem, not a size delta — see §2.3 |
| **48×48** | More forgiving gloved/large-finger use | Higher density cost; not required without device evidence |
| **Quiet revert to 36×36** | Shorter domain scroll | **Rejected by default** — trades away wrong-score protection; only reconsider with an explicit safety argument |

**Justification:** Score buttons are the highest-frequency, highest-stakes touch targets in the product. 36px was an incidental Tailwind size, not a touch decision. **44×44 stands** (§2.2). The T1 scroll regression is resolved by **layout** (§2.3), not by shrinking the hit target.

**Yes/No buttons** in the same component must meet the same minimum hit target (verify ≥ 44px in both axes).

## 2.3 Score control size vs domain scroll — measured falsification and layout answer

### 2.3.1 What was measured (post–slice T1, 768×1024, same 19-target Domain A)

| | Baseline (36px) | After T1 (44px) | Prior contract §2.3 estimate |
|--|-----------------|-----------------|------------------------------|
| Last score control, document y | ≈ **2847** | **4499** | — |
| Delta | — | **+1652 px (+58%)** | **+152 px (+5%)** |

**Root cause (measured):** SCORE `<th>` ≈ **140.2px** wide with `px-6` (48px padding) → content box ≈ **92px**. Two 44px buttons + `gap-1.5` (6px) need **94px**. **Two pixels short** → every scale reflows to **one button per row**. Measured group heights under that reflow: three-value ≈ **144px** tall; five-value ≈ **244px** tall — across all 19 rows.

At 36px, `36+6+36 = 78` fitted inside 92; buttons shared a row. The prior estimate assumed row height would grow by the size delta (+8px × 19). **Rows did not grow — they reflowed.** The cost function is a **cliff**, not a slope; the design sat two pixels from its edge.

**§2.3 did not underestimate a slope; it modelled the wrong thing.**

### 2.3.2 General principle (apply elsewhere in this contract)

> **A per-element size estimate is not a layout estimate.** Enlarging an element inside a constrained container costs whatever the **reflow** costs — which may be discontinuous when a wrap threshold is crossed.

Apply this whenever the contract specifies a minimum control size inside a fixed or percentage column (score cells, sticky legends, header strips, modal footers). Before accepting a size change, state the **container content width**, the **row capacity arithmetic**, and whether the change crosses a wrap cliff.

### 2.3.3 Capacity arithmetic (44px buttons, `gap-1.5` = 6px)

Content width required for **n** buttons on one row:

`n × 44 + (n − 1) × 6` → n=2: **94** · n=3: **144** · n=4: **188** · n=5: **244**

### 2.3.4 Approaches compared (at width 768)

Assume Matrix main content ≈ **720px** (`768 − 48` for `sm:px-6` page padding). `DomainScoreboard` table today: target `w-1/2`, Trend `sm:table-cell` (visible at 768), Score ≈140px, Details with View.

#### Approach A — Widen SCORE column / cut padding (keep table)

`px-6` spends **48px** of a ~140px column on padding (~34% of the column).

| Change | Score content width | Buttons on one row |
|--------|---------------------|--------------------|
| Status quo (T1) | ~92 | **1** (cliff) |
| Keep ~140, `px-2` (16px pad) | ~124 | **2** (94 fits; 144 does not) |
| Score column 192, `px-2` | ~176 | **3** |
| Score column ≥260, `px-2` | ≥244 | **5** |

To put a **5-value** scale on one row inside the table at 768, Score needs ≥244 content (≥260 with `px-2`). Remaining for Target+Trend+Details ≈ `720 − 260 = 460`. With Trend+Details ~160, Target ≈ **300** (below today’s half-width). **Honest:** 768 will not give a single-row 5-value scale **alongside** a generous target-name column and Trend+Details without starving identity. A 5-across table row at 768 is a squeeze, not a free lunch.

**Predicted height if only clearing the 2px cliff (2-across wrap):** depends on how many 3- vs 5-value targets Domain A has. Under 2-across: 3-value group height `44×2+6 = 94` (was 144); 5-value `44×3+12 = 144` (was 244). **Without a scale-length histogram, total document y cannot be predicted from arithmetic alone** — do not invent one. Approach A alone is incomplete for a usable prediction.

#### Approach B — Reflow the score group (same table cell)

e.g. CSS grid `auto-fit` / forced 2-column button grid inside the cell.

Still bounded by cell content width. If cell stays ~92px, grid cannot place two 44px tracks. If cell is widened to ≥94 (Approach A’s floor), B and A converge: wrap cost matches 2-across math above. **Does not beat A** without the same width fix; horizontal scroll inside the cell is **rejected** (breaks scanning and invites mis-taps).

#### Approach C — Tablet-specific row: reserved score track (**selected**)

On **Tablet class**, do not put 44px controls inside a ~140px table column. Present each target as a **horizontal flex row**:

| Track | Role | Width rule |
|-------|------|------------|
| Identity | `target_id` + title | `flex: 1; min-width: 0`; truncate; must remain **legible enough to identify** what is scored |
| Score | `TargetScoreControls` | **`flex: 0 0 auto`**; width ≥ that target’s one-row requirement (for uniform tracks, reserve **≥ 244** so 5-value scales never wrap) |
| View | Details | ≥ 44×44 |

**Arithmetic at 768 (5-value reserve):**

- Content width ≈ 720
- Score track 244 + View ≈ 56 + gaps ≈ 16 → **316**
- Identity remains **720 − 316 ≈ 404px** — sufficient for mono id + truncated title

Buttons stay on **one row** for scales up to 5 (and typically beyond: 7×44+6×6 = 344 still leaves identity ≈ 720 − 344 − 72 ≈ 304).

**Desktop (`width ≥ 1024`):** keep the table, but apply a **score-column floor** so the T1 cliff cannot recur: score cell content width ≥ **94** after padding (2-across minimum); prefer content ≥ **244** when the viewport allows. Reducing score-cell padding from `px-6` toward `px-2`/`px-3` is an allowed means. Desktop must not regress to one-button-per-row wrap for ordinary numeric scales.

**Predicted last-control document y (same 19-target Domain A):**

Baseline shared-row geometry at 36px: **2847**.  
Restoring shared-row geometry at 44px adds only the button-height delta:

`2847 + 19 × (44 − 36) = 2847 + 152 = ` **2999**

That prediction holds when identity | scores | view remain **one band per target** (as in the baseline table row), not a name-above-buttons stack that adds a second band. Approach C’s reserved track is explicitly that one-band structure.

**Acceptance gate (not a second guess):** QA must re-measure Domain A at 768×1024 after this layout ships. **Pass if last score control y ≤ 3100** (allows minor chrome variance around 2999). If y remains ≫ 3100, the layout did not restore shared-row geometry — stop and re-open, do not ship another unmeasured estimate.

#### Approach D — Name-above-buttons card stack

Full-width score band under the title (card). Score width ≈ 688+ → 5-across easy. **T4 and 44px satisfied.** Height cost: second band per target (title band + score band) vs baseline side-by-side — likely materially taller than 2999. Exact add depends on title wrapping; **not predicted here without measurement**. Inferior to C when C already fits 5-across beside a 404px identity track.

### 2.3.5 Selection

**Approach C (tablet reserved score track) + desktop score-column floor.** Keeps **44×44** and **T4**; restores one-row button groups; predicts **≈2999** (~**+5%** vs 2847, not +58%); leaves target identity ~404px at 768 for 5-value scales.

**Not selected:** quiet revert to 36px; Approach A alone without a predicted height; Approach D without measurement.

### 2.3.6 Pre-existing domain length (observation only — §7)

At 36px the same domain was already ≈ **2847px** long. T1 exposed a scrolling problem more than it created one. Whether a domain of that length is workable for clinical cadence is a **founder question** (**OQ-TT-13**); it interacts with slice T3 orientation work. **Not solved in this amendment.**

### 2.3.7 Unverified control path

`TargetScoreControls` uses `useCompactButtons = effective.type !== 'checkbox'`. The **checkbox** branch (`useCompactButtons === false`) has **no live target** in any pack this organisation holds — neither QA nor unit tests exercised it under T1. It remains an **unverified class path**. It matters when a clinic pack uses **checkbox** scales: that branch must meet ≥44×44 and must not introduce its own wrap cliff inside the reserved score track / desktop column floor.

## 2.4 Score criterion text without adding a scoring tap

**Hard constraint:** therapist must score with **one tap per target**. Opening Target Detail solely to read scale meaning is forbidden as the *only* path.

**Models compared:**

| Model | Mechanism | Adds tap to score? | Verdict |
|-------|-----------|--------------------|---------|
| **A — Domain scale legend** | Sticky domain chrome shows the active scale’s value→label pairs when targets share a common effective scale | No | **Primary** (**OQ-TT-7 A**) |
| **B — Labels on every button** | Visible criterion under/beside numeral on each button | No | Use when scales **differ per target** in the domain; costs more height |
| **C — Long-press / tooltip** | Reveal criterion on press-hold | Effectively yes / undiscoverable | **Rejected** |
| **D — Modal-only criteria** | Must open View | Yes | **Rejected** as sole path |

**Binding approach:** Model A for homogeneous scales within the domain (**full labels, may wrap**; no page-level horizontal scroll). **Verification obligation (OQ-TT-7):** the legend must be checked against a **real ABLLS pack** before implementation — a legend that wraps acceptably on a three-value scale may not on a clinic pack. Model B fallback for heterogeneous per-target scales (short visible text on buttons, not `title`-only). Target Detail remains the place for full clinical prose — opened deliberately via View, not required for each score.

---

# 3. Navigation on tablet

## 3.1 Breakpoint placement

**Current defect:** drawer gated `md:hidden` / desktop `hidden md:flex` → at **768** desktop nav overflows and Sign Out is off-canvas.

**Binding change of intent:** Tablet class (`768 ≤ width < 1024`) must use the **drawer (or equivalent compact nav)**, not the overflowing desktop cluster.

**Locked (OQ-TT-3 — A, 2026-08-25):** Move the desktop/drawer split from Tailwind **`md` (768)** to **`lg` (1024)** so:

- `width < 1024` → compact nav + drawer
- `width ≥ 1024` → desktop horizontal nav

This aligns the breakpoint with the Desktop/Tablet classes in §1.1 rather than with an accidental 768 edge.

**Post-T1 regression at 1024×768 (measured):** Desktop account cluster gained visible “Account Settings” and “Sign Out” text (T2/T5). That widened the cluster: page overflow **≈99px**; Sign Out at **x≈1052.6** against a 1024 viewport. Tablet **landscape** uses this desktop chrome (width ≥ 1024) while remaining a clinic tablet — exactly the case **OQ-TT-2** exists for.

**Fix (binding):** On the `lg+` desktop account cluster, do **not** place side-by-side labeled Account Settings + Sign Out + full name block if that overflows. Use a **single in-viewport Account control** (button or menu) that opens Settings and Sign Out with visible names **inside** the panel. Icon-only cluster items with `aria-label` only are acceptable **only if** the opened panel still exposes visible “Sign Out” / “Account Settings” text.

**In-viewport guarantee — axis (must not contradict OQ-TT-2):**

| Concern | Axis | Rule |
|---------|------|------|
| Touch / hit targets / criterion text (§2) | **Pointer-scoped** (coarse) | OQ-TT-2 A — unchanged |
| Layout chrome (drawer vs desktop nav) | **Width-scoped** | `< 1024` drawer; `≥ 1024` desktop nav |
| **Sign Out reachable without horizontal page scroll** | **Width-scoped for all Alpha-supported widths ≥ 768**, including **1024** | A therapist who rotates to landscape must still reach Sign Out. **Not** pointer-scoped: a fine pointer at 1024 does not excuse off-screen Sign Out |

Drawer below 1024 already satisfies Sign Out in-viewport; §3.3’s personal-assignment posture only reduces **prominence**, not this reachability rule.

## 3.2 What a therapist needs on the scoring path

**Must be reachable without horizontal scroll on Tablet class:**

| Item | Priority |
|------|----------|
| **Sign Out** | **Normal secondary** — must be in-viewport (drawer/account cluster), not off-canvas; not elevated as shared-device critical (§3.3) |
| Clients | High — reach learners |
| Assessments | High — reach Matrix |
| Back to Assessments from Matrix | High — labeled control |

**Must remain reachable (no tablet layout obligation):** Dashboard, Packs, Team, Org, Audit, Settings — via drawer/list entries so routes stay open. Present them in a **secondary group** (e.g. “More” / admin tools) so they do not compete with scoring destinations. Org and Audit (currently missing from the sub-768 drawer) **must be added** for reachability when the user is admin — still without tablet layout polish.

## 3.3 Sign Out and session posture (personally assigned tablets)

**Locked (OQ-TT-4 — personally assigned, 2026-08-25):** AIM clinic tablets are **personally assigned**, not shared between therapists. The earlier conservative shared-device posture is overturned.

| Implication | Binding |
|-------------|---------|
| Sign Out prominence | **Normal secondary control** — not a hero action. In the **drawer** (`width < 1024`): visible “Sign Out” text, ≥ 44×44. On **desktop nav** (`width ≥ 1024`): inside the Account panel (§3.1), with visible name when opened — not `title`-only |
| Session persistence | May be **relied on** (therapist expects to stay signed in across sessions on their device) |
| In-viewport requirement | **Width-scoped for all Alpha widths ≥ 768**, including **1024×768 landscape** (§3.1). Personal assignment does not waive this |

**Operational assumption — not a product property:** Personal assignment describes **how AIM runs its clinic devices today**. It is **not** an Evalis product invariant. **Revisit condition:** if devices are later **shared between therapists**, Sign Out prominence and session-persistence posture in this section **must be revisited** (return to shared-device conservative design: stronger Sign Out affordance; do not assume lingering sessions are safe). A future reader who sees weak Sign Out chrome should check whether AIM still personally assigns tablets before treating this section as still valid.

## 3.4 Expressing out-of-scope surfaces

| Expression | Meaning |
|------------|---------|
| Route remains registered | No removal of `#/packs`, Snapshot, etc. |
| Nav entry allowed | Secondary group in drawer |
| Layout obligation | **None** — incidental responsive behaviour sufficient if not broken |
| QA bar | Can open and leave; no guaranteed fit, sticky, or 44px redesign |

## 3.5 Login (tablet scope — previously unspecified)

Login is the first step of a tablet session. QA did **not** measure it; these obligations are product-minimal, not defect-driven.

| Obligation | Rule |
|------------|------|
| Hit targets | Primary actions (Sign In / Sign Up submit, mode toggle) ≥ **44×44** CSS px |
| Horizontal scroll | Login card/form must not require horizontal page scroll on Tablet class |
| Hover | T1 applies — no hover-only path to submit or switch modes |
| On-screen keyboard | When a field is focused, the focused control must remain operable (scroll into view if the keyboard covers it). **Proposed default:** rely on normal document scroll / `scrollIntoView` behaviour; no custom keyboard-avoidance chrome unless QA proves failure (**OQ-TT-10**) |
| Sticky / session chrome | **None required** — Login is not a scoring surface |
| Beyond §2 | No further Login-specific layout system; incidental responsive form layout is acceptable if the rows above hold |

---

# 4. Assessment header information architecture (tablet chrome)

**Pointer:** Control hierarchy — modes M1–M8, single primary per mode, More grouping, document-door names, back disambiguation, New Cycle policy, footer Submit removal — is governed by [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) at **all breakpoints**. This section specifies only the **three-slot geometry**, Compare placement, and sticky-budget interaction that tablet scoring requires.

## 4.1 Problem statement

One control row mixes **therapist in-session scoring actions** with **supervisor / administrative / evidence-document actions**. At 768 it overflows. On desktop it is reported as cluttered. Density and overflow are tablet concerns addressed here; **which control is primary and how side doors group** are owned by the header hierarchy contract.

## 4.2 Models compared

### Model 1 — Primary strip + single overflow (“More”)

All non-primary actions collapse into one overflow menu; primary strip holds identity + Submit + save.

| Pros | Cons |
|------|------|
| Guarantees no horizontal scroller at 768 | Overflow becomes a junk drawer without hierarchy-contract gating |
| Simple to implement | Cannot host mid-session Compare without either overflowing the strip or burying Compare |

### Model 2 — Role- and workflow-state-scoped presentation only

Show a control only if role ∧ workflow make it meaningful; keep them all in one row when visible.

| Pros | Cons |
|------|------|
| Aligns New Cycle visibility with approved-only policy | At 768, lawful buttons still overflow |
| Honest UI | Does not by itself fix density; Compare in-strip still breaks §1.3 |

### Model 3 — **Scoped primary strip + non-sticky context row + grouped overflow** (**selected**)

Three structural slots:

1. **Primary sticky strip:** identity + cycle + workflow + save + **Submit when scorable** (header filled accent — hierarchy contract) + **More**.
2. **Non-sticky assessment context row:** mid-session controls that must stay **reachable while scoring** but must **not** consume sticky ceiling or widen the primary strip — **Compare lives here** (SPM resolution, 2026-08-25).
3. **Overflow (“More”):** secondary / computer / supervisor actions, each gated by role ∧ workflow ∧ availability (section order in hierarchy contract).

Same three-slot structure on **Desktop and Tablet** — one placement model.

| Pros | Cons |
|------|------|
| Holds §1.3 (no primary-strip horizontal scroller) | Requires explicit placement (§4.3–§4.4) |
| Compare usable mid-session without sticky budget cost | Context row scrolls away — therapist scrolls up to change compare cycle (acceptable) |
| Hosts New Cycle / documents without strip competition | — |
| Fixes desktop clutter with the same model | — |

**Selection:** **Model 3** (extended with the context row). Founder requires Compare on the tablet scoring path; SPM requires it **outside** the sticky primary strip so §1.3 and §5.2 hold. That collision is **resolved** — not re-opened — in §4.4.

## 4.3 Placement of every control

| Control | Location | Appears when |
|---------|----------|--------------|
| **Back** | Primary strip | Always; **labeled** (visible text or `aria-label` e.g. “Back to Assessments”) |
| **Learner name** | Primary identity | Always |
| **Pack title** | Primary identity (secondary line OK) | Always |
| **Cycle badge** | Primary | Always |
| **Workflow badge** | Primary | Always |
| **Save status** | Primary | Whenever saving / saved / error (unchanged semantics) |
| **Submit** | Primary strip **only** (filled accent when legal; **never** in domain footer) | Existing scorable-cycle rules (`showSubmitAssessmentButton`); must be visible without opening More — hierarchy contract §4 |
| **More** | Primary strip | When any overflow item is available |
| **Compare With Another Cycle** + select | **Non-sticky assessment context row** (§4.4) — **both Tablet and Desktop** | When ≥1 other cycle exists to compare; comparison load error inline in this row when present |
| **Approve** | Overflow | `status === 'submitted'` ∧ admin \| senior_therapist (**OQ-TT-6 A**) |
| **New Cycle** | Overflow | **`status === 'approved'`** ∧ admin \| senior_therapist — founder workflow policy (hierarchy contract §7) |
| **Learner Map** | Overflow | Existing availability; computer surface |
| **Write Report** | Overflow | Existing authoring-entry conditions (hierarchy contract §9) |
| **Communication Report** | Overflow | Existing finalized-row conditions (UI name; “Finalized Report” remains in authoring/G4 docs until post-C1 sweep) |
| **Assessment Snapshot** | Overflow | Existing snapshot availability |
| **Export menu** | Overflow submenu or grouped overflow section | Existing export permissions; computer-oriented; labeled (not icon-only) |

**Rules:**

- A control that cannot succeed in the current workflow state is **not shown** (not shown disabled-with-surprise-error). Exception: Submit may remain visible but disabled with an honest reason (existing honesty surface).
- Primary strip must fit Tablet class width **without** `overflow-x` scrolling.
- Desktop uses the **same** placement model (primary + context row + More) — Compare does **not** return to the header sibling pile or live only in More at ≥1024.

### 4.3.1 What else belongs in the context row?

Re-examined after introducing the third slot. **Only Compare** (label, select, and comparison-load honesty message) belongs there.

| Candidate | Move to context row? | Why |
|-----------|----------------------|-----|
| Compare | **Yes** | Founder: mid-session prior-performance reference; must not be in More; cannot fit primary strip without violating §1.3 |
| Approve / New Cycle | **No** | Rare workflow transitions; overflow + gating is correct |
| Learner Map / Report / Snapshot / Export | **No** | Computer surfaces; leave Matrix when used; More is correct |
| Domain search / filters | **No** | Domain-scoped; stay in Domain Scoreboard non-sticky chrome below the sticky domain bar (§5.2) |
| Save / Submit | **No** | Must remain sticky while scoring |

## 4.4 Cycle comparison — binding placement

**Locked (OQ-TT-5 — Compare stays on tablet scoring path, 2026-08-25):** Referencing prior performance during assessment is normal ABA practice. Compare is **not** hidden and **not** buried in More.

**Collision with §1.3:** Keeping Compare “as today” in the sticky header sibling row recreates the QA-measured ~1050px overflowing pane. That fails Tablet class acceptance.

**SPM resolution (decided — do not re-open):** Compare remains **present and usable** on the tablet scoring path, **outside the sticky primary strip**, in the **non-sticky assessment context row** that scrolls away with the page. Intent preserved (reachable while scoring, not behind More); primary strip stays inside §5.2; **zero cost to the ≤112px sticky ceiling**.

### 4.4.1 Context row geometry

| Property | Binding |
|----------|---------|
| **Document order** | Immediately **below** the sticky primary strip; **above** Matrix main content (overview or domain scoreboard) |
| **Sticky?** | **No** — `position` static/relative; scrolls away |
| **Sticky budget** | **Does not consume** the §5.2 ceiling |
| **Relative to sticky domain bar** | When a domain is open, order is: primary strip (sticky) → context row (scrolls) → domain context bar (sticky, `top` = primary height) → domain content. After the user scrolls past the context row, the domain bar sits directly under the primary strip |
| **Height** | **Proposed default ≤ 48 CSS px** when Compare is shown (single row: label + select); wrap only if forced — list as **OQ-TT-11** if packs/cycles force taller UI |
| **Width** | Must not introduce page-level horizontal scroll on Tablet class |

### 4.4.2 Desktop-class treatment of Compare

**Same context row on Desktop (`width ≥ 1024`).** Compare does **not** move back into the primary strip or into More at desktop widths.

**Justification:** One consistent placement beats a control that lives in three places across two viewports. Desktop also benefits from a thinner sticky primary strip. Mid-session compare behaviour is identical for therapists and supervisors reviewing on a computer.

### 4.4.3 Trend column (Domain Scoreboard)

Earlier draft language that hid the trend column because Compare would be absent on tablet is **void**.

| State | Tablet class | Desktop |
|-------|--------------|---------|
| Compare = None | Trend column **may hide** (saves horizontal space) — **proposed default** | Same |
| Compare = a prior cycle | Trend column **shows** (existing `sm:table-cell` / equivalent must not hide trend when comparison data is active) | Shows |

Trend remains driven by `previousScores` / compare selection — no change to analytics meaning.

## 4.5 Visibility while scoring (sticky + context)

While scrolling a domain:

- **Primary strip** remains sticky (Submit + save + identity + cycle/workflow + More).
- **Context row** (Compare) is visible at the top of the domain view until the user scrolls it away; change compare cycle by scrolling back up — not via sticky chrome.
- **Domain context bar** sticks below the primary strip (after context row has scrolled away, or below context row when still in view — normal document flow).
- **Domain footer** may remain (**OQ-TT-8 A**); budgets in §5.2.

---

# 5. Scoring surface on tablet portrait

## 5.1 Domain identity while scrolling

**Requirement:** Therapist must always be able to determine **which domain** they are scoring after the static `h2` has scrolled away.

**Mechanism (binding intent):** A **sticky domain context bar** under the assessment primary strip (and under the context row while that row is still in view), containing at minimum: domain title (truncate OK) and optional short progress (“N targets”), plus scale legend per §2.4 / OQ-TT-7. It is **not** a second full header of actions.

**Rejected:** Relying only on memory; repeating domain title only inside each row (too noisy); making the whole DomainScoreboard header sticky with search/filters (too tall).

## 5.2 Vertical sticky budget (1024px-tall viewport)

**Document height assumed under §2.3 Approach C:** last score control ≈ **2999** on the reference 19-target Domain A (vs measured **4499** under T1 reflow, vs **2847** at 36px shared-row). The ≤112px sticky ceiling is absolute, not a fraction of document height. **The ceiling survives** at ~3000: content below sticky+footer remains ≥856 on a 1024-tall viewport. What failed under T1 was **scroll length**, not sticky math. T3 sticky domain bar / legend work should assume **~3000** reference height after Approach C lands (re-measure if the §2.3 acceptance gate fails).

**Only sticky regions** count against the ceiling. The assessment context row is **non-sticky** and is **excluded**.

| Region | Budget (CSS px) | Sticky? | Notes |
|--------|-----------------|---------|-------|
| Assessment primary strip | **≤ 72** | Yes | Single compact row on Tablet; wrap identity only if unavoidable, still ≤ 72 |
| Assessment context row (Compare) | ≤ 48 proposed | **No** | Scrolls away; **0 sticky cost** |
| Domain context bar (`top` = primary strip height) | **≤ 40** | Yes | Title + scale legend compression; verify legend on ABLLS pack |
| **Combined sticky ceiling** | **≤ 112** | — | Leaves **≥ 912** of a 1024px-tall viewport before fixed footer; holds under ~3000 domain document height |
| Domain footer (fixed bottom) | **≤ 56** | Fixed | Prev / Next domain only — secondary styling; **no Submit** (**OQ-TT-8 A** + hierarchy contract §10); content area then ≥ **856** |

If the sticky budget cannot be met, **drop or relocate** search/filter chrome off the sticky stack (filters may live in non-sticky domain chrome that scrolls away) — never grow sticky chrome by stacking search + legend + actions. **Do not** move Compare into the sticky stack to “save a scroll.”

**Interaction with Layout (**OQ-TT-9 — keep normal app navigation**, 2026-08-25):** On Tablet Matrix, keep the **normal app Layout navigation** (compact drawer nav at `< lg`). **No** thin session-only bar and **no** fullscreen Matrix-only chrome.

This does **not** conflict with the sticky budget: **Layout nav must scroll away** (it is not sticky). It must **not** stack as a third sticky region above the primary strip. After the user scrolls, sticky stack = primary strip + domain context bar only (≤112px). Stating both plainly: normal nav is present at page top; sticky scoring chrome does not include it.

## 5.3 Target Detail Modal — tablet treatment

The modal is the therapist’s **in-session clinical reference**. It is in tablet scope.

**Minimum obligations:**

| Item | Rule |
|------|------|
| Hit targets | Close, Prev, Next, score buttons ≥ 44×44 |
| Presentation | Near-full-viewport sheet on Tablet class (usable reading width); avoid tiny centered card with heavy unused margin |
| Notes save | Blur-only save is fragile on touch — add an explicit **Done / Close** path that flushes notes (blur may remain as additional) |
| Scoring | Same `TargetScoreControls` sizing and criterion rules as the matrix |

**Non-goals for the modal:** redesigning clinical field content; making the modal required for scoring.

## 5.4 View control

Matrix “View” must meet a usable hit target on Tablet class (≥ 44px tall tap area, not ~20px text height alone).

---

# 6. Migration and risk

## 6.1 Mechanical vs redesign

| Work | Nature |
|------|--------|
| Raise nav breakpoint `md` → `lg`; drawer Org/Audit; Account panel so Sign Out fits at 1024 | Mostly mechanical |
| Label Back; **44px stands**; **Approach C score track** (tablet) + desktop score-column floor; Login hit targets | Layout redesign after T1 falsification |
| Header → primary + context row + More; New Cycle `approved`-only in More (hierarchy contract) | **Redesign** (IA) |
| Sticky domain bar + scale legend (ABLLS verification) | Redesign; sticky offsets; assumes ~3000 domain height post–Approach C |
| Modal sheet behaviour / Done flush | Moderate redesign |
| Checkbox `TargetScoreControls` path | Unverified until a clinic pack uses checkbox scales |

## 6.2 G4 / G5 — hard fence

Vault **G4 (Display = Export)** and **G5 (Snapshot = Matrix)** remain in force.

- Snapshot and Learner Map are **out of tablet scope**.
- This contract must **not** change bead, cell, evidence-mark, or Snapshot/Learner Map density rendering to “match” Matrix touch sizes.
- Score button sizing applies to **`TargetScoreControls` used by Matrix and Target Detail Modal** only; tablet reserved score track must not alter Snapshot/Learner Map mark geometry.
- Checkbox branch of `TargetScoreControls` is unverified (§2.3.7).
- If an implementation proposal would alter Snapshot/Learner Map mark geometry or export DOM in service of tablet Matrix, **stop** — that is a G4/G5 regression risk for screens this contract does not own.

## 6.3 Regression watchlist

- Submit honesty / disabled reasons still visible when header Submit is disabled.
- Domain footer has **no** Submit (header owns commit); Prev/Next remain secondary.
- Admin paths: Approve, New Cycle (only when approved), exports still reachable via More.
- Compare: selection still loads comparison scores; context row on Tablet **and** Desktop; score save unaffected when compare is None or set.
- Trend column visible when a compare cycle is active.
- Layout drawer: Sign Out still works with Assessment Builder navigation guard when on Packs (out of tablet scope but must not break).
- Layout nav scrolls away on Matrix — not sticky.
- At **1024×768**: Sign Out in-viewport (Account panel); no ~99px page overflow from labeled account cluster.
- After Approach C: Domain A last score control y ≤ **3100** at 768×1024; no one-button-per-row wrap for ordinary numeric scales.

---

# 7. Decision log and remaining questions

## 7.1 Resolved (2026-08-25)

| ID | Resolution | By | Notes |
|----|------------|-----|-------|
| **OQ-TT-1** | **A** — design to measured CSS viewports; no device SKU assumed | SPM accepted | Do not invent iPad |
| **OQ-TT-2** | **A** — touch rules follow coarse pointer; layout chrome follows width | SPM accepted | 1024×768: Desktop chrome + touch scoring rules when coarse |
| **OQ-TT-3** | **A** — nav split at `lg` (1024) | SPM accepted | Sign Out in-viewport at 768; **extended 2026-08-25:** also at 1024 via Account panel (§3.1) |
| **OQ-TT-4** | **Personally assigned** tablets | Founder | Overturns shared posture; **operational assumption about AIM, not a product property** — revisit Sign Out/session if devices become shared (§3.3) |
| **OQ-TT-5** | **Compare stays** on tablet scoring path | Founder | Clinical ABA practice; **not** re-argued. Placement = non-sticky context row (SPM) so §1.3 holds |
| **OQ-TT-6** | **A** — Approve to overflow | SPM accepted | |
| **OQ-TT-7** | **A with wrap** + **ABLLS pack verification before implementation** | SPM accepted | Legend may fail on clinic packs even if fine on short scales |
| **OQ-TT-8** | **A** — keep fixed domain footer for Alpha; revisit if sticky budget fails QA | SPM accepted | |
| **OQ-TT-9** | **Keep normal app navigation** on tablet Matrix | Founder | No thin session bar / fullscreen session; Layout **must scroll away**, not become a third sticky (§5.2) |

## 7.2 Still open / proposed defaults

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **OQ-TT-10** | Login + on-screen keyboard: is native scroll-into-view enough? | A: yes until QA fails · B: custom keyboard avoidance | **A** |
| **OQ-TT-11** | Context row height if Compare UI cannot fit ≤ 48px | A: allow wrap to ≤ 72 non-sticky · B: compact control redesign | **A** — still non-sticky; never steal sticky ceiling |
| **OQ-TT-12** | Hide trend column when Compare = None? | A: hide · B: always show empty trend | **A** |
| **OQ-TT-13** | Is a ~2800–3000px domain document workable for clinical cadence on tablet portrait? | A: accept for Alpha · B: require orientation / domain-chunking work (T3+) · C: other | **Observation only** — 36px baseline was already ≈2847; founder clinical judgement; interacts with T3 |
| **OQ-TT-14** | Approach C acceptance gate: last y ≤ 3100 after layout fix | A: 3100 · B: stricter (≤ 3000) · C: relative (≤ baseline_36 + 10%) | **A** as proposed default; measure, do not re-estimate |
| **OQ-TT-15** | Desktop Account control: menu panel vs icon+aria with separate Sign Out icon | A: single Account menu (recommended in §3.1) · B: two icons with aria-labels only | **A** — visible names inside panel |

---

# 8. What this contract deliberately does not cover

| Topic | Reason |
|-------|--------|
| Report consolidation | Separate contract / round |
| Assessment Builder Phase D | Separate |
| Honesty-surface gaps (Learner Map retry, outer `loadData` TypeError, Report Authoring first-open) | Explicitly excluded |
| Tablet layouts for out-of-scope surfaces | Founder boundary |
| Visual style (colour, type, spacing scale) | Structure and behaviour only |
| Phone layouts (`width < 768`) | Out of scope |
| Implementation prompts / file-level change lists | Non-goal for this task |
| Changing Snapshot / Learner Map mark rendering | G4/G5 fence |

---

# 9. Acceptance checklist (Overseer)

**Tablet class (768 ≤ width < 1024):**

- [ ] Compact nav/drawer at `< lg` (not overflowing desktop nav); Sign Out in-viewport as **normal secondary** control (≥ 44px, visible name in drawer) — not off-canvas
- [ ] Clients and Assessments reachable; out-of-scope routes reachable via secondary entries without dead ends
- [ ] Normal Layout nav present on Matrix and **scrolls away** (not a third sticky)
- [ ] Primary strip: no internal horizontal scroller; **header filled Submit** when legal; save visible while scoring (full hierarchy checklist → header hierarchy contract)
- [ ] Domain footer: Prev/Next **secondary**; **no** footer Submit
- [ ] Non-sticky context row hosts Compare (usable without opening More); does not consume sticky ceiling
- [ ] New Cycle absent unless `approved`; Approve only in More when submitted + role
- [ ] Score buttons ≥ 44×44 (**size stands**); **Approach C** reserved score track — ordinary numeric scales on **one row**; Domain A last score control y ≤ **3100** at 768×1024
- [ ] Criterion text not `title`-only; scale legend verified against a real ABLLS pack (or Model B fallback documented)
- [ ] Domain identity determinable after scroll (sticky domain bar within ≤112px combined sticky ceiling; assume ~3000 domain height)
- [ ] Fixed domain footer retained for Alpha
- [ ] Target Detail usable (sheet, 44px controls, notes flush on Done/Close)
- [ ] One-tap scoring preserved
- [ ] Login: primary actions ≥ 44px; no horizontal scroll; focused field remains operable with on-screen keyboard
- [ ] Trend column available when a compare cycle is selected

**Desktop (width ≥ 1024):**

- [ ] Same three-slot IA (primary + context row + More); reduced sibling clutter
- [ ] Compare in context row (not relocated to header pile or More-only)
- [ ] Admin overflow actions reachable
- [ ] Score column floor: content width ≥ 94 after padding (no T1 wrap cliff); prefer ≥ 244 when space allows
- [ ] **1024×768:** Sign Out in-viewport via Account panel; no horizontal page overflow from account cluster

**G4/G5:**

- [ ] No Snapshot/Learner Map bead/cell geometry changes attributable to this work

**Operational caveat:**

- [ ] Document / runbook notes that personal tablet assignment is an AIM operational assumption; shared devices invalidate §3.3 posture
- [ ] Checkbox `TargetScoreControls` path noted as unverified until a clinic pack uses it

---

# Document history

| Date | Change |
|------|--------|
| 2026-08-25 | Initial tablet & touch viability contract from founder scope statement and QA measurements; verified against Matrix/Layout/score control code |
| 2026-08-25 | Amendment: lock OQ-TT-1…9; personally assigned tablets (§3.3); Compare in non-sticky context row (SPM); keep Layout nav (scrolls away); Login obligations (§3.5); ABLLS legend verification; acceptance checklist updated |
| 2026-08-25 | Amendment: §2.3 falsified (+58% reflow cliff); Approach C reserved score track + predicted y≈2999; 1024 Sign Out width-scoped guarantee; sticky budget assumes ~3000; checkbox path unverified; OQ-TT-13…15 |
| 2026-08-27 | Amendment: matrix header control hierarchy drafted in §4.6–§4.12 (later relocated) |
| 2026-08-29 | Header hierarchy extracted to [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md); founder Submit/New Cycle/document-door corrections; this doc retains Model 3 geometry + touch/chrome only |

---

