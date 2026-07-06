# Learner Map PR9.8 Domain-Selected Appendix Export Specification

| Field | Value |
|-------|--------|
| **Document type** | Product specification |
| **Feature** | Learner Map export — **Selected Domains** appendix mode |
| **Milestone** | PR9.8 (specification only; no implementation in this PR) |
| **Baseline commit** | `7c28551` — *feat(learner-map): add assessment-wide movement rollup* |
| **Parent spec** | [`learner_map_v1_pr6_export_print_specification.md`](./learner_map_v1_pr6_export_print_specification.md) |
| **Status** | Approved for PR9.9 Builder planning pending SPM sign-off |

---

## Implementation context (pre–PR9.8)

Learner Map export has progressed through:

| PR | Focus |
|----|--------|
| **PR7** | Export view foundation |
| **PR8** | Print foundation |
| **PR9** | Appendix print viability |
| **PR9.5** | Appendix density & continuity polish |
| **PR9.6** | Print polish + movement semantics |
| **PR9.7** | Assessment-wide movement rollup |

**Current export modes (code):**

| Mode | Contents |
|------|----------|
| **Standard** | Header, metadata, disclaimer, assessment rollup, Score Bands, Movement Key, L1 Domain Competency Summary — **no L2** |
| **Full** | Standard + L2 appendix for **all** domains |

**Gap:** Full Mode forces an all-or-nothing target-level appendix. Supervisors often need L2 for **one or a few** domains flagged in L1.

---

## 1. Purpose

### Why Selected Domains exists

**Selected Domains** export adds a **middle mode** between Standard (no L2) and Full (all L2). It exists to:

1. **Reduce excessive page count** — avoid printing target × cycle detail for every domain when only one or two need inspection.
2. **Support focused supervision** — align export with the natural review path: scan L1, then drill into flagged domains only.
3. **Support treatment planning** — share target-level evidence for domains under active intervention without attaching unrelated appendix bulk.
4. **Support sharing target-level evidence** — provide printable cycle × target detail for **specific** domains sent to collaborators or filed in domain-specific notes.
5. **Avoid forcing all-or-nothing Full export** — clinicians should not choose between “no detail” and “everything.”

### What Selected Domains is not

- Not a new visualization layer (still L0 + L1 + filtered L2 appendix).
- Not a replacement for Standard or Full.
- Not a change to **`LearnerMapProfile`**, L1 semantics, or L2 cell/movement semantics.

---

## 2. User workflow

Intended clinical workflow:

```text
1. Clinician opens Learner Map export (or reviews Standard export / in-app L1).
2. Scans L1 Domain Competency Summary — coverage, bands, movement, domain-level signals.
3. Identifies one or more domains requiring deeper target-level review or external sharing.
4. Chooses export mode: Selected Domains.
5. Selects those domains from a checklist (assessment order preserved).
6. Generates print preview: Standard body + appendix for selected domains only.
7. Prints or Save as PDF (Chrome) for supervision, planning, or records per org policy.
```

**Product insight (Overseer):** L1 flags *where* to look; Selected Domains exports *only that where* at L2 depth.

---

## 3. Export mode model

Three modes form a single progression — **not** four visualization layers:

| # | Mode | Body | L2 appendix |
|---|------|------|-------------|
| 1 | **Standard** | Full Standard sections | **None** |
| 2 | **Selected Domains** | Same as Standard | **Filtered** — selected domains only |
| 3 | **Full** | Same as Standard | **All** domains |

### Clarifications

| Topic | Rule |
|-------|------|
| **Selected Domains vs Full** | Selected Domains is a **filtered Full appendix**, not a different artifact type. |
| **Selected Domains vs Standard** | Identical through L1; differs only by presence and scope of L2 appendix. |
| **Default mode** | **Standard** remains default (unchanged from PR6 spec). |
| **Full Mode** | Remains **explicit opt-in** with large-export warning when applicable (PR6 §8). |
| **Selected Domains** | Explicit opt-in; requires ≥1 domain selected before export/print proceeds. |

