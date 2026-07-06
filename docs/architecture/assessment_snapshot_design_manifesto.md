# Assessment Snapshot Design Manifesto

| Field | Value |
|-------|--------|
| **Document type** | Design manifesto (governing philosophy) |
| **Feature** | Assessment Snapshot |
| **Status** | Architectural foundation — governs Concept 11 and layout-adaptive presentation |
| **Supersedes as guide** | Any single Concept Lab prototype as “the answer” |
| **Related** | [`assessment_snapshot_v1_specification.md`](../product/assessment_snapshot_v1_specification.md) · [`assessment_snapshot_architecture_review.md`](./assessment_snapshot_architecture_review.md) · Learner Map export docs |
| **Audience** | SPM, product, design, Builder, Overseer, QA |

This document is **not** a specification. It does not authorize implementation, prescribe components, or select a Concept Lab mockup. It defines the **design philosophy** that every future Snapshot implementation must obey.

---

## 1. Purpose of This Manifesto

Evalis explored Assessment Snapshot through three phases:

| Phase | Outcome |
|-------|---------|
| **PR11.1** | Foundation grid — targets × cycles. Technically correct. Too spreadsheet-like. |
| **PR11.2** | Five reference concepts (Table, Skill Barcode, Domain Skill Towers, Cycle Ribbons, Assessment Terrain) |
| **PR11.3** | Five exploration concepts (Domain Threads, Skill Timeline, Domain Canvases, Target Glyphs, Signature / Meridian) |

**None of these is the final answer.**

They are **fossils of inquiry** — each discovered something true about how clinicians read assessment evidence. Subsequent review of **Target Threads V1**, QA feedback, and **assessment structure research** (ABLLS, VB-MAPP, AFLS, PEAK, ESDM, flat custom uploads) refined how the record must scale. This manifesto extracts what survives, what dies, and what combines into **Concept 11**: a synthesis geometry and visual language that is Evalis-native, evidence-only, scalable, and **layout-adaptive but data-invariant**.

**Implementation is paused** until this philosophy is adopted by SPM.

---

## 2. Core Product Goal (Immutable)

Assessment Snapshot exists to replace external assessment visuals clinicians still maintain outside Evalis:

- ABLLS grids  
- VB-MAPP visual scoring sheets  
- AFLS paper trackers  
- PEAK matrices  

…**without copying their visual expression.**

### Snapshot must communicate

- Raw evidence  
- Every target  
- Every cycle  
- Exact score (or scale-appropriate label)  
- Competency color (Layer 0 semantics)  
- Assessment structure (groups, sequence, hierarchy when pack provides it)  

### Snapshot must NOT communicate

- Movement  
- Coverage  
- Interpretation  
- Summaries  
- Recommendations  
- Analytics  
- Treatment planning  

That is **Learner Map** — forever.

### The two-question split

| Artifact | Question |
|----------|----------|
| **Assessment Snapshot** | *What happened?* |
| **Learner Map** | *What does it mean?* |

### The governing presentation principle

**Assessment Snapshot should be layout-adaptive but data-invariant.**

| Invariant (data) | Adaptive (presentation) |
|----------------|-------------------------|
| Assessment structure as authored in the pack | Domain packing (horizontal vs vertical) |
| Target order | Domains per row |
| Exact scores and competency states | Visual splitting of oversized groups |
| Cycle history | Print pagination |
| Pack hierarchy | Layout tiers for screen vs print |

**Meaning:** The assessment data remains exactly as authored. The Snapshot presentation may adapt to improve readability. Presentation changes must **never** alter clinical meaning.

---

## 3. First Principles

Forget every existing assessment product. If visualization had never been invented, what would we build from clinical need alone?

### 3.1 What is being recorded?

A clinician repeatedly observes **target performances** across **administrations** (cycles), organized within an **assessment structure** (groups, domains, levels, modules).

The record is not a chart. It is a **longitudinal evidence ledger**.

### 3.2 What is the smallest *data* object?

**One scored observation:** a target at one cycle — score value, competency state, scored vs unscored.

This is below what the eye should parse as a standalone graphic. It is the **Evidence Mark**.

### 3.3 What is the smallest *visual* object?

