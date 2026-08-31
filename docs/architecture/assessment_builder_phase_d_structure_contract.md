# Assessment Builder Phase D — Structure Contract (Professional Editor UX)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (Builder shell / information architecture) |
| **Phase / PR** | Phase D — structure slice (C2 in consolidation sequence) |
| **Status** | Authoritative design contract — Builder implements without product interpretation on resolved items |
| **Binding context** | Consolidation phase in force (founder 2026-08-25, reiterated 2026-08-27): **restructure what exists; no new capability** until surfaces are right |
| **Audit source** | Vault `(C) Structural & Appearance Audit (2026-08-27).md` — verdict B; Builder findings **B1, B2, B4, B5, B6, B7** (B3 and B7 pluralisation shipped C0.1 — **do not re-address**) |
| **Prerequisites** | Phase C editing sessions shipped (`assessment_builder_phase_c_pr_c1_editing_sessions.md`); Phase B canonical scoring settled (B1/B3 — **do not reopen**) |
| **References** | [`assessment_builder_phase_c_pr_c1_editing_sessions.md`](./assessment_builder_phase_c_pr_c1_editing_sessions.md) · [`assessment_builder_phase_b_pr_b1_canonical_scoring_model.md`](./assessment_builder_phase_b_pr_b1_canonical_scoring_model.md) · [`assessment_builder_phase_b_pr_b3_write_path.md`](./assessment_builder_phase_b_pr_b3_write_path.md) · [`assessment_builder_canonical_product_architecture.md`](./assessment_builder_canonical_product_architecture.md) (Rule 5, UX principles — cite only) · [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) (single-primary rule — cite only) · [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) (Builder = computer surface; no tablet obligation) |
| **Verified against** | `ContentPacks.tsx` · `AssessmentBuilder.tsx` · `AssessmentBuilderTargetEditor.tsx` · `AssessmentBuilderNavigationGuard.tsx` · `App.tsx` · `Layout.tsx` · `assessmentPackStructure.ts` (`OVERSIZED_GROUP_*`) · `TargetDetailModal.tsx` (Instructions/Examples display) |

**Anchor:** The Builder is a **place** where a pack author **names an instrument, adds domains, adds targets, and saves**. Everything else is configuration that must not block or precede that job.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns Builder **routing**, **shell chrome**, **authoring order**, **visual/naming hierarchy** for existing controls, **Phase C guard migration** when the Builder leaves the Packs list panel, and **scope split** for outline/search at scale. It does not restate Phase B scoring semantics, Phase C dirty snapshot mechanics, CSV parse internals, or runtime/Matrix behaviour.

---

## Amendment banner — consolidation constraints (binding)

| Constraint | Meaning for Phase D |
|------------|---------------------|
| **Consolidation** | Layout, order, labels, and placement of **existing** fields and actions only |
| **No new capability** | No new pack fields, no Instructions/Examples authoring UI, no undo/redo, no autosave draft, no named-scale catalog UI, no collaborative editing |
| **Phase B frozen** | `scoring_mode`, sparse overrides, Uniform confirm, migrate-on-open, normalize-on-save — unchanged |
| **Phase C frozen** | Dirty baseline, confirm-gated Cancel, guards, validation jump links, `updated_at` conflict Reload dialog — semantics unchanged; **routing** may change how guards attach |
| **Computer surface** | Desktop-first; no tablet layout obligation |

---

## 1. Problem statement (from audit B1–B7)

| ID | Finding | Current code symptom |
|----|---------|----------------------|
| **B1** | Builder is a panel on the Packs list, not a place | `ContentPacks.tsx`: `showBuilder` inline render; H1 stays **Content Packs**; Active/Archived/Build Custom/Upload remain above Builder; pack cards with Edit/Archive stay visible below Save/Cancel |
| **B2** | Form order fights create sequence | `AssessmentBuilder.tsx`: title → structure labels → uniform scale + **Score Criteria Definitions** → **then** domains/targets (`border-t` at ~L1202); Save/Cancel at form bottom (~L1573) |
| **B4** | Two score-meaning surfaces + runtime fields with no author path | Pack `scale_labels` vs target `success_criteria`; `Target.instructions` / `Target.examples` exist on type and in CSV template; shown in `TargetDetailModal` / scoreboard overlay; **no Builder inputs** |
| **B5** | Add Domain vs Add Target hierarchy inverted; delete undifferentiated | Add Domain: filled emerald block (~L1208); Add Target: small emerald text link (~L1502); domain and target delete: unlabelled red `Trash2` (~L1278, target editor) |
| **B6** | Three create paths, two primary colours | Packs header: green **Build Custom** + blue **Upload Pack** peers; **Download CSV Template** inside Builder panel |
| **B7** | Three competing titles | Page H1 **Content Packs**; Builder H2 **Build Custom Assessment**; info box **Assessment Builder** |

