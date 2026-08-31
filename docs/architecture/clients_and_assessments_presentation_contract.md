# Clients & Assessments Presentation Contract (C4)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (Clients list, Assessments list, Client detail shell) |
| **Consolidation slice** | **C4** — last item in consolidation sequence after C1–C1.2, C2/D1–D1.1, C3 |
| **Status** | Authoritative design contract — Builder implements without product interpretation on resolved items |
| **Binding context** | Consolidation phase in force (founder 2026-08-25, reiterated 2026-08-27): **restructure what exists; no new capability** |
| **Audit source** | Vault `(C) Structural & Appearance Audit (2026-08-27).md` — findings **A1, A2, A4, A5, A6** (Assessments) and **C1, C3, C4, C5, C6** (Clients). **A3 / C2** status-badge labelling shipped C0.1 — **do not re-address** |
| **References** | [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) §4 (single-primary rule — cite only) · [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) (Clients / Assessments = computer surfaces; reachability only) · [`assessment_lifecycle.md`](../product/assessment_lifecycle.md) |
| **Verified against** | `Assessments.tsx` · `Clients.tsx` · `ClientDetail.tsx` · `Layout.tsx` · `assessmentService.getByOrg` / `delete` · `clientService.getByOrg` / `getById` · `types/index.ts` (`Assessment`, `Client`) |

**Anchor:** A list row’s job is to **identify a record and open it**. Export and Delete are side doors. Create is the page’s filled accent **only when creating is the job of the current filter**. Clients and Assessments teach **one** row model.

**Do not commit this document as part of an implementation PR unless separately instructed.**

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns the **shared list-row model**, **destructive-action policy** on these surfaces, **page-level primary accent** across Clients / Assessments / Client detail, **empty-state honesty**, and **navigation chrome consistency** for these routes. It does not restate Matrix scoring, Pack Builder, report authoring, or tablet scoring-path layout.

---

## Amendment banner — access and safety are not styling

| Finding | Class | Why |
|---------|-------|-----|
| **A1** | **Access defect** | Primary open affordance is `opacity-0` until hover; card is `cursor: pointer` with **no** `role` / keyboard contract. Always-visible control on a PHI row is **Export**. Hover-only primary **does not exist** for keyboard or touch. |
| **A5** | **Safety policy** | Delete is a peer icon beside Export, including on **approved** rows. Service `assessmentService.delete` has **no status gate**. Client detail already restricts delete to **draft** only — lists disagree. |

**Slice split is mandatory (§9):** access/safety work (**C4a**) must not land in the same diff as presentational work (**C4b**).

---

## 1. What this contract does not change

| Area | Disposition |
|------|-------------|
| Assessment **workflow** (submit / approve / cycles / Matrix) | Unchanged |
| **Scoring model** / Phase A–B | Unchanged |
| **Report** / Snapshot / Learner Map | Unchanged |
| Pack Builder | Unchanged |
| **New filters, search, bulk actions** | Out of scope |
| **New service methods or schema** | Out of scope — use only fields already returned (§5) |
| Tablet layout obligations | Clients / Assessments remain **computer surfaces**; no tablet redesign |

---

## 2. One row model (resolves A1 + C5)

### 2.1 What a row is

| Surface | Row represents | Destination |
|---------|----------------|-------------|
| **Assessments list** | One assessment | `#/assessment/:id` (Matrix) |
| **Clients list** | One client | `#/client/:id` (Client detail) |
| **Client detail → Assessments** | One assessment for that client | `#/assessment/:id` |

### 2.2 Primary action (binding)

**The primary action is Open / View the record.**

| Rule | Binding |
|------|---------|
| **Affordances** | Primary action is a **real control**: `<button>` or `<a>` (or a single focusable element with `role="link"` / `role="button"` and Enter/Space activation) — **not** a bare `div` with `onClick` and `cursor-pointer` alone |
| **Visibility** | Primary action is **always visible** at all breakpoints — **no** `opacity-0` / hover-only reveal |
| **Label** | Visible text: Assessments → **Open**; Clients → **View** (or the whole row is the named link — §2.3) |
| **Export / Delete / Archive / Edit** | **Secondary** (or tertiary destructive) — never the only visible control on the row |

**Invariant INV-CA1:** A keyboard user can Tab to the primary open control and activate it without a pointer. A touch user can hit the primary open control without hovering.

### 2.3 Row vs control (binding recommendation)

**Selected model — whole row is the primary control:**