**One target’s cycle history** — the contiguous sequence of Evidence Marks for a single target, in cycle order.

Call this the **History Strip**.

The strip is the unit of **comparison** (target vs target within a group) and **verification** (read one skill across time).

### 3.4 What deserves visual identity?

| Entity | Deserves identity? | Why |
|--------|-------------------|-----|
| Evidence Mark | Implicit (color + score) | Too small to brand; must be legible |
| History Strip | **Yes** | One skill’s longitudinal record |
| Target | **Yes** (via strip + label) | Clinical unit of mastery tracking |
| Domain / primary group | **Yes** | Structural chapter of the assessment |
| Secondary group | **Yes** (when present) | VB-MAPP Level, PEAK Module, etc. |
| Cycle | **Yes** (as column/time position) | Administration anchor |
| Whole assessment | **Yes** (as continuous record) | The artifact itself |

### 3.5 What does NOT deserve decorative identity?

- Movement arrows  
- Summary tiles  
- Dashboard cards  
- Abstract metaphors (terrain elevation, random canvas packing, decorative threads)  
- Publisher page aesthetics  

---

## 4. Concept Excavation

For each explored concept: fundamental discovery, what survives, what dies, structural limits, contribution to Concept 11.

**Do not rank.** Extract principles.

---

### 4.1 Table Baseline (PR11.1 / PR11.2)

**Fundamental idea discovered:**  
The **matrix truth** — targets and cycles are orthogonal dimensions; clinicians verify evidence by locating a row and reading across time.

**What survives:**  
- Pack-ordered target sequence within groups  
- Cycles in chronological order  
- Exact scores visible in cells  
- Domain sectioning  
- Targets-as-rows, cycles-as-columns reading habit  

**What dies:**  
- Spreadsheet chrome as the *identity* of Snapshot (gridlines, table borders, Excel affordances)  
- Table-as-metaphor for the whole artifact  

**Structural limitations:**  
At hundreds of targets, a literal table feels like export dump — correct data, wrong *artifact soul*. Print pagination fights wide matrices.

**Contributes to Concept 11:**  
**Evidence Mark** data model and **History Strip** reading direction (left = earlier, right = later). Not the table frame.

---

### 4.2 Skill Barcode

**Fundamental idea discovered:**  
A target’s full cycle history can be a **single horizontal strip** — one glance along the strip answers “how has this target changed?” without row/column grid language.

**What survives:**  
- **History Strip** as primary target visualization  
- Left-to-right = time  
- Color density enables vertical scan across many targets  
- Extreme horizontal compactness  

**What dies:**  
- Barcode as literal metaphor (bars without scores at default density)  
- Strip without target name anchor  

**Structural limitations:**  
Many cycles widen strips; many targets lengthen page. Still better than spreadsheet identity.

**Contributes to Concept 11:**  
**History Strip** is the atomic *visual* unit. Concept 11 is barcode-informed, not barcode-limited.

---

### 4.3 Domain Skill Towers

**Fundamental idea discovered:**  
**Domain as a bounded visual object** — a clinician can recognize “this section of the assessment” by silhouette before reading individual targets.

**What survives:**  
- Domain **zone** with clear boundary  
- Vertical stacking of targets inside zone (pack order)  
- Comparing domain *shapes* (color mass) at a distance  

**What dies:**  
- Card/tower chrome that consumes whitespace  
- Color-only strips inside towers without scores at default zoom  
- Multi-column tower grid as primary layout (fragments the continuous record)  

**Structural limitations:**  
Many domains × many targets → tower farm feels like dashboard widgets, not one record.

**Contributes to Concept 11:**  
**Domain Zone** — bounded chapter, not decorative card.

---

### 4.4 Cycle Ribbons

**Fundamental idea discovered:**  
**Cycle as a frozen slice** — one administration’s full assessment state is a meaningful object for comparing “then vs now” holistically.

**What survives:**  
- Cycle labels and dates as first-class headers  
- The insight that cycles are **administrations**, not just columns  

**What dies:**  
- Cycle-primary layout for Snapshot (ribbons as main geometry)  
- Wrapping target cells per domain inside each ribbon (loses target history strip)  

**Structural limitations:**  
Cycle-primary geometry inverts the clinical habit of tracking **skills over time**; it optimizes comparing whole snapshots, which is Learner Map / supervision thinking.