**Already shipped (C0.1 — out of scope):** B3 ID empty-state; B7 structure-label pluralisation.

---

## 2. What this contract does not change

A Builder agent reading **only** this document must **not** infer permission to touch:

| Area | Disposition |
|------|-------------|
| **Phase A runtime truth** | Effective scoring resolver, Matrix write path, Snapshot/Learner Map rendering |
| **Phase B canonical model** | `scoring_mode`, `default_scoring`, sparse overrides, Uniform→Custom confirm, silent normalisation, migrate-on-open |
| **Phase B3 write path** | `seedBuilderWorkingPack`, `normalizeCanonicalPackForSave`, `validateBuilderPackAuthoring` rules |
| **Phase C session semantics** | Snapshot dirty compare, baseline refresh on Save, conflict `updateIfRevisionMatches`, Reload-only conflict dialog |
| **Phase C explicit non-goals** | Undo/redo, presence/locking, autosave-as-draft, merge UI beyond Reload |
| **CSV/JSON upload internals** | `packService.parseCSV`, `prepareContentPackForUpload`, import normalisation |
| **Named Scale Catalog authoring UI** | Deliberately deferred out of Phase B — remains deferred |
| **New pack fields** | Including Instructions/Examples authoring (see §8 — product question, not Phase D) |
| **Packs list redesign** | Beyond demoting Upload and removing inline Builder panel (B1/B6 minimum) |
| **Tablet layouts** | Builder has no tablet obligation |

---

## 3. B1 — The Builder becomes a place

### 3.1 Routes (binding)

The Builder is a **dedicated hash route**, not conditional UI inside `#/packs`.

| Route | Session | H1 context |
|-------|---------|------------|
| `#/packs` | **Packs list only** — no Builder panel | **Content Packs** |
| `#/packs/build` | **New pack** editing session | **Pack Builder** |
| `#/packs/build/:packId` | **Edit pack** session (`packId` = `content_packs.id`) | **Pack Builder** |

**App wiring:** `App.tsx` routes `#/packs`, `#/packs/build`, and `#/packs/build/:packId` to dedicated page component(s). The list route **never** mounts `AssessmentBuilder`.

**Single flow name (resolves B7):** The authoring place is always **Pack Builder** — one H1 on builder routes. No secondary H2 “Build Custom Assessment”. No info-box title “Assessment Builder”. Subtitle line may show **New pack** vs **Editing: {pack title}** (secondary text under H1).

### 3.2 Packs list chrome while building

When the user is on `#/packs/build` or `#/packs/build/:packId`:

- **Packs list chrome is not visible** — no Active/Archived toggle, no pack cards, no inline Builder panel, no duplicate Save/Cancel on the list page.
- **Layout app navigation remains** (Dashboard, Clients, Packs, Assessments, …) — computer surface; same as today.

### 3.3 Entry and exit

| Action | Behaviour |
|--------|-----------|
| **Build Custom** (on `#/packs`) | Navigate to `#/packs/build` (see §3.4 if session already open) |
| **Edit pack** (on `#/packs`) | Navigate to `#/packs/build/:packId` |
| **Upload Pack** (on `#/packs`) | Opens upload form on **list route only** — does not open Builder |
| **Save success** | Navigate to `#/packs` (preserves Phase C post-save close behaviour) |
| **Cancel (clean)** | Navigate to `#/packs` |
| **Cancel (dirty)** | Phase C confirm → on discard, navigate to `#/packs` |
| **Packs** nav while in Builder | Guarded hash navigation to `#/packs` (§4) |

### 3.4 Build Custom when a session is already open