**Mode type (implementation):** Extend export mode union conceptually to `'standard' | 'selected-domains' | 'full'` (exact id string is Builder choice).

---

## 4. Recommended UX

High-level UX for export dialog and preview (production in PR10+; **PR9.9 dev/export-preview first**).

### Export dialog

| Element | Behavior |
|---------|----------|
| **Title** | “Export Learner Map” / “Print Learner Map” |
| **Mode options** | Standard (recommended) · Selected Domains · Full |
| **Default selection** | **Standard** |
| **Mode descriptions** | Plain-language bullets per mode (what is included / excluded) |
| **Selected Domains — domain checklist** | Shown **only** when Selected Domains mode is active |
| **Checklist order** | Domains listed in **assessment pack order** (same as L1 / profile `domains` array) |
| **Checklist labels** | Domain title (+ optional internal id in dev only, not print) |
| **Select all / clear all** | **Optional** convenience actions; not required for PR9.9 MVP |
| **Empty selection** | Export / continue / print **disabled** until ≥1 domain selected |
| **Helper text (zero selected)** | *“Select at least one domain to include target-level detail.”* |
| **Full Mode warning** | Unchanged — large document warning when thresholds met (PR6 §8) |
| **Selected Domains warning** | **No** large-export warning by default; optional soft note if user selects many domains (future polish) |

### Post-selection flow

1. User confirms mode + selection (if Selected Domains).
2. Navigate to **print-scoped export view** with `mode` + `selectedDomainIds` (when applicable).
3. Browser Print / Save as PDF.

### Explicit non-UX (PR9.8)

- **No** L2 orientation toggle (Cycle × Target ↔ Target × Cycle) — per PR6 §6.1.
- **No** scroll enable/disable toggle — print layout handles scroll (PR6 §6.1, §7 P8).

---

## 5. Document structure

**Selected Domains** printed/exported document order:

| # | Section | Same as Standard? |
|---|---------|-------------------|
| 1 | Artifact header | Yes |
| 2 | Record metadata | Yes |
| 3 | Clinical disclaimer | Yes |
| 4 | Assessment rollup (L0) | Yes |
| 5 | Score Bands card | Yes |
| 6 | Movement Key card | Yes |
| 7 | L1 Domain Competency Summary | Yes — **assessment-wide** (see §6) |
| 8 | **Appendix divider** | Title: **“Appendix — Selected Domain Detail”** (+ brief scope note: target-level detail for selected domains only) |
| 9 | L2 appendix blocks | **Selected domains only**, in **assessment order** (skip unselected; do not re-sort selected subset alphabetically) |
| 10 | Footer | Per PR6 §7 |

**Per selected domain appendix block:** Reuse existing **`LearnerMapAppendixDomainSection`** (or equivalent) with unchanged segmentation, print density, domain identity headers, and movement semantics from PR9–PR9.7.

---

## 6. L1 behavior

| Rule | Specification |
|------|----------------|
| **Scope** | L1 remains **assessment-wide** — all domains in the summary table. |
| **Do not filter L1** | Selected Domains mode must **not** hide non-selected domains from L1. |
| **Rationale** | L1 provides **context for why** selected domains matter (coverage gaps, movement, band distribution). Removing unselected domains from L1 would break the supervision narrative (“I saw these domains in summary, here is detail for these two”). |

---

## 7. L2 appendix behavior

| Rule | Specification |
|------|----------------|
| **Inclusion** | Only **selected** domains appear in the appendix. |
| **Order** | Preserve **assessment pack order** among selected domains. |
| **Renderer** | Same appendix renderer as Full Mode with a **domain filter** (`selectedDomainIds` or equivalent). |
| **Semantics** | Unchanged: cycle × target orientation (default), movement markers, domain headers, print density, page-break rules (PR6 §6–§7, PR9.x polish). |
| **Assessment-wide movement rollup** | Remains in Standard body (PR9.7); not duplicated per selected-domain filter logic. |

---