- The row surface is one focusable control (or contains one full-width primary button covering the identity region) that navigates to the record.
- Secondary actions (**Export**, **Edit**, **Archive**, **Delete**) are **separate** buttons that `stopPropagation` / sit outside the primary hit target.
- Hover may **enhance** secondary visibility; it must **not** be required to discover Open/View.

**Rejected:** Export as the only always-visible control while Open is hover-only (current Assessments).

### 2.4 Pointer / keyboard / touch

| Input | Requirement |
|-------|-------------|
| **Pointer** | Click identity region or Open/View → navigate |
| **Keyboard** | Focusable primary; Enter (and Space if `role="button"`) activates; secondary actions independently focusable with visible labels or `aria-label` |
| **Touch** | Primary hit target always painted; no hover-gated primary |

**Tablet note:** These pages are **computer surfaces** (tablet contract). Even so, **A1’s hover-only primary is wrong on any coarse pointer** (e.g. clinic tablet opening Assessments in landscape). C4a must not rely on hover. No tablet layout redesign is in scope.

### 2.5 Code vs audit (C5)

| Claim | Code today |
|-------|------------|
| Assessments **Open →** hover-only | **Agree** — `opacity-0 group-hover:opacity-100` |
| Assessments **Export** always visible | **Agree** |
| Clients **View →** always visible | **Partial disagree** — View sits in `opacity-100 sm:opacity-0 group-hover:opacity-100`; on `sm+` View is also hover-gated. Mobile shows the cluster. |

**C4 binding:** Both surfaces use the §2.2 model — primary always visible at **all** breakpoints; secondary may remain quieter but must remain keyboard-reachable with labels.

---

## 3. Destructive actions (resolves A5; aligns Client detail)

### 3.1 Assessments — Delete policy (binding recommendation)

| Status | Delete offered on Assessments **list**? | Delete offered on Client detail assessment row? |
|--------|------------------------------------------|--------------------------------------------------|
| **`draft`** | Yes — admin / senior_therapist | Yes — today already |
| **`in_progress`** | Yes — admin / senior_therapist | **Align to same rule** (today: Client detail only offers draft) |
| **`submitted`** | **No** | **No** |
| **`approved`** | **No** | **No** |

**Approved-record answer (explicit):** An **approved** assessment is a locked clinical record. **It must not be deletable from a list row.** Removing approved clinical records, if ever allowed, is a founder product/policy decision outside consolidation — not a peer of Export on a card.

**Submitted:** Same list prohibition — awaiting or completed review must not be one-click wiped from the directory.

**Service note:** `assessmentService.delete` still has no status gate today. **C4a UI must not offer** illegal deletes. Hardening the service to refuse non-draft / non-active deletes is **recommended** in the same access/safety slice (behaviour change, not presentation) — OQ-CA-1 if founder wants service refuse vs UI-only.

### 3.2 Assessments — Export vs Delete (binding)

| Control | Placement | Label | Peer relationship |
|---------|-----------|-------|-------------------|
| **Open** | Primary — always visible | **Open** | — |
| **Export** | Secondary — overflow **⋯** / **More** on the row, or labeled **Export** text button | Visible text or `aria-label="Export assessment data"` — **not** icon-only without name | **Not** peer of Delete |
| **Delete** | Tertiary destructive — only when §3.1 allows | Visible **Delete** (or icon + `aria-label` including client + pack) | Never beside Export as equal-weight icons |

**Confirmation (unchanged class):** Existing `ConfirmDialog` destructive confirm remains; copy must name the assessment (client + pack) and that the action cannot be undone.

### 3.3 Clients — Archive / Delete (binding)

| Action | Where | When |
|--------|-------|------|
| **Archive** | Clients list (active filter) + optional Client detail | admin / senior; confirm dialog |
| **Permanent delete** | Clients list **archived** filter only (as today) | admin / senior; strong confirm |
| **Edit** | List **and** Client detail (§7) | admin / senior |

Archive remains the soft remove for active clients; permanent delete stays archived-only. **Not** peers of View.

---

## 4. One visual hierarchy (resolves A2 create CTA, C3 blue/green, C6)

### 4.1 Single-primary rule (cited)

From [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) §4:

> At most **one** filled accent commit control is visible to the **current actor** in the **current mode**, and every mode in which a commit action is legal for that actor **MUST** render it as that control. Competitors are demoted.

### 4.2 Page contexts → filled accent