| Current route | User action | Behaviour |
|---------------|-------------|-----------|
| `#/packs/build` or `#/packs/build/:id` | **Build Custom** (e.g. from `#/packs` after navigating back, or deep link) | If **dirty**: same discard confirm as Cancel; on confirm → `#/packs/build` (new empty session). If **clean** and already on `#/packs/build` with no `packId`: **no-op** (already creating). If **clean** on edit route: navigate to `#/packs/build` (new session). |
| Same | **Edit another pack** from list | If **dirty**: discard confirm; on confirm → `#/packs/build/:otherPackId`. If **clean**: direct navigation. |
| `#/packs` | **Build Custom** | Always navigate to `#/packs/build` |

**Invariant INV-PD1:** At most **one** Builder editing session is active. Starting a second session **never** silently discards the first.

### 3.5 Mid-create reachability

| Destination | Allowed? | Notes |
|-------------|----------|-------|
| Other app routes (Dashboard, Clients, Assessments, …) | **Yes**, with Phase C guard when dirty | Layout uses `requestNavigation` |
| `#/packs` list | **Yes**, with guard when dirty | Leaving builder place |
| Second Builder session | **Only** after confirm if dirty | §3.4 |
| Upload form on `#/packs` | **Yes** from list; **not** embedded in builder route | Upload remains list-scoped |
| Archive/Delete/Restore on list | **Not** while on builder routes | User must exit builder first |
| In-form scroll / validation jump | **Yes** | Not “navigation away” (Phase C §4.4.4) |

---

## 4. Phase C navigation guards — what each becomes

Phase C semantics are **unchanged**. Phase D changes **where** the guard registers and what “leave session” means.

**Registration (binding):** The Builder route wrapper (or `AssessmentBuilder` parent on builder routes) sets `navigationGuard.setBlocking(isDirty)` — same as today’s `ContentPacks` effect, but keyed to **builder route mounted**, not `showBuilder` on list page.

| Guard | Phase C today | Phase D |
|-------|---------------|---------|
| **`beforeunload`** (tab close / refresh) | `AssessmentBuilder` when dirty | **Unchanged** — still on `AssessmentBuilder` when `isDirty` |
| **Layout hash links** (`#/dashboard`, `#/clients`, `#/assessments`, …) | `navigateWithOptionalGuard` → `requestNavigation` | **Unchanged** |
| **Sign Out** | `requestLocalAction` when blocking | **Unchanged** |
| **Login redirect** (`App.tsx` when unauthenticated) | `requestNavigation('#/login')` when blocking | **Unchanged** |
| **Browser back/forward** | `AppRouter` `hashchange` → revert hash + `requestNavigation` | **Unchanged** — e.g. `#/packs/build` → `#/assessments` triggers discard confirm |
| **Cancel** | Dirty confirm in Builder → `onCancel` | **Unchanged** — `onCancel` navigates to `#/packs` instead of toggling `showBuilder` |
| **Save success close** | Parent unmounts Builder | **Unchanged** — navigate to `#/packs` |
| **List ↔ Builder toggle** | `requestLocalAction` on same `#/packs` (Build Custom, Edit, Upload toggle) | **Replaced** by hash navigation: `#/packs` ↔ `#/packs/build(/:id)` uses **`requestNavigation`** when dirty (leaving builder route) |
| **Switch pack while editing** | `handleEdit` → `requestLocalAction` | **`requestNavigation`** to `#/packs/build/:otherPackId` when dirty |
| **Upload form open** | `openUploadForm` → `requestLocalAction` (closes builder) | **List only:** `requestNavigation('#/packs')` + show upload form when coming from builder with dirty — or navigate to `#/packs` then open form after discard confirm |
| **Conflict Reload** | `ConfirmDialog` → remount Builder | **Unchanged** — stay on `#/packs/build/:packId`, bump remount key |
| **In-form scroll / outline jump (future)** | Not guarded | **Not guarded** |

**Invariant INV-PD2:** No code path may leave a dirty Builder session without **confirm discard**, **`beforeunload`**, or **successful Save/Cancel clean** — regardless of route shape.

---

## 5. B2 — Authoring order that matches the job

### 5.1 Primary sequence (binding)

The **primary vertical flow** on builder routes:

1. **Name it** — Assessment title (required); description optional, same band.
2. **Add domains** — domain list is the first substantive content block; empty state prompts Add domain.
3. **Add targets** — within each domain (and secondary group when enabled).
4. **Save** — commit via sticky chrome (§5.3), not below the fold.

