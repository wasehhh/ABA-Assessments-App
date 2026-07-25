# Assessment Snapshot Print QA

Manual checks for Chrome Print Preview on:

- **Production route:** `#/assessment/:assessmentId/snapshot` (PR13.5+)
- **Dev preview:** `#/dev/assessment-snapshot` (stress fixtures when production data is unavailable)

## Fixtures to exercise

| Fixture / assessment | What it stresses |
| --- | --- |
| Flat clinical assessment | Domain packing + measured container width |
| Grouped VB-MAPP-like | Level chapters + child Domain zones |
| PEAK / large flat | Print domain segments + page composition |
| Alpha Small (dev) | 3 domains · 10 targets each · 2 cycles |
| ABLLS-like (dev) | 15 domains · 40 targets each · 4 cycles |
| VB-MAPP-like (dev) | 3 levels · 6–7 domains each · 3 cycles |
| PEAK 184 (dev) | 1 group · 184 targets · 3 cycles |
| AFLS Flat (dev) | 1 group · 205 targets · 2 cycles |
| Extreme 250 (dev) | 1 group · 250 targets · 6 cycles |

## Steps

1. Open production Snapshot from the assessment Matrix (**View Assessment Snapshot**), or open the DEV preview and select **Target Threads V1**.
2. Load each assessment/fixture above.
3. Open **Print Preview** (⌘P / Ctrl+P) in Chrome.
4. Enable **Background graphics** so competency bead colors print.
5. Check **Letter** and, where practical, **A4**.

## Verify on every fixture

- [ ] Print preview shows the **print-only** tree (`PrintRenderPlan` / domain segments), not the screen layout.
- [ ] Application chrome (nav, back link, Print button) and DEV chrome (amber banner, scenario buttons) are **hidden** in print.
- [ ] **No clipped beads** — evidence beads and max rings stay inside their columns.
- [ ] **No missing targets** — target count in headers matches authored pack size.
- [ ] **No missing cycles** — every thread row has one bead per cycle; cycle headers show `C1`, `C2`, … with dates when available.
- [ ] **No page-break corruption** — target threads are not split across pages.
- [ ] **No orphaned headings** — domain segment headers stay with their target rows.
- [ ] **Colors preserved** — competency fill colors visible with background graphics on.
- [ ] **Domain identity** on continuations: repeated title, `Targets X–Y`, quiet `· continued` (and `(n/m)` when multi-segment).

## Alpha Small (alignment — PR13.3B)

- [ ] Flat domains remain **horizontally packed** (not full-width chapters).
- [ ] All domain **cycle headers align** across the row.
- [ ] All **first target threads align** despite long titles wrapping inside a fixed title band.
- [ ] **Arrowheads** are filled and clearly separated from max rings.
- [ ] Bead centers and max rings align column-to-column.

## VB-MAPP-like (chapter topology — PR13.3B)

- [ ] **Level 1** is a full-width chapter header spanning the document.
- [ ] Multiple **Domain** zones pack horizontally **beneath** Level 1 (Mand, Tact, Listener Responding, …).
- [ ] **Level 2** begins farther down as a new full-width chapter — never beside Level 1.
- [ ] **Level 3** follows the same pattern.
- [ ] Hierarchy reads as **Level (chapter) → Domain (zone) → Milestone (thread)**.
- [ ] Child zones from different Levels never appear mixed in one row.

## Large-assessment focus (PEAK 184, AFLS Flat, Extreme 250)

- [ ] Print **domain segments** flow across adjacent columns before new pages.
- [ ] Target order matches authored pack order across all segments.
- [ ] Secondary groups (VB-MAPP-like only) stay under the correct Level chapter.

## Target labels and scales

- [ ] Short codes (`A1`, `ECHO_12`, `P47`) are the **only** visible row identity (no title/description under the code).
- [ ] Full target title remains on tooltip / `aria-label` (`A1 — …`).
- [ ] Domain cycle axes show `C1` / `C2` / … / `max` only — no dates under cycles.
- [ ] Document **Cycle reference** lists each cycle once with its date (or `Date unavailable`).
- [ ] Yes/no, 0–2, 0–4, and labeled numeric scales render compact bead text; full score remains in bead `aria-label` / title on screen.

## Print density and geometry (PR13.6A)

- [ ] Print rows are ~15–20% tighter than screen (more targets per page) without collisions.
- [ ] Target code and bead sequence read as one unit (`A1   ● ● → ○`), including long IDs (`AFLS_205`, `L1-LR-1`).
- [ ] Maximum ring vertical center aligns with evidence beads; arrow remains; arrow→max gap stays visible (~4–6px).
- [ ] Hollow **green** maximum outline is visible in print/PDF (not pale gray). Mastered beads stay solid green.
- [ ] Header / Cycle Reference / legend / body spacing reclaim excess space without feeling spreadsheet-dense.
- [ ] See PR13.6C for clinical footer / page chrome (supersedes the “footer not redesigned” note from 13.6A).