| Context | Actor job | Single filled accent | Competitors |
|---------|-----------|----------------------|-------------|
| Assessments · **Active** tab | Create assessment (admin/senior) | **New Assessment** (emerald — product standard) | — |
| Assessments · **Submitted** tab | Review queue — not create | **None** | Hide New Assessment **or** demote to outline/text; empty state must **not** push create |
| Assessments · **Approved** tab | Read finalized records | **None** | Same — **no** filled New Assessment |
| Clients · **Active** filter | Add client (admin/senior) | **Add Client** (emerald) | — |
| Clients · **Archived** filter | Restore / manage archive | **None** | Add Client **hidden** or demoted secondary — not filled green |
| Client detail · client **active** | Start assessment for this client | **New Assessment** (emerald — **same** as Assessments list; **not** blue) | — |
| Client detail · client **archived** | Read / restore path | **None** for New Assessment | — |

**C3 blue/green:** Client detail’s `bg-blue-600` New Assessment **aligns to emerald** to match Assessments. One product accent for “create assessment.”

**Roles:** Create filled accents remain **admin / senior_therapist** only (Assessments already; Client detail button today lacks role gate — **C4a/C4b must gate** New Assessment on detail to the same roles).

---

## 5. What a row must carry (resolves A6, C1) — existing data only

### 5.1 Assessments list — fields already returned

`assessmentService.getByOrg` selects `*, client:clients(first_name, last_name), pack:content_packs(title, version)`.

| Field | Available today? | Shown today? | C4 use |
|-------|------------------|--------------|--------|
| Client name | Yes | Yes | Keep |
| Pack title | Yes (`pack.title`) | Yes | Keep |
| **Pack version** | Yes (`pack.version`) | **No** | **Show** — e.g. `Pack title · v{version}` — distinguishes pack revisions |
| **Assessment date** | Yes (`assessment_date`) | **No** | **Show** when non-null — clinical date; fallback to `created_at` label as “Created” when null |
| `created_at` | Yes | Yes (as bare date) | Keep as secondary if assessment_date null; otherwise demote or omit duplicate |
| Status badge | Yes | Yes | Keep (C0.1 labels) |
| Assigned presence | Yes (`assigned_to`) | Presence label only | Keep as-is — assignee **name** not joined today |
| `submitted_at` / `approved_at` | Yes on row | No | Optional secondary on Submitted/Approved tabs only — **not required** if assessment_date + version suffice |

**A6 binding:** Two assessments sharing the same pack title must differ by at least **client** (already) plus **assessment date and/or pack version** in the visible identity line.

**Not available without new query:** cycle count, domain coverage, score progress. **Out of scope.**

### 5.2 Clients list — fields already returned

`clientService.getByOrg` returns `Client`: `id`, `first_name`, `last_name`, `date_of_birth`, `created_at`, `status`, …

| Field | Available? | Shown today? | C4 use |
|-------|------------|--------------|--------|
| Name | Yes | Yes | Keep |
| DOB | Yes | Yes | Keep |
| **`created_at`** | Yes | **No** | **Show** as “Added {date}” — only work-adjacent signal on the row without a new query |
| Assessment count / status / last activity | **No** on this endpoint | — | **Out of scope** — requires join or second query (**OQ-CA-2**) |

**C1 honesty:** Consolidation cannot invent assessment summaries on the client card. Showing **Added** date is the maximum from existing list payload. Richer “work” metadata is a **post-consolidation** data-shape decision.

### 5.3 Client detail assessment rows

Already richer (pack title from `pack_snapshot`, created, submitted when applicable, status). Align delete with §3.1; keep open as real `<button>` (already).

---

## 6. Empty states and filters (resolves A2, A4)

### 6.1 Empty states (binding)

| Tab / filter | Empty copy substance | Create CTA? |
|--------------|----------------------|-------------|
| Assessments · Active | No active assessments | **Yes** — text/secondary link for admin/senior (“New Assessment”) — may match header primary |
| Assessments · Submitted | No assessments awaiting review | **No** create CTA. Optional: “Active assessments appear on the Active tab.” |
| Assessments · Approved | No approved assessments | **No** create CTA |
| Clients · Active | No active clients | **Yes** — Add Client for admin/senior |
| Clients · Archived | No archived clients | **No** Add Client CTA |

**Forbidden:** Submitted/Approved empty states saying “Get started by creating a new assessment” (current Assessments empty copy — **agree with audit**).

### 6.2 Filter counts (A4)

| Option | Cost | Recommendation |
|--------|------|----------------|
| **A — No counts** — relocate status **legend** beside the filter control cluster | Presentation only; uses no new data | **Selected for C4b** |
| **B — Counts via `getByOrg(orgId, 'all')` then client-side filter** | Existing service method; changes load strategy (one fetch vs three) | Defer — OQ-CA-3 |
| **C — New count endpoint** | New query | **Out of scope** |