**Contributes to Concept 11:**  
Cycle headers annotate the History Strip axis. Cycle ribbons do **not** become the organizing geometry.

---

### 4.5 Assessment Terrain

**Fundamental idea discovered:**  
**Per-target micro-stack** — multiple cycles can live inside one compact vertical stack at the target locus, creating a “elevation” of history without a wide matrix.

**What survives:**  
- Encoding multiple cycles **inside** the target’s visual footprint when horizontal space is scarce  
- Domain as **region** (grouping field)  

**What dies:**  
- Map/terrain metaphor (elevation, gradients, landscape language)  
- Wrapping targets in arbitrary spatial packs  
- Color-only stacks without score text at default evidence density  

**Structural limitations:**  
Vertical cycle stacks sacrifice left-to-right time scanning; useful as **compression mode**, not primary language.

**Contributes to Concept 11:**  
Optional **compressed mark** variant inside Evidence Mark stack for print/HTML narrow modes — not the default reading pattern.

---

### 4.6 Domain Threads

**Fundamental idea discovered:**  
A domain is a **continuous sequence** — targets are ordered nodes along a shared spine; the domain has narrative direction.

**What survives:**  
- Domain **spine** — one vertical through-line for pack order  
- Targets as **nodes** on the spine (not floating shapes)  
- Sequential reading top-to-bottom within domain  

**What dies:**  
- Literal thread/knot decoration  
- Ornamental spine graphics that consume horizontal space  

**Structural limitations:**  
Pure thread aesthetics don’t add evidence; they risk looking illustrative rather than archival.

**Contributes to Concept 11:**  
**Domain Zone** includes an implicit **sequence spine** — order is structural, not decorative.

---

### 4.7 Skill Timeline

**Fundamental idea discovered:**  
**Time is the primary axis of a target’s story** — chronology should be explicit, not implied.

**What survives:**  
- Left-to-right chronology within History Strip  
- Cycle tick labels on the strip axis  
- Event-node mental model (each cycle = observation event)  

**What dies:**  
- Timeline as separate geometry from strip (redundant)  
- Large node circles that waste density  

**Structural limitations:**  
“Timeline” as a label suggests analytics; Snapshot strips are **records**, not events dashboards.

**Contributes to Concept 11:**  
History Strip **is** the timeline. No second timeline layer.

---

### 4.8 Domain Canvases

**Fundamental idea discovered:**  
Domains can feel like **bounded territories** rather than table sections.

**What survives:**  
- Bounded territory **without** grid coordinates  
- Domain title as territory label  

**What dies:**  
- Random/organic packing of targets (destroys pack order scan)  
- Playful offset positioning  
- Circles without strip discipline  

**Structural limitations:**  
Spatial packing does not scale to 70 targets per domain; order becomes unrecoverable.

**Contributes to Concept 11:**  
**Reject** spatial packing. Retain **zone boundary** only.

---

### 4.9 Target Glyphs

**Fundamental idea discovered:**  
**One emblem per target** — all cycles encoded in a single compact symbol; the page becomes a **field of targets**.

**What survives:**  
- Target as singular visual token  
- Internal micro-grid of cycle marks inside glyph  
- Glyph field enables texture scan (“how much green in this domain?”)  

**What dies:**  
- Hiding scores inside glyphs at normal density  
- Glyphs without text labels (unusable at ABLLS scale)  
- Glyph as cartoon identity  

**Structural limitations:**  
Micro-glyphs become unreadable past ~4 cycles without enlargement or tooltip dependence.

**Contributes to Concept 11:**  
**History Strip** may be **glyph-compact** (marks touching, minimal padding) but not **glyph-opaque** (scores hidden). The glyph is a compression of the strip, not a replacement for evidence.

---

### 4.10 Signature Exploration (Evalis Meridian)

**Fundamental idea discovered:**  
**One continuous assessment record** with **domain zones** placed along a shared longitudinal axis — an Evalis-native form that is not a spreadsheet and not a publisher grid.

**What survives:**  
- **Continuous record** metaphor (one artifact, not disconnected widgets)  
- **Domain zones** along a shared axis (Meridian as structural idea, not branding)  
- Evalis-owned layout grammar  