**Deferred out of the primary scroll path** (collapsed **Advanced pack settings** section, below title band or in a disclosure — not above domains):

- Structure labels + secondary grouping toggle
- Scoring mode (Uniform / per-target overrides) + default scale CSV
- **Score Criteria Definitions** (`scale_labels` on pack default)

**Rationale:** Score meanings attach to a **scale** the author has chosen; authoring five criterion fields before any domain exists (audit B2; code L1148–1182 before L1202) inverts the mental model. Moving scoring settings to Advanced **relocates existing fields** — not a new capability.

**Per-target fields** remain on each target card in domain order: ID, title, description, success criteria, materials, custom scoring UI when applicable — unchanged field set.

### 5.2 Score criteria placement (structural, not B4 product resolution)

| Surface | Phase D placement |
|---------|-------------------|
| **Pack-level Score Criteria Definitions** (`default_scoring.scale_labels`) | **Advanced pack settings**, after default scale is visible; only when Uniform numeric default editor is shown |
| **Per-target Success Criteria** | **On target card** (unchanged field) |

Phase D **does not** decide whether these two should mean the same thing clinically — see §8 OQ-PD-1.

### 5.3 Sticky Save / Cancel chrome (in scope)

**Binding (Phase D delivers):**

- **Sticky header** on builder routes: H1 **Pack Builder**, session subtitle, dirty indicator, **Save**, **Cancel**.
- Save/Cancel are **always visible** without scrolling the domain list — fixes audit B2 (Save at y≈1243 below fold).
- **Save** is disabled when `domains.length === 0` (existing rule) or when Save is blocked by in-flight submit — unchanged product meaning.
- Bottom-of-form Save/Cancel row is **removed** (duplicate).

**Reload** (edit sessions): if shipped, lives in sticky header as **secondary** control — functional only; not Phase D visual polish beyond placement. *Note:* Phase C specified Reload; verify at implementation — not required for this structure contract’s acceptance if still absent (see §10).

### 5.4 Validation summary

Phase C jumpable validation summary **stays** — may live in sticky region or immediately below it; must remain reachable without hunting below domains.

---

## 6. B5 / B6 / B7 — Visual and naming hierarchy

### 6.1 Single-primary rule (cited, not restated)

Apply the rule from [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) §4:

> At most **one** filled accent commit control is visible to the **current actor** in the **current mode**, and every mode in which a commit action is legal for that actor **MUST** render it as that control. Competitors are demoted.

**Builder contexts:**

| Context | Actor job | Single filled accent |
|---------|-----------|----------------------|
| **`#/packs` list** (admin) | Start a new custom pack | **Build Custom** (navigate to builder) |
| **`#/packs` list** (admin) | Import a file | **None** — Upload Pack is **secondary** (outline), not blue filled peer |
| **Pack Builder route** | Commit the document | **Save** in sticky header |
| **Pack Builder route** | Add structure | **Not** a second filled accent — Add Domain / Add Target use **secondary** pattern (§6.2) |

### 6.2 Add Domain vs Add Target (B5)

| Control | Treatment |
|---------|-----------|
| **Add domain** | **Secondary** button — visible label `Add {primaryLabel}`, icon + text, same size class as Add Target |
| **Add target** | **Secondary** button — same component family as Add Domain (not text-link) |
| **Add secondary group** | **Tertiary** text action (existing rarity) — acceptable |

Neither Add action uses filled emerald while Save is visible in sticky chrome.

### 6.3 Delete controls (B5)

| Control | Treatment |
|---------|-----------|
| **Remove domain** | **Secondary destructive** — visible label `Remove {primaryLabel}` + trash icon; `aria-label` includes domain title or index |
| **Remove target** | **Secondary destructive** — visible label `Remove {targetLabel}` + trash icon |
| **Remove secondary group** | Visible label `Remove {secondaryLabel}` |

**No** shared unlabelled red trash icon as the only affordance.

### 6.4 Three create paths (B6)

| Path | Placement | Visual |
|------|-----------|--------|
| **Build Custom** | `#/packs` header | **Filled accent** — sole primary on list |
| **Upload Pack** | `#/packs` header | **Secondary** outline — demoted from blue filled |
| **Download CSV Template** | **Pack Builder** sticky header or Advanced footer as **text link** — not a third header primary; optional duplicate text link on `#/packs` in a “Templates” hint |

Upload path internals are out of scope; presentation only.