**A4 binding for C4:** Move the Active/Submitted/Approved explanation next to the filter controls (one cluster). **Do not** add counts in C4 unless founder picks OQ-CA-3 **B**.

---

## 7. Navigation consistency (resolves C3 Back / nav current, C4 Edit)

| Issue | Binding |
|-------|---------|
| **Client detail Back** | Keep **labeled** “Back to Clients” (chevron + text). Align colour to product secondary (neutral / emerald text — **not** a second filled primary). |
| **Matrix Back** | Already C1-labeled (“Assessments” / `aria-label`) — do not reopen here |
| **Nav current** | `#/client/:id` (and nested client routes) must mark **Clients** as the current Layout nav item — same pattern as assessment routes marking Assessments if already done |
| **Edit client** | **Edit** available on **Client detail** for admin/senior (form or navigate-to-edit). List Edit may remain as secondary. Display page without Edit is rejected for C4 |

**New Assessment role gate on Client detail:** Match Assessments list — admin / senior only.

---

## 8. Slice split (mandatory)

| Slice | Contents | Must not include |
|-------|----------|------------------|
| **C4a — Access & safety** | Always-visible primary Open/View; real control semantics (role/keyboard); Export demoted from sole always-visible peer; Delete labeling; **status-gated Delete** (§3.1); optional service refuse for approved/submitted delete; Client detail New Assessment **role gate**; Client detail delete align to §3.1 for `in_progress` | Colour tokens, legend move, empty-state copy polish, pack-version display, emerald alignment |
| **C4b — Presentation** | Emerald New Assessment on Client detail; hide/demote create on Submitted/Approved/Archived; empty-state copy (§6.1); legend placement (§6.2); assessment_date + pack version on rows; client `created_at`; Edit on detail; Layout current for `#/client/:id`; Back colour consistency | Shipping without C4a primary-action fix |

**Order:** **C4a before or independent of C4b.** Do not merge into one diff.

**D1 analogy:** Same pattern as Pack Builder D1a/D1b — behaviour/access first; chrome second.

---

## 9. Invariants

| ID | Invariant |
|----|-----------|
| **INV-CA1** | Primary open/view is always visible and keyboard-activatable |
| **INV-CA2** | Approved (and submitted) assessments are not deletable from list UI |
| **INV-CA3** | At most one filled create accent per page context (§4.2) |
| **INV-CA4** | Empty states never advertise create when create cannot produce the missing tab’s records |
| **INV-CA5** | Row identity uses only fields already returned by list services (§5) |

---

## 10. Open questions (founder)

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **OQ-CA-1** | Should `assessmentService.delete` **refuse** submitted/approved server-side? | **A** Yes (fail closed) · **B** UI-only | **A** — list UI alone is not enough |
| **OQ-CA-2** | Client card assessment count / last activity | **A** Out of consolidation · **B** New aggregate query post-Alpha | **A** — show `created_at` only now |
| **OQ-CA-3** | Filter tab counts | **A** No counts (legend move only) · **B** `getByOrg(..., 'all')` + client counts | **A** for C4; **B** later if needed |
| **OQ-CA-4** | Delete `in_progress` from lists? | **A** Allow (with confirm) · **B** Draft only | **A** — matches “active work may be discarded”; Client detail should match |
| **OQ-CA-5** | Assignee **name** on assessment rows | Requires user join — new select shape | **Out of scope** — keep presence label |

---

## 11. Builder touch list (implementation reference)

### C4a

| File | Change |
|------|--------|
| `frontend/src/pages/Assessments.tsx` | Primary Open always visible + real control; Export secondary; Delete gated + labeled |
| `frontend/src/pages/Clients.tsx` | Primary View always visible at all breakpoints; secondary actions labeled |
| `frontend/src/pages/ClientDetail.tsx` | Role-gate New Assessment; align assessment delete to §3.1 |
| `frontend/src/services/assessments.ts` | Optional status refuse on delete (OQ-CA-1) |

### C4b

| File | Change |
|------|--------|
| `frontend/src/pages/Assessments.tsx` | Empty states; create accent by tab; legend placement; date + pack version |
| `frontend/src/pages/Clients.tsx` | Add Client accent by filter; `created_at` on card |
| `frontend/src/pages/ClientDetail.tsx` | Emerald New Assessment; Edit on detail |
| `frontend/src/components/Layout.tsx` | Current nav for `#/client/:id` |

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-31 | Initial C4 Clients & Assessments presentation contract — shared row model, delete safety, hierarchy, existing-data identity, slice split C4a/C4b |