**What dies:**  
- “Meridian” as mandatory brand metaphor  
- Alternating pulse directions as decorative noise  
- Zone color rainbow unrelated to competency semantics  

**Structural limitations:**  
Highly art-directed layouts are hard to print predictably; symbolism must not obscure scores.

**Contributes to Concept 11:**  
**The Evalis Record** — single continuous document, domain zones in pack order, targets as pulses/strips crossing the record axis. This is the closest raw exploration to Evalis identity.

---

## 5. Design Philosophy

### 5.1 What should the eye notice first?

**Order of attention:**

1. **Assessment identity** — this is a formal evidence record (learner, pack, cycles)  
2. **Domain zone boundaries** — where am I in the assessment structure?  
3. **Color texture across History Strips** — rough competence shape within a zone  
4. **Individual Evidence Marks** — exact score verification  

The eye should **not** notice movement, percentages, or summary tiles — those belong to Learner Map.

### 5.2 What is the atomic visual unit?

| Layer | Name | Role |
|-------|------|------|
| Data atom | **Evidence Mark** | One target × one cycle: score + competency color + unscored state |
| Visual atom | **History Strip** | Ordered sequence of Evidence Marks for one target |
| Structural unit | **Domain Zone** | Ordered stack of History Strips (plus future secondary grouping) |
| Document unit | **The Evalis Record** | Continuous longitudinal artifact of all zones |

Not a cell in a spreadsheet.  
Not a dashboard tile.  
Not a chart.

### 5.3 Should domains become visual objects?

**Yes — as zones, not metaphors.**

A Domain Zone is:

- A **labeled boundary** in pack sequence  
- A **vertical stack** of History Strips inside the zone (target order preserved)  
- A **color field** scannable at arm’s length  
- **Never abstract** — always titled with the pack’s group name (Domain, Level, Module, etc.)

Multiple Domain Zones may appear **side-by-side** when width allows (§5.8). That is adaptive **packing** of zones — not disconnected dashboard cards or tower widgets.

Secondary groups (future builder) nest **inside** or **above** zones — never replace target order.

### 5.4 How should cycles be encoded?

**Primary:** horizontal position on the History Strip (left → right, chronological).

**Secondary encoding (supporting only):**

- Cycle number/date in strip header row (zone-level or record-level)  
- Mark border or tick for cycle boundary  
- **Not** cycle ribbons as primary layout  
- **Not** vertical stacks as default (compression mode only)

Cycles are **time columns** on each strip, not the organizing dimension of the whole page.

### 5.5 Should exact scores always remain visible?

**Yes — at default Snapshot density.**

| Mode | Score visibility | Color role |
|------|------------------|------------|
| **Default (evidence)** | Score text in every Evidence Mark | Reinforces band; grayscale-safe pairing |
| **Compact (print/HTML tight)** | Score text preserved; padding reduced | Color still paired with text |
| **Archive micro** (future, optional) | Score on hover/focus only | **Not** V1; conflicts with “raw evidence” if default |

**Rule:** Color never **replaces** score in the default artifact. Color **accelerates** scan; score **confirms** evidence.

Tooltips are acceptable for **metadata** (cycle date, full target title when truncated) — not for hiding the score.

### 5.6 What makes a visualization memorable?

#### Why publisher grids became iconic

| Factor | Universal lesson | Ignore |
|--------|------------------|--------|
| **Complete** — every skill listed | Full assessment coverage is non-negotiable | Publisher-specific numbering |
| **Dense** — one page holds hundreds of skills | Density is a feature, not a bug | Cramped proprietary fonts |
| **Structured** — domains chunk the list | Group boundaries aid memory | Exact ABLLS section artwork |
| **Repeatable** — same layout every time | Consistent Evalis grammar builds recognition | Copying their layout |
| **Editable history** — penciled updates over time | Longitudinal columns/strips match reassessment habit | Paper-only affordances |
| **Color + number** — quick scan and verification | Dual encoding | Publisher color keys |

#### What Evalis should become iconic for

**The Evalis Record** — a continuous, assessment-agnostic **evidence document** where every skill is a **History Strip** and every administration is an **Evidence Mark**, grouped into **Domain Zones** with uncompromising score visibility and zero interpretive noise.