## Print page composition engine (PR13.6B — explicit PrintRenderPlan)

Print now uses an **explicit page-composition engine** instead of stacking vertical Parts and letting CSS invent breaks. Two new pure modules build a deterministic plan that the renderer consumes directly:

- `utils/snapshotPrintPageProfile.ts` — page-size profiles (**Letter**, **A4**), usable area, per-context header reserves, columns-per-page, and first-page / continuation / chapter-start column capacities. Units are rem (1in = 6rem); Letter = 51×66rem, A4 ≈ 49.6×70.1rem, 0.5in (3rem) margins per side.
- `utils/snapshotPrintRenderPlan.ts` — `buildPrintRenderPlan(profile, { paper })` → `PrintRenderPlan` of `pages → rows → columns → domain segments`.

**Model shape:** `PrintRenderPlan.pages[]` → each `PrintPagePlan` has a `headerMode` (`document` / `document-chapter` / `chapter` / `continuation`), a `columnCapacity`, an optional full-width `chapterBand`, and one `PrintRowPlan` of `PrintColumnPlan`s. Each column carries a `DomainSegmentPlan` (domain identity, `segmentNumber/segmentCount`, contiguous `targetStartOrdinal…targetEndOrdinal`, threads, `connectsToPreviousInRow`).

**Column count** = `floor((usableWidth + gutter) / (columnWidth + gutter))`; wider columns (more cycles) → fewer columns. **Capacity** = `floor((usableHeight − pageHeaderReserve − segmentHeader) / rowHeight)`; continuation pages fit more rows than the first page (lighter header). Capacity estimates intentionally omit the compact repeated page footer (PR13.6C chrome); composition math is unchanged.

**Ordering rule (single documented policy):** fill domains in authored order; when a domain overflows its current column, continue THAT domain into the next available column (beside the previous segment) before starting the next domain; move to a new page only when no column remains, then recompute capacity. If a domain fits within the columns remaining on the current page, its sizes are balanced across the fewest needed columns (no runt); otherwise it fills the remaining columns at capacity and continues on the next page.

**Domain identity** is repeated on every segment (title, `Targets X–Y`, quiet `· continued` on segment 2+, `(n/m)`); this durable header carries the meaning across wraps and pages. An **optional** hairline connector (`data-assessment-snapshot-segment-connector`) is drawn only between adjacent same-row same-domain segments — decorative support, never required and never spanning pages.

**Grouped assessments:** chapter title is a full-width band; each chapter opens its own page; continuation pages within a chapter repeat a quiet `· continued` chapter band; no segment migrates between chapters; chapter order is authored order.

**Renderer:** `components/assessmentSnapshot/print/AssessmentSnapshotPrintDocument.tsx` renders `page → row → column → PrintDomainSegment` with QA data attributes (`data-assessment-snapshot-print-page`, `-print-row`, `-print-column`, `-domain-segment`, `data-domain-id`, `data-segment-number`, `data-target-start/-end`). CSS only **enforces** the plan — `break-before: page` on each page wrapper after the first — and no longer forces a break between every Part.

- [ ] Production A-C, G (2 cycles, Letter): **page 1** `A 1–19 | B 1–27 | C 1–29 | C 30–57`, **page 2** `G 1–24 | G 25–47`; all 150 targets once; order intact.
- [ ] PEAK 184 (3 cyc): page 1 fills 4 columns `1–36 … 109–144`, page 2 `145–184` — horizontal flow before a new page.
- [ ] AFLS 205 (2 cyc): final page rebalanced `31/30` (no runt).
- [ ] Extreme 250 (6 cyc): 2 columns/page, 4 pages, contiguous `1–250`, deterministic.
- [ ] VB-MAPP-like (grouped): each Level opens its own page; child Domain segments stay under the correct Level; continuation pages repeat the Level band; no cross-chapter migration.
- [ ] A4 vs Letter differ (A4 columns hold more rows).

## Print clinical polish (PR13.6C)

Presentation-only hardening. **PrintRenderPlan and screen RenderPlan are unchanged.**