### 6.5 Titles (B7)

| Removed | Replaced with |
|---------|----------------|
| H2 “Build Custom Assessment” | — |
| Info box title “Assessment Builder” | One-line helper text under H1 if needed (no boxed second title) |
| H1 “Content Packs” on builder routes | **Pack Builder** |

---

## 7. Large-pack navigation — scope split (Phase D family)

### 7.1 Production scale evidence

| Source | Scale signal |
|--------|----------------|
| **Code** | `OVERSIZED_GROUP_LARGE_THRESHOLD = 80`, `EXTREME = 120` targets per primary/secondary group (`assessmentPackStructure.ts`) — warnings fire at clinic-realistic sizes |
| **QA / tablet contract** | Reference domain **19 targets** (Domain A) — does **not** stress Builder navigation |
| **Architecture research** | ABLLS-like domains **~57** targets; PEAK modules **~184**; flat custom uploads **180–250+** (`assessment_snapshot_design_manifesto.md`) |
| **Repo fixtures** | Unit tests use small packs; `learnerMapMockData` dev mocks up to 12×35 — **not** wired to Builder UX QA |
| **Production DB** | Not available in repo for this contract — scale argument uses **code thresholds + architecture research**, not a live row count |

**Conclusion:** A fixture-only QA pass **cannot** prove ABLLS-scale Builder navigation. Implementation acceptance for outline/search must use **a real large pack** (clinic import or seeded acceptance pack) before calling large-pack exit criteria met.

### 7.2 What is in this contract vs later slices

| Capability | Slice | In **this** contract? | Justification |
|------------|-------|----------------------|---------------|
| **Dedicated route + sticky Save/Cancel** | **D1 (this contract)** | **Yes** | B1/B2/B7; prerequisite for any editor chrome |
| **Authoring order + Advanced disclosure** | **D1** | **Yes** | B2 — relocates existing fields |
| **Visual hierarchy B5/B6** | **D1** | **Yes** | No new features |
| **Outline navigation** (jump domain / secondary group) | **D2** | **Named, not specified here** | Required for ABLLS-scale exit (`assessment_builder_conformance_audit.md` Phase D); depends on D1 shell |
| **Search / filter targets** | **D3** | **Deferred** | Valuable after outline; not required to fix audit B1–B7 |
| **Virtualized target lists** | **D3+** | **Deferred** | Performance; consolidation does not add infra until navigation IA is fixed |

**Phase D exit criterion (conformance audit):** “ABLLS-scale packs are navigable without endless scroll” — met only when **D1 + D2** ship; **D1 alone** is necessary but not sufficient.

---

## 8. B4 — Open product questions (do not resolve here)

### OQ-PD-1 — Two surfaces for “what a score means”

**Observation:** Pack-level **Score Criteria Definitions** (`scale_labels` on default scoring) and per-target **Success Criteria** (`success_criteria`) both describe performance meaning. Authors can set both independently today.

| Option | Consequence |
|--------|-------------|
| **A — Keep both, clarify copy** | UI labels explain: scale labels = score-button text; success criteria = mastery definition for target. Lowest engineering risk. |
| **B — Collapse to one authoring surface** | Product must pick which persists; may require migration or runtime merge rules — **touches Phase B display** if resolver changes. |
| **C — Hide pack criteria until Uniform mode** | Reduces confusion for Custom override packs; may surprise authors using scale labels only. |

**Recommendation:** **A** for consolidation — copy and placement only in Phase D; no schema change.

**Phase D scope:** **Copy/placement only** (Advanced section). **Not** semantic unification.

---

### OQ-PD-2 — Instructions and Examples in scoring overlay

**Observation:** `Target.instructions` and `Target.examples` exist on the type; CSV template includes columns; `TargetDetailModal` displays them when non-empty; **Builder has no inputs** (B4). Import can populate them silently.

| Option | Consequence |
|--------|-------------|
| **A — Author in Builder** | **New capability** — adds fields to target editor UI. **Excluded** from consolidation Phase D per founder directive. |
| **B — Import-only** | Document that CSV/JSON is the authoring path; scoreboard shows when present. |
| **C — Remove from runtime overlay until authored** | Hides data clinicians may rely on from imports — regression risk. |

**Recommendation:** **B** for consolidation — document import path; defer **A** to post-consolidation feature track.