Memorable because it is **complete, dense, structured, and honest** — not because it looks like someone else’s grid.

### 5.7 Presentation ≠ Assessment Structure

**The Builder defines assessment structure. The Snapshot defines visual presentation.**

| Snapshot may | Snapshot may NOT |
|--------------|------------------|
| Wrap domains across rows | Change assessment data |
| Calculate domains per row from available width | Create real domains or subdomains in the pack |
| Split oversized groups **visually** (presentation factoring) | Modify target order |
| Paginate for print | Rewrite pack hierarchy |
| Apply layout tiers (screen vs print) | Imply clinical subdomains that were not authored |

**Example (presentation-only):**

If a pack contains:

```text
PEAK DT Module
  Targets 1–184
```

Snapshot may render:

```text
PEAK DT Module
  Part 1 · Targets 1–46
  Part 2 · Targets 47–92
  Part 3 · Targets 93–138
  Part 4 · Targets 139–184
```

These **Part** labels are **display sections** — not real subdomains. The underlying group remains one authored module; target order, scores, and cycle history are unchanged.

### 5.8 Adaptive Layout Engine

Snapshot must **not** rely on fixed assumptions such as:

- Fixed number of domains per row  
- Fixed maximum targets per domain  
- Fixed print layout for all assessments  

Layout should adapt based on:

| Input | Effect on layout |
|-------|------------------|
| Number of cycles | Wider strips → fewer domains side-by-side |
| Number of domains | More rows as needed |
| Targets per domain | May trigger presentation factoring (§5.9) |
| Available width | Screen vs print column budget |
| Context | Screen scroll vs print pagination |

**Rule:** The number of domains shown side-by-side is determined by **available width and domain width**, not a hard-coded count.

**Examples:**

- **1 cycle** may allow 8–10 narrow domain zones per row.  
- **5 cycles** may allow fewer domains per row.  
- More rows are added as needed — the record grows vertically before it sacrifices evidence density.

### 5.9 Presentation Factoring

**Presentation factoring** is the visual splitting of an oversized grouping into multiple **display sections** without changing the underlying assessment structure.

Use when a single authored group contains too many targets for readable display in one zone.

| Category | Typical target count | Notes |
|----------|---------------------|-------|
| **Typical group** | 20–60 | Natural ABLLS-style domains; VB-MAPP / ESDM groupings often fit here |
| **Large group** | 80–120 | Stress case; factoring likely for print |
| **Extreme group** | 180–250+ | PEAK modules, flat AFLS protocols, large custom uploads |

**Research note:** ABLLS Domain C (~57 targets) is **not** the true stress ceiling. PEAK modules can reach **~184 items** in one module; future custom assessments may place **180–250+ targets** in a single flat group. Snapshot must remain robust when clinics upload **poorly factored or flat** assessments.

Presentation factoring is especially important for:

- PEAK modules  
- Flat AFLS protocols  
- Large custom domains  

**Must preserve:** original group name, target order, exact scores, cycle history, competency color.

**Factoring labels must be neutral** — e.g. *Part 1*, *Part 2*, *Targets 1–50*, *Targets 51–100*. Avoid language that implies clinical interpretation or authored subdomains.

### 5.10 Builder Guidance vs Snapshot Adaptation

**Future Builder behavior (recommended):** If a clinician uploads a very large group, Evalis should eventually **recommend factoring in the Builder** — not force it.

Example warning:

> *This grouping contains 184 targets. Large groupings may reduce readability in exports. Consider creating subgroups for easier review. Evalis can still export this as-is.*

The clinic may **ignore** this warning. Snapshot must still render the assessment **safely**.

For print/export, Snapshot may **automatically apply presentation factoring** even when the assessment was authored flat. That adaptation is presentation-only (§5.7).

### 5.11 Secondary Grouping Future

Future Builder enhancements should **reduce** the need for presentation factoring:

- Optional secondary grouping  
- Configurable structural labels (levels, age bands, modules, subdomains)  

**Snapshot must not wait** for those enhancements. **Snapshot V1 must handle flat groups gracefully** using presentation factoring and adaptive layout.

---

## 6. Product Identity

Ten years from now, a clinician should think:

> **“This is the Evalis evidence record.”**

