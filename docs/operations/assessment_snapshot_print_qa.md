# Assessment Snapshot Print QA

Manual checks for Chrome Print Preview on:

- **Production route:** `#/assessment/:assessmentId/snapshot` (PR13.5+)
- **Dev preview:** `#/dev/assessment-snapshot` (stress fixtures when production data is unavailable)

## Fixtures to exercise

| Fixture / assessment | What it stresses |
| --- | --- |
| Flat clinical assessment | Domain packing + measured container width |
| Grouped VB-MAPP-like | Level chapters + child Domain zones |
| PEAK / large flat | Presentation Parts + pagination |
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

- [ ] Print preview shows the **print-only** tree (factored parts where applicable), not the screen layout.
- [ ] Application chrome (nav, back link, Print button) and DEV chrome (amber banner, scenario buttons) are **hidden** in print.
- [ ] **No clipped beads** — evidence beads and max rings stay inside their columns.
- [ ] **No missing targets** — target count in headers matches authored pack size.
- [ ] **No missing cycles** — every thread row has one bead per cycle; cycle headers show `C1`, `C2`, … with dates when available.
- [ ] **No page-break corruption** — target threads are not split across pages.
- [ ] **No orphaned headings** — part continuation headers and secondary group titles are not stranded at page bottoms without following threads.
- [ ] **Colors preserved** — competency fill colors visible with background graphics on.
- [ ] **Domain/part context** is understandable on continuation pages (`Part N (continued)`, `Targets X–Y`, repeated cycle headers on multi-part domains).

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

- [ ] Presentation **Parts** break across pages with neutral labels (`Part 2`, `Targets 47–92`).
- [ ] Target order matches authored pack order across all parts.
- [ ] Secondary groups (VB-MAPP-like only) survive factoring with correct section titles.

## Target labels and scales

- [ ] Short codes (`A1`, `ECHO_12`, `P47`) are the **only** visible row identity (no title/description under the code).
- [ ] Full target title remains on tooltip / `aria-label` (`A1 — …`).
- [ ] Domain cycle axes show `C1` / `C2` / … / `max` only — no dates under cycles.
- [ ] Document **Cycle reference** lists each cycle once with its date (or `Date unavailable`).
- [ ] Yes/no, 0–2, 0–4, and labeled numeric scales render compact bead text; full score remains in bead `aria-label` / title on screen.

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

## Known limitations

- Full Chrome Print Preview sign-off remains **pending** until the dialog is opened on real or realistic fixtures (record rows above when done).
- Pagination is CSS-only; exact page breaks vary by browser, margins, and paper size.
- Screen packing uses measured container width with a rem jitter threshold (~0.5rem); sub-threshold ResizeObserver noise does not rebuild the plan.
- Print factoring thresholds differ from screen (80+ targets factor on print; 120+ on screen).
- Single-zone flat composition is optically centered; thread column width remains plan-driven (beads are not stretched).
- No standalone HTML export, download, or PHI acknowledgment in this PR.
- Extreme 250 remains fully in DOM (no virtualization) because print/export needs the complete tree — rebuild cost is limited to profile memoization + RenderPlan on meaningful width changes.