- [ ] First-page header shows learner, pack (+ version), cycles, generation timestamp, and **organization when available** (no invented therapist/status fields).
- [ ] Continuation pages show a restrained running header: artifact label · learner · assessment/pack · **Page N of M**.
- [ ] Every page has a compact footer with Evalis, confidentiality line, and page number; final page adds pack summary + short clinical note.
- [ ] Hierarchy: document `h1` → chapter `h2` → domain segment `h3`; continuation wording uses readable gray (`text-gray-700`), not washed-out gray-300/400.
- [ ] Domain identity: repeated title, `Targets X–Y`, `(n/m)`, `· continued`; optional same-row connector darkened for grayscale.
- [ ] Accessibility: evidence beads gain stronger print borders; unscored beads keep dashed outline; max ring remains hollow green; score numerals remain the primary signal without color.
- [ ] Screen Snapshot chrome (header/footer components used on screen) is unchanged.

## V1 stabilization (PR13.6D)

Release-candidate cleanup — no composition algorithm or UI feature changes.

- [ ] Obsolete vertical print-Part path removed from `snapshotLayoutEngine` (`snapshotPrintComposition` deleted; row-height estimate lives in `snapshotPrintPageProfile`)
- [ ] Dead exports removed (`domainAccentClass`, `resolveThreadsLayout`, unused type aliases / config fields)
- [ ] Print tests assert via `buildPrintRenderPlan`; screen Parts remain for extreme groups only (`≥120`, size 46)
- [ ] Docs use DomainSegment language for print (not Part stacking)

## Production integration (PR13.5 / PR13.5A)

- [ ] Matrix shows **View Assessment Snapshot** only when availability rules pass.
- [ ] `#/assessment/:id/snapshot` loads real assessment data (no fixtures, no Concept Lab).
- [ ] Screen packing uses **measured container width** (narrowing the window repacks flat domains / child zones).
- [ ] Grouped Levels remain full-width chapters while child Domains repack under each chapter.
- [ ] Thread rows are code-only and more compact after PR13.5A.
- [ ] Cycle Reference appears once beneath metadata / above the legend.
- [ ] Back navigation returns to `#/assessment/:id`.
- [ ] Print action calls `window.print()` only; button is hidden in printed output.
- [ ] Unscored assessments still render with an empty-evidence notice (not blocked).

## Execution log

| Date | Surface | Paper | What was actually done | Result |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Unit / layout smoke | n/a | PR13.5 production contract + measured-width RenderPlan tests in Vitest. | Automated pass |
| 2026-07-13 | Dev preview `#/dev/assessment-snapshot` (browser automation) | n/a | Loaded Alpha Small, VB-MAPP-like, Extreme 250. Measured viewport ≠ fixed 96. VB-MAPP chapters full-width. Print surface `aria-hidden` + `display:none`. | Pass for screen topology / measured width |
| 2026-07-13 | PR13.5A unit tests | n/a | Code-only labels, Cycle Reference, axes without dates (314 frontend tests). | Automated pass |
| 2026-07-13 | PR13.5A live preview (browser) | n/a | Dev fixtures reviewed for code-only rows + single Cycle Reference (see session notes). | Pass for presentation refinements |
| 2026-07-13 | Production route in authenticated app | — | **Not executed** — requires login and a real assessment ID. | Pending manual QA |
| 2026-07-13 | Chrome Print Preview (Letter / A4) | — | **Dialog not opened** in this session. Do not treat print as signed off. | Pending |
| 2026-07-16 | PR13.6A unit / CSS contract | n/a | Print density tokens, code→bead gap, max-ring green print override, break-inside avoid (Vitest). | Automated pass |
| 2026-07-16 | Chrome Print Preview (Letter / A4) | — | **Dialog not opened** in this session. Do not treat green-ring / page-count as signed off. | Pending |
| 2026-07-16 | PR13.6B unit / composition | n/a | Page-utilization model, balanced print factoring, lowered print threshold, order/immutability (Vitest, 346 tests). | Automated pass (superseded) |
| 2026-07-16 | Print-media emulation (dev `#/dev/assessment-snapshot`, CDP `Emulation.setEmulatedMedia:print`) | n/a | Extreme 250 print tree = `42/42/42/42/41/41` (screen tree stays `46×5+20`); PEAK 184 = `46×4` (pre-revision). Max ring border `rgb(21,128,61)`, white fill; codes right-aligned. | Pass for composition + green ring under print media |
| 2026-07-16 | PR13.6B **revised** unit / composition | n/a | Capacity-informed factoring (first-page + continuation capacities, tolerance/hysteresis), production A-C,G fixture + boundary + grouped tests (Vitest, 357 tests). | Automated pass |
| 2026-07-16 | Print-media emulation — Production A-C,G (CDP `Emulation.setEmulatedMedia:print`) | n/a | Print tree: A19 whole · B27 whole · C57 → `29/28` · G47 whole (150 targets total). Screen tree: all four whole. Max ring border `rgb(21,128,61)`, white fill. | Pass for capacity-informed factoring |
| 2026-07-16 | Print-media emulation — PEAK 184 (revised) | n/a | Print tree now `37/37/37/37/36` (first Part ≤ first-page capacity 44). | Pass |
| 2026-07-16 | Chrome Print Preview (paginated dialog) / real PDF | — | **Not available** — MCP denies `Page.printToPDF` and the native ⌘P dialog cannot be opened via CDP. Exact page counts / orphan-header / sibling-page behavior remain unverified in a real preview. | Pending |
| 2026-07-16 | PR13.6B **page composition engine** unit tests | n/a | New `snapshotPrintPageProfile` + `snapshotPrintRenderPlan` suites (profiles, columns-by-cycle, capacities, A-C,G, PEAK/AFLS/Extreme, grouped, Letter/A4, order/no-loss/determinism/immutability, screen unchanged). Full suite **383 tests**, `tsc --noEmit` clean, `vite build` clean. | Automated pass |
| 2026-07-16 | Print-media emulation (dev `#/dev/assessment-snapshot`, CDP `Emulation.setEmulatedMedia:print` + DOM extraction) | Letter | **A-C,G:** p1 `A1–19 | B1–27 | C1–29 | C30–57` (cap 36), p2 `G1–24 | G25–47` (cap 42), footer once on p2, connectors between C↔C and G↔G. **PEAK 184:** p1 4 cols `1–36…109–144`, p2 `145–184`. **Extreme 250:** 2 cols/page × 4 pages `1–250`. **VB-MAPP:** 7 pages, each Level opens a page, continuation pages carry `· continued` band, `migratedPages=0`, 75 milestones. Green hollow max ring + PR13.6A density intact. | Pass for explicit page composition |
| 2026-07-20 | PR13.6C unit / chrome | n/a | `printClinicalChrome` identity + page-label helpers; full suite **387 tests**; `vite build` clean. PrintRenderPlan regression suites unchanged. | Automated pass |
| 2026-07-20 | Print-media emulation — clinical polish (CDP print + DOM) | Letter | **A-C,G:** org in p1 metadata; p2 running header + Page 2 of 2; confidentiality on every page; clinical note only on final page; composition unchanged (`A|B|C|C` / `G|G`). **VB-MAPP:** Page N of 7 labels; Level · continued on chapter continuations. | Pass for clinical chrome |
| 2026-07-23 | PR13.6D V1 stabilization | n/a | Removed obsolete print-Part composition module + dead exports; retargeted tests to PrintRenderPlan; docs DomainSegment language. Suite **365 tests**, `vite build` clean. | Automated pass |