### Evalis Snapshot principles (identity)

1. **Record, not report** — archival evidence, not narrative document  
2. **Strip, not spreadsheet** — History Strips, not Excel grid identity  
3. **Zone, not card** — structural domains, not dashboard widgets  
4. **Mark, not metric** — each cell is evidence, not a KPI  
5. **Complete** — every target, every cycle, no sampling  
6. **Exact** — scores visible; unscored explicit  
7. **Silent** — no movement, no summaries, no advice  
8. **Shared palette** — Layer 0 competency colors match in-app scoring  
9. **Continuous** — one document flow, not detached panels  
10. **Agnostic** — structure from pack, not from publisher mimicry  
11. **Adaptive** — layout responds to cycles, width, and group size; data does not  

### Anti-identity (never say or imply)

- “It looks like ABLLS”  
- “It looks like Excel”  
- “It’s the Learner Map appendix”  
- “It’s a dashboard”  
- “It shows progress” (progress = interpretation)  

---

## 7. Long-Term Scalability

The philosophy must hold for ABLLS, VB-MAPP, AFLS, PEAK, ESDM, and unknown future packs — including **flat or poorly factored uploads**.

### Assessment structure research (layout stress)

| Framework | Typical grouping | Stress note |
|-----------|-------------------|-------------|
| **ABLLS** | Domains ~20–60 targets | Domain C (~57) is large but not the ceiling |
| **VB-MAPP** | Level → Domain → Milestone | Generally fits smaller natural groupings |
| **ESDM** | Age Band → Domain → Item | Generally manageable group sizes |
| **AFLS** | Skill areas usually manageable | **Full protocols uploaded flat** can become very large |
| **PEAK** | Module → Program | **Single module ~184 items** possible |
| **Custom** | Clinic-defined | **180–250+ targets in one group** possible |

Snapshot must remain robust when structure is flat; it must **not** rewrite the pack to fix upload quality.

### Large-assessment design requirement

Assessment Snapshot must remain **clinically usable** when a single authored group contains **at least 250 targets**.

This does **not** mean everything must fit on one page. It means:

- Target order remains clear  
- Visual factoring remains clear  
- History Strip readability remains acceptable  
- Print pagination remains predictable  
- HTML scrolling remains usable  

| Challenge | Philosophical answer |
|-----------|---------------------|
| **Hundreds of targets in one group** | Presentation factoring (§5.9); neutral Part labels; pack order preserved |
| **Hundreds of targets across many domains** | Adaptive domain packing (§5.8); Domain Zones chunk the record; History Strips compress horizontally before scores disappear |
| **Dozens of cycles** | Strip grows horizontally; fewer domains per row; optional cycle-range export later — philosophy unchanged |
| **Secondary grouping** | Zones nest: Primary → Secondary → strips (builder hierarchy maps to zone nesting); reduces factoring need |
| **Variable scales** | Evidence Mark shows `displayScoreWithMax` — interpretation per target, not per layout |
| **Non-numeric scales** | Mark shows label text; same strip geometry |
| **HTML sharing** | Continuous record maps to single scrollable document; inline styles; strips are DOM-stable |
| **Printing** | Zone page breaks; presentation factoring; strip column splits mid-history only with continuation labels — never drop marks |
| **Framework labels** | Zone titles use pack-configured group names — not hard-coded “Domain” |

Structural gaps (builder secondary groups) are **data problems** addressed by Builder guidance (§5.10) and **presentation adaptation** — not reasons to fork visualization philosophy or mutate pack data.

---

## 8. Relationship to Learner Map

### Complementary forever

| | Snapshot | Learner Map |
|--|----------|-------------|
| **Verb** | Record | Interpret |
| **Geometry** | History Strips in Domain Zones | L1 domain competency table |
| **Movement** | Absent | Central |
| **Coverage %** | Absent | Present |
| **Distribution bars** | Absent | Present |
| **Default export** | Full evidence record | Supervision summary (Standard) |
| **Orientation** | Target history horizontal | Appendix may use cycle-rows for supervision compactness |
| **Audience** | “Show me the scores” | “Should I sign off?” |

### Workflow pairing