## 8. Relationship to Full Mode

| Aspect | Full Mode | Selected Domains |
|--------|-----------|------------------|
| **Standard body** | Identical | Identical |
| **L1** | All domains | All domains |
| **L2 scope** | All domains | **Chosen** domains only |
| **Appendix title** | “Appendix — Cycle × Target Detail” (or established Full title) | **“Appendix — Selected Domain Detail”** |
| **Implementation** | `LearnerMapAppendixSection` with `domains={all}` | Same component with `domains={filtered}` |

**Shared code path:** One appendix section component; filter applied at view boundary — **no** forked L2 rendering logic.

---

## 9. Empty selection behavior

When **Selected Domains** mode is active:

| State | Behavior |
|-------|----------|
| **Zero domains selected** | **Cannot** proceed to export preview / print |
| **Primary action** | Disabled (Continue / Print) |
| **Helper text** | *“Select at least one domain to include target-level detail.”* |
| **Invalid deep-link** | If preview opened with `selectedDomainIds=[]`, show empty-state message; do not render blank appendix |

---

## 10. Large export warning

| Mode | Warning policy |
|------|----------------|
| **Standard** | No L2 — no large appendix warning |
| **Selected Domains** | **No** mandatory large-export warning in PR9.9 unless SPM later sets threshold (e.g. all domains selected ≈ Full) |
| **Full** | Retains **large export warning** when assessment size exceeds thresholds (PR6 §8, OQ4) |

**Note:** Selecting **all** domains in Selected Domains produces substantially the same appendix as Full; product may optionally treat “all selected” as equivalent to Full for warning purposes — **deferred** (not required for PR9.9).

---

## 11. Future possibilities (deferred)

Explicitly **out of scope** for PR9.8 / PR9.9 unless separately specified:

| Item | Notes |
|------|--------|
| **Changed-targets-only appendix** | L2 filtered to movement ≠ flat/none |
| **Unscored-targets-only appendix** | L2 filtered to incomplete targets |
| **Parent-friendly selected-domain summary** | Simplified copy for caregivers |
| **Per-domain export from L1 row action** | Shortcut: “Export this domain” from L1 row — may converge with Selected Domains later |
| **Saved export presets** | Remember last domain selection per user/org |
| **“All selected” → suggest Full** | UX hint when checklist is fully checked |

---

## 12. Acceptance criteria for implementation (PR9.9)

PR9.9 satisfies this spec when:

### Mode & data

- [ ] Export mode union includes **`selected-domains`** (or equivalent id) alongside `standard` and `full`.
- [ ] Export view accepts **`selectedDomainIds: string[]`** (domain ids from profile) when mode is Selected Domains.
- [ ] **`LearnerMapProfile` unchanged** — filtering is view/export-layer only.

### UX (dev/export preview)

- [ ] Dev export preview exposes **Selected Domains** mode in mode selector.
- [ ] Domain **checklist** appears when Selected Domains is selected; domains in **assessment order**.
- [ ] **Continue / print disabled** with zero selection; helper text per §9.
- [ ] **Standard** remains default mode on load.

### Document output

- [ ] Selected Domains output includes **full Standard body** + L1 for **all** domains.
- [ ] Appendix title reads **“Appendix — Selected Domain Detail”** (or approved equivalent).
- [ ] Appendix renders **only** selected domains, in assessment order.
- [ ] Unselected domains **absent** from appendix; L1 still lists all domains.

### Appendix quality (inherit PR9.x)

- [ ] Reuses **`LearnerMapAppendixSection`** / domain sections with filter — no duplicate appendix implementation.
- [ ] Print density, movement semantics, domain identity, and page-break behavior **unchanged** from Full Mode for included domains.
- [ ] No clipped scroll regions in print (PR6 §7 P8).

### Non-goals verified

- [ ] No production route / production export button required in PR9.9.
- [ ] No PDF engine, Target × Cycle, compact matrix mode, or L1/L2 semantic changes.

---

## 13. Non-goals