## Known limitations

- The compact repeated page footer (PR13.6C) is presentation chrome and is **not** reserved in column-capacity estimates; a full final page may sit slightly tighter than the estimator predicts.
- Therapist, reviewer, and assessment-status fields are not shown because they are not in `LearnerMapDisplayContext` / Snapshot profile — do not invent them until production wiring exists.
- Full Chrome Print Preview sign-off remains **pending** until the paginated ⌘P dialog / real `printToPDF` is run on real or realistic fixtures (record rows above when done). Those cannot be driven from automation in this environment, so exact physical page counts and orphan-header behavior are validated by the **explicit deterministic PrintRenderPlan** + print-media emulation + DOM extraction only — not a rendered PDF.
- The page composition engine is an **estimator**, not WYSIWYG. Column capacities come from tier-based furniture heights (1in = 6rem; Letter 51×66rem, A4 ≈ 49.6×70.1rem; 0.5in margins; estimated document/continuation/chapter/segment header reserves). If the browser's actual rasterized height differs from the estimate, a planned page's content may slightly under/overflow its physical sheet; `break-before: page` still starts every planned page on a fresh sheet.
- **Vertical 2D packing is out of scope:** each planned page holds a single horizontal row of columns. Grouped assessments with many short domains therefore use one page per ~`columnsPerPage` domains (e.g. VB-MAPP ≈ 7 pages) rather than stacking multiple short column-rows on one sheet. Multi-row-per-page bin-packing is a future enhancement.
- The optional same-row connector is decorative only and never spans pages; repeated segment headers are the durable continuation identity.
- Screen packing uses measured container width with a rem jitter threshold (~0.5rem); sub-threshold ResizeObserver noise does not rebuild the plan.
- Screen still factors only extreme groups (120+) with fixed 46-slicing; print segmentation is column/page composition via PrintRenderPlan.
- Single-zone flat composition is optically centered; thread column width remains plan-driven (beads are not stretched).
- No standalone HTML export, download, or PHI acknowledgment in this PR.
- Extreme 250 remains fully in DOM (no virtualization) because print/export needs the complete tree — rebuild cost is limited to profile memoization + RenderPlan on meaningful width changes.
- Concept Lab / archive candidates remain in-tree for historical exploration; production route uses Target Threads V1 only.