1. Clinician scores in Matrix / Scoreboard  
2. Clinician opens **Snapshot** to verify complete evidence across cycles  
3. Supervisor opens **Learner Map** to review competency and movement  
4. Formal single-cycle record may still use **Assessment Data Report** until integration decision  

**Never merge** Snapshot and Learner Map into one export toggle without mode clarity.

---

## 9. Concept 11 — The Synthesis

Concept 11 has no mockup. It has a **design philosophy** and **organizing geometry** sufficient for Builder to invent the correct implementation.

### 9.1 Name (working)

**The Evalis Record** — Assessment Snapshot Concept 11.

### 9.2 Organizing geometry

One **continuous longitudinal document** divided into **Domain Zones** (pack-ordered primary groups; secondary groups nest when available).

**Layout-adaptive packing:** Domain Zones may arrange **horizontally or vertically** depending on available width, cycle count, print mode, and target volume. The Evalis Record is not locked to a single vertical stack of full-width zones. Multiple zones may appear **side-by-side** when width allows; additional rows are added as needed (§5.8).

**Invariant across layouts:** pack order, target order within each zone, visual continuity of History Strips, evidence-only semantics.

Within each zone (or presentation-factored **Part** of a zone):

- Targets appear as a **vertical sequence** (pack order = clinical sequence).  
- Each target is one **History Strip** — a horizontal sequence of **Evidence Marks**.  
- Each Evidence Mark = one cycle’s score for that target.

Global cycle order is **left-to-right** on every strip.  
Zone headers carry group identity (and neutral Part labels when factored).  
A record-level cycle axis (numbers/dates) aligns marks across strips.

**Not a table.** Strips are separated by whitespace and typographic rhythm, not spreadsheet gridlines.  
**Not ribbons.** Cycles are not the primary rows of the document.  
**Not canvas.** Targets are not spatially packed.  
**Not meridian art.** The continuous axis is structural, not decorative.  
**Not fixed layout.** Domain count per row is computed, not hard-coded.

### 9.3 Visual language

| Element | Language |
|---------|----------|
| Evidence Mark | Small rectangular mark: competency fill + score text (or unscored em dash) |
| History Strip | Horizontal run of marks; fixed mark width at default density; strip length = f(cycles) |
| Target label | Left anchor text (truncation allowed; full title in metadata/tooltip/index) |
| Domain Zone | Strong horizontal rule or band start; group title; optional secondary sub-zone |
| Record header | Compact identity block: learner, assessment, pack, cycle range, generated date, minimal legend |
| Legend | One line: four competency bands + unscored — Layer 0 labels |
| Color | Layer 0 `STATE_BUCKET_DISPLAY` semantics only — no zone rainbow |
| Typography | Monospace or tabular nums for scores; sans for labels; dense, print-safe sizes |

### 9.4 Reading pattern

**Primary scan (supervisor at distance):**  
Zone → color texture across strips → where are unscored gaps?

**Secondary scan (clinician at desk):**  
Target label → read strip left-to-right → verify exact scores per cycle

**Tertiary (audit):**  
Cross-reference target index if labels truncated; confirm cycle dates on axis

**Never invited:** compute movement, compare percentages, infer treatment priority.

### 9.5 Information hierarchy

```
Evalis Record
├── Record Header (identity + disclaimer + legend)
├── [Adaptive row — domains packed by width / cycles / print mode]
│   ├── Domain Zone A (or Zone A · Part 1 if factored)
│   │   ├── [optional Secondary Group]
│   │   │   ├── Target 1 — History Strip [mark₁][mark₂][mark₃]…
│   │   │   ├── Target 2 — History Strip
│   │   │   └── …
│   │   └── …
│   ├── Domain Zone B (may sit beside A when width allows)
│   │   └── …
│   └── …
├── [Additional rows as needed]
└── Record Footer (Evalis · mode · timestamp)
```

### 9.6 Philosophy inherited

| From | Inherited principle |
|------|---------------------|
| Table | Orthogonal truth; scores visible; pack order |
| Skill Barcode | History Strip as target unit |
| Towers | Domain Zone bounded chapters |
| Ribbons | Cycle as administration (headers only) |
| Terrain | Optional vertical compression inside mark (non-default) |
| Threads | Sequential spine within zone |
| Timeline | Chronological strip axis |
| Canvases | Zone territory (not spatial pack) |
| Glyphs | Compact mark tiling inside strip |
| Meridian | Continuous Evalis Record with zoned axis |
| Layout research | Adaptive packing; presentation factoring; flat-upload resilience |