PR9.9 must **not** include (unless separately scoped):

| Non-goal | Notes |
|----------|--------|
| **Production wiring** | Real assessment entry point, live profile wiring beyond dev preview |
| **Production export button** | If not in PR9.9 scope — dev preview only |
| **Dedicated PDF engine** | Browser print only |
| **Target × Cycle orientation** | PR6 §6.1 — deferred |
| **Compact matrix mode** | Not defined in Learner Map export |
| **`LearnerMapProfile` changes** | Filter at export view only |
| **L1 / L2 semantic changes** | Same metrics, bands, movement rules |
| **Summary Mode** | Separate PR6 mode; unchanged by this spec |

---

## 14. Recommended PR9.9 implementation scope

**PR9.9 — Selected Domains appendix (dev/export preview only)**

| Deliverable | Detail |
|-------------|--------|
| **Mode extension** | Add `selected-domains` to `LearnerMapExportMode` + `LEARNER_MAP_EXPORT_MODES` metadata (label, description, includes L2 flag) |
| **Selection state** | `selectedDomainIds` state in dev export preview page; checklist UI |
| **Export view props** | `LearnerMapExportView` accepts optional `selectedDomainIds`; filters domains before `LearnerMapAppendixSection` |
| **Appendix filter** | `LearnerMapAppendixSection` receives filtered `domains` array — same renderer as Full |
| **Appendix heading** | Mode-specific appendix title component or prop |
| **Validation** | Block preview navigation when selection empty |
| **Production** | **No** production wiring — remain on `#/dev/learner-map-export` (or equivalent dev route) |

**Suggested file touch list (informational, not prescriptive):**

- `learnerMapExportMode.ts`
- `LearnerMapExportView.tsx`
- `LearnerMapExportPreview.tsx` (dev)
- Optional: `LearnerMapAppendixSection.tsx` (title prop only)

---

## 15. Final recommendation

| Question | Recommendation |
|----------|----------------|
| **Should Selected Domains be implemented before PR10 production export UX?** | **Yes.** Implement in **dev/export preview (PR9.9)** before PR10 wires production export dialog and routes. |
| **Rationale** | Validates filtered appendix print quality, selection UX, and shared renderer pattern **without** production commitment; de-risks PR10 mode dialog and prevents shipping Full-only vs Standard-only false dichotomy. |
| **Default / Full unchanged?** | **Yes** — Standard default; Full explicit opt-in with warnings. |
| **Ready for PR9.9 Builder work after this spec?** | **Yes**, pending SPM sign-off on checklist UX (select all/clear all optional in PR9.9). |

### SPM sign-off checklist

- [ ] Three-mode model (Standard · Selected Domains · Full) approved
- [ ] L1 assessment-wide + filtered L2 appendix approved
- [ ] Appendix title “Selected Domain Detail” approved
- [ ] PR9.9 dev-only scope approved (no production wiring)
- [ ] Implement before PR10 production export UX confirmed

---

## Appendix A — Mode comparison matrix

| | Standard | Selected Domains | Full |
|---|:---:|:---:|:---:|
| Header / metadata / disclaimer | ✓ | ✓ | ✓ |
| Assessment rollup | ✓ | ✓ | ✓ |
| Score Bands + Movement Key | ✓ | ✓ | ✓ |
| L1 (all domains) | ✓ | ✓ | ✓ |
| L2 appendix | — | Selected only | All |
| Domain selection UI | — | Required | — |
| Large export warning | — | Optional / none in v1 | Yes |

## Appendix B — Related documents

- [`learner_map_v1_pr6_export_print_specification.md`](./learner_map_v1_pr6_export_print_specification.md) — export philosophy, pagination, L2 orientation/scroll (§6.1)
- [`docs/visualization/layer_2_visualization_strategy.md`](../visualization/layer_2_visualization_strategy.md) — Assessment Landscape (separate product surface)

---

_Document steward: Documentation / Overseer. Update when PR9.9 ships or PR10 production UX incorporates Selected Domains._