**Phase D scope:** **Out of scope.** Note in Builder helper text that Instructions/Examples may be imported via CSV.

**Explicit:** Authoring Instructions/Examples in the Builder UI **would be a new capability** — consolidation phase excludes it.

---

### OQ-PD-3 — Materials field vs clinical overlay

**Observation:** Builder requires `materials`; Instructions/Examples are import-only. Modal shows Success Criteria, Instructions, Examples — not a product question for Phase D unless founder wants parity.

**Recommendation:** No Phase D change; mention only if OQ-PD-2 later adds Instructions/Examples.

**Phase D scope:** Out of scope.

---

## 9. Invariants introduced by this contract

| ID | Invariant | Constrains |
|----|-----------|------------|
| **INV-PD1** | At most one Builder session; second session requires discard confirm if dirty | Navigation, list actions |
| **INV-PD2** | Dirty guard semantics survive route migration | All leave-session paths |
| **INV-PD3** | Save/Cancel always visible on builder routes without scrolling domain list | Sticky chrome |
| **INV-PD4** | Exactly one filled accent commit per UI context (list vs builder) | B5/B6 styling |
| **INV-PD5** | Primary authoring order: name → domains → targets; scoring settings not above first domain block | Form section order |
| **INV-PD6** | Builder routes use H1 **Pack Builder** only | B7 |

---

## 10. Audit vs code notes

| Topic | Audit | Code today | Disposition |
|-------|-------|------------|-------------|
| B2 fold positions (Add Domain y≈1062, Save y≈1243) | Measured QA | Form order matches: metadata/scoring before `border-t` domains; Save at bottom | **Agree** — fixed by §5 |
| B1 list visible while building | Yes | `showBuilder &&` inline; list always rendered below | **Agree** |
| B6 two primaries | Green + blue | `ContentPacks.tsx` L284–297 | **Agree** |
| Instructions/Examples | No authoring path | Type + CSV + modal display; no Builder fields | **Agree** — OQ-PD-2 |
| Phase C Reload button | Specified in C1 | No `Reload` string in `AssessmentBuilder.tsx` at verification | **Code gap** vs Phase C spec — not audit disagreement; track under C1 conformance, not Phase D structure |
| `updated_at` conflict | C1 required | Shipped in `ContentPacks` + `updateIfRevisionMatches` | **Agree** — preserve |

---

## 11. Builder touch list (implementation reference)

| File | Change class |
|------|----------------|
| `frontend/src/App.tsx` | Route `#/packs/build`, `#/packs/build/:packId` |
| `frontend/src/pages/ContentPacks.tsx` | List only; demote Upload; navigate to builder routes |
| `frontend/src/pages/PackBuilder.tsx` *(new)* or split | Builder route shell, sticky chrome, guard registration |
| `frontend/src/components/AssessmentBuilder.tsx` | Section order; remove duplicate titles/Save row; Advanced disclosure |
| `frontend/src/components/AssessmentBuilderTargetEditor.tsx` | Labeled remove target |
| `frontend/src/context/AssessmentBuilderNavigationGuard.tsx` | No semantic change; callers migrate |
| `frontend/src/components/Layout.tsx` | No change expected if guard API unchanged |
| `docs/architecture/assessment_builder_phase_d_structure_contract.md` | This contract |

**Out of scope this contract:** `assessmentPackCanonical.ts`, resolver, Matrix, outline component (D2), search (D3).

---

## 12. Acceptance checklist (Overseer)

**D1 (this contract):**

- [ ] Builder only on `#/packs/build` routes; list page has no inline panel
- [ ] H1 **Pack Builder** on builder routes; list H1 **Content Packs** unchanged
- [ ] Sticky Save/Cancel + dirty; no bottom Save row
- [ ] Primary order: title → domains → targets; scoring in Advanced
- [ ] One filled primary on list (Build Custom); Upload secondary
- [ ] Save filled in builder header; Add Domain/Target secondary labeled; deletes labeled
- [ ] All Phase C guards pass on new routes (§4 table)
- [ ] No Phase B/C scoring or session semantic changes

**D2 (follow-on — not this PR):**

- [ ] Outline jump navigation tested against **large real pack** (≥80 targets in one group or multi-domain ABLLS-shaped)

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-30 | Initial Phase D structure contract (C2) from audit B1–B7, Phase C guard migration, scale scope split |
