# Assessment Snapshot Print QA (PR13.3)

Manual checks for Chrome Print Preview on the dev preview route (`/dev/assessment-snapshot`).

## Fixtures to exercise

| Fixture | What it stresses |
| --- | --- |
| Alpha Small | 3 domains · 10 targets each · 2 cycles |
| ABLLS-like | 15 domains · 40 targets each · 4 cycles |
| VB-MAPP-like | 3 levels · 6–7 domains each · 3 cycles |
| PEAK 184 | 1 group · 184 targets · 3 cycles |
| AFLS Flat | 1 group · 205 targets · 2 cycles |
| Extreme 250 | 1 group · 250 targets · 6 cycles |

## Steps

1. Open the dev preview and select **Target Threads V1**.
2. Load each fixture above.
3. Open **Print Preview** (⌘P / Ctrl+P) in Chrome.
4. Enable **Background graphics** so competency bead colors print.

## Verify on every fixture

- [ ] Print preview shows the **print-only** tree (factored parts where applicable), not the screen layout.
- [ ] Dev chrome (amber banner, scenario buttons) is **hidden** in print.
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
- [ ] All **first target threads align** despite long "Cooperation & Reinforcer Effectiveness" title wrapping inside a fixed title band.
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

- [ ] Short codes (`A1`, `ECHO_12`, `P47`) remain traceable in print without hover.
- [ ] Long titles show a compact second line or truncation without overlapping beads.
- [ ] Yes/no, 0–2, 0–4, and labeled numeric scales render compact bead text; full score remains in bead `aria-label` / title on screen.

## Known limitations

- **Full Chrome Print Preview sign-off remains pending** — checklist above is the QA protocol; complete fixture walkthrough in Chrome Print Preview before the production Snapshot route lands.
- Pagination is CSS-only; exact page breaks vary by browser, margins, and paper size.
- Screen packing still uses a fixed planning viewport width (not measured container width).
- Print factoring thresholds differ from screen (80+ targets factor on print; 120+ on screen).
- Single-zone flat composition is optically centered; thread column width remains plan-driven (beads are not stretched).
- No standalone HTML export or download in this PR.
- Component/DOM smoke tests for the production route are not yet in place.