### 9.7 Philosophy intentionally rejected

| Rejected | Why |
|----------|-----|
| Spreadsheet as identity | PR11.1 failure mode |
| Cycle-primary layout | Supervision comparison, not evidence ledger |
| Spatial target packing | Destroys order at scale |
| Terrain / landscape metaphor | Abstract, not archival |
| Decorative threads / pulses | Ornament without evidence |
| Color-only marks | Fails raw evidence rule |
| Movement glyphs | Learner Map boundary |
| Summary analytics | Learner Map boundary |
| Publisher layout mimicry | IP and identity risk |
| Fixed domains-per-row layout | Fails PEAK / flat custom stress cases |
| Mutating pack structure at render time | Violates data-invariant rule |

### 9.8 Builder guidance (without UI prescription)

Builder’s next invention should:

1. Implement **Evidence Mark** and **History Strip** as composable primitives — not `<table>` as the conceptual root.  
2. Implement **Domain Zone** as document sectioning — not cards grid.  
3. Preserve **AssessmentSnapshotProfile** / shared normalization — no forked scoring.  
4. Prove **large mock** remains scannable without spreadsheet chrome — include at least one **extreme group (180+ targets)** and one **multi-domain adaptive row** scenario.  
5. Implement **layout-adaptive packing** and **presentation factoring** per §5.7–§5.9 — data-invariant only.  
6. Treat HTML export as the **canonical render target** — print CSS follows, not leads.  
7. Ask of every pixel: *“Does this add evidence, structure, or identity?”* If none, delete it.  

Builder should **not** copy any single Concept Lab file as Concept 11. They should implement the philosophy above.

---

## 10. Governing Rules (Checklist)

Before any Snapshot PR merges, verify:

- [ ] Every target appears  
- [ ] Every cycle appears for every target (mark or explicit unscored)  
- [ ] Exact scores visible at default density  
- [ ] No movement indicators  
- [ ] No coverage percentages  
- [ ] No distribution bars or rollups  
- [ ] No narrative interpretation  
- [ ] Domain structure visible  
- [ ] Pack order preserved  
- [ ] Target order preserved within groups (including across presentation Parts)  
- [ ] Presentation factoring uses neutral labels only — no implied subdomains  
- [ ] Layout adapts to cycles / width — no hard-coded domains-per-row  
- [ ] Single group ≥250 targets remains usable (scroll/print/factor — not one-page mandate)  
- [ ] Renderer does not mutate assessment data or hierarchy  
- [ ] Layer 0 competency colors  
- [ ] Distinguishable from Learner Map at a glance  
- [ ] Does not require login to read exported HTML (when export ships)  
- [ ] PHI handling documented before production sharing  

---

## 11. Document Stewardship

| Event | Action |
|-------|--------|
| Concept Lab experiments | Archive; do not treat as product direction |
| PR11.1 Table implementation | Reference data path only; not visual target |
| Builder starts Concept 11 | Read this manifesto first; architecture review references this doc |
| SPM approves implementation | Cite this manifesto in PR description |
| Future builder hierarchy | Update §5.11, §7 — geometry unchanged; factoring need may decrease |
| Presentation factoring thresholds | Tune per QA; SPM approves default Part sizes |

---

## 12. Final Statement

Assessment Snapshot is not a grid.  
It is not a dashboard.  
It is not a chart.

It is **the Evalis Record** — a complete, dense, assessment-agnostic **ledger of what was scored, when, for every target**, organized into **Domain Zones** (layout-adaptive, presentation-factored when needed) and expressed as **History Strips** of **Evidence Marks**.

The record is **layout-adaptive but data-invariant**: presentation may split, pack, and paginate; the assessment as authored never changes.

Concept 11 is the synthesis of ten explorations, one spreadsheet failure, and large-assessment layout research.

**Build the record. Not the grid.**

---

_Assessment Snapshot Design Manifesto — governing philosophy for Concept 11 (layout-adaptive, data-invariant). No application code. No mockups._
