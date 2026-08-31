# Assessment Communication Report — Version History Contract (C3)

| Field | Value |
|-------|--------|
| **Document type** | Product architecture specification (Communication Report version history UI) |
| **Consolidation slice** | **C3** — after C0/C0.1, C1–C1.2 (Matrix header), C2/D1 (Pack Builder structure) |
| **Status** | Authoritative design contract — Builder implements without product interpretation on resolved items |
| **Binding context** | Consolidation phase in force (founder 2026-08-25, reiterated 2026-08-27): **surface existing capability only** — no new report fields, no new computation, no version diff |
| **Prerequisite data** | `assessment_communication_reports.version`, statuses `draft` \| `finalized` \| `superseded`, `embedded_computed` frozen at finalize — already implemented in `reportAuthoring.ts` |
| **References** | [`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) (§5.3, §7, §8.3–§8.4, INV-RA31) · [`assessment_snapshot_cycle_filtering_contract.md`](./assessment_snapshot_cycle_filtering_contract.md) (§5 — partial-record signalling precedent) · [`assessment_matrix_header_hierarchy_contract.md`](./assessment_matrix_header_hierarchy_contract.md) (document door UI names only) · [`tablet_touch_viability_contract.md`](./tablet_touch_viability_contract.md) (Report = computer surface) |
| **Verified against** | `frontend/src/services/reportAuthoring.ts` · `reportAuthoringRoles.ts` · `reportAuthoringTypes.ts` · `finalizedReportPresentation.ts` · `FinalizedAssessmentReport.tsx` · `ReportAuthoring.tsx` · `assessmentMatrixReportEntry.ts` · `clinicalExportAudit.ts` · `reportViewAudit.ts` · `audit.ts` |

**Anchor:** A Communication Report is a **clinical record that leaves the building**. When version *N+1* supersedes version *N*, someone may still hold *N*. The product must let authorised staff **find and read what was issued**, frozen exactly as signed — not recompute it, not confuse it with the current document, and not invent comparison metrics between versions.

**Lands with the C3 implementation it describes.** Do not treat this file as a standalone docs commit.

**Reference-Not-Duplicate (SPM Operating Contract §5.5):** This document owns **where** version history lives, **how** superseded documents are marked on screen and in print, **schema-version render policy** for historical rows, **role gates for history**, and **audit events** for viewing/printing superseded versions. It does not restate finalize computation, embed generation, six-section template, PHI dialog copy, or Matrix document doors beyond entry-point names.

**Amends authoring contract non-goal:** [`assessment_report_authoring_contract.md`](./assessment_report_authoring_contract.md) header listed “version-history browsing” as a non-goal for the **authoring** contract round. **C3 implements** the UI that §8.3 already promised (“historical read / optional print with version label”). Data model and finalize flow are unchanged.

---

## 1. Problem statement

**Gap:** Versioning exists end-to-end in the service layer but **no UI surfaces any version except the current one**.

| Capability (verified in code) | UI today |
|-------------------------------|----------|
| `listReportVersions(assessmentId, cycleId)` | Not called for display |
| `getCurrentFinalizedVersion` — `status = 'finalized'` max version | `FinalizedAssessmentReport` only |
| `finalizeReport` — prior `finalized` rows → `superseded` where `version < new` | Invisible after re-finalize |
| `createNewVersionDraftFromFinalized` | Write Report workspace only |

**Clinical stakes:** Re-finalize changes what the Communication Report says. Families and payors may hold an earlier PDF. Staff must recover **what was said then**, not what the current renderer would infer from live data.

---

## 2. What this contract does not change

| Area | Disposition |
|------|-------------|
| **Table schema** | `assessment_communication_reports` columns and status enum — unchanged |
| **Finalize flow** | `finalizeReport`, embed write, supersede update (`.lt('version', existing.version)`) — unchanged |
| **`createNewVersionDraftFromFinalized`** | Semantics unchanged — still duplicates `authoring` from current finalized into new draft |
| **Computation** | `buildEmbeddedComputedFromReportProfile`, Present Levels per-target anchoring, `priorCycles` load rules — unchanged |
| **Frozen snapshot rule** | Superseded and current rows render **`embedded_computed` + `authoring` as stored** — never live Matrix recomputation (G4/G5 territory) |
| **Six-section template** | No new sections, no `template_version` change |
| **Authoring workspace** | No redesign — one entry link to history only |
| **Version-to-version diff** | Explicitly out of scope — OQ-RVH-2 |
| **Aggregate figures** | INV-RA31 — no % / composite / index in list, chrome, or body |

---

## 3. Where history lives

### 3.1 Routes (binding)

Hash SPA — consistent with existing report routes (`assessmentMatrixReportEntry.ts`).

| Route | Purpose |
|-------|---------|
| `#/assessment/:assessmentId/report/finalized?cycleId=` | **Current issued report** (default Communication Report door) — unchanged default; `getCurrentFinalizedVersion` |
| `#/assessment/:assessmentId/report/finalized?cycleId=&version=` | **Specific issued row** by integer `version` (`finalized` or `superseded` only) |
| `#/assessment/:assessmentId/report/versions?cycleId=` | **Version history list** for that assessment + cycle |
| `#/assessment/:assessmentId/report/edit?cycleId=` | Write Report workspace — unchanged |

**Load rule for version param:**

- Resolve row from `listReportVersions(assessmentId, cycleId)` where `version` matches and `status ∈ { finalized, superseded }`.
- Reject `draft` rows on the finalized viewer route (drafts open only in Write Report).
- If `version` omitted on finalized route: current behaviour (`getCurrentFinalizedVersion`).

**Invariant INV-RVH-1:** Opening a historical version never mutates server state and never recomputes `embedded_computed`.

### 3.2 Entry points (binding)

| From | Control | When visible |
|------|---------|--------------|
| **Communication Report** (`FinalizedAssessmentReport`) | Text link **“Version history”** (secondary; not a second primary) | `listReportVersions` returns **any** `superseded` row for scope, **or** `version > 1` with at least one issued row |
| **Write Report** (`ReportAuthoring`) | Same link in workspace chrome | Same condition **or** page state `needs_new_version` (finalized exists) |

**Not an entry point:** Matrix overflow **Communication Report** door continues to open **current** finalized only (`buildFinalizedReportRouteHash` — no `version` param). History is one click from that document, not a fourth Matrix door.

**Document door names (UI only):** Assessment Snapshot · Write Report · Communication Report — per C1; code route names unchanged until terminology sweep.

### 3.3 Version history list — columns (binding)

List shows **issued rows only** (`status = 'finalized'` or `status = 'superseded'`). **Draft rows are excluded** — in-progress amendment stays in Write Report.

Per row, show **only**:

| Column | Source | Notes |
|--------|--------|-------|
| **Version** | `version` | `v{N}` — primary identifier |
| **Status** | `status` | **Current** (finalized) or **Superseded** — text badge, not colour-only |
| **Finalized** | `finalized_at` | Locale date; `—` if null (should not happen on issued rows) |
| **Finalized by** | `finalized_by` | Display name when resolvable from profile; else opaque id or `—` |

**Explicitly forbidden on the list:**

- Diff columns, delta counts, or “what changed” summaries
- Any aggregate percentage, composite, or index (INV-RA31)
- Comparison of Present Levels between versions
- Opening Compare UI or cycle-to-cycle language

**Row action:** **View** → `#/assessment/:id/report/finalized?cycleId=&version=N`.

**Current row:** Visually distinct (e.g. “Current” badge) but **same list** — not a separate screen.

**Empty state:** Single `v1` current only — hide **Version history** link (no list route needed).

---

## 4. Superseded version — on-screen and print marking

### 4.1 Precedent — Snapshot partial scope (do not invent second vocabulary)

[`assessment_snapshot_cycle_filtering_contract.md`](./assessment_snapshot_cycle_filtering_contract.md) founder reduction (2026-08-12):

- **Same artifact name** (Assessment Snapshot) — no second product class
- **Withdrawn:** banner, distinct title, per-page running headers
- **Kept:** honest **metadata line** in the existing document header block (cycle scope line: included cycles **and** total), plus filename token `partial`, plus structural truth of what is on the page

**Apply the same pattern to superseded Communication Reports:**

| Snapshot partial signal | Communication Report superseded signal |
|-------------------------|----------------------------------------|
| Same product name | Same — **Assessment Communication Report** / door name **Communication Report** |
| Metadata line in header block | **Document status** line in Overview metadata (§4.2) |
| Filename token `partial` | Filename token **`superseded`** (§6.2) |
| No banner | **No banner** |
| Structural omission of non-selected cycles | **N/A** — full embed is shown; status line states non-current |

Do **not** introduce a second artifact class (e.g. “Historical Communication Extract”). Do **not** add a page-top banner unless founder explicitly reopens Snapshot ceremony (out of scope).

### 4.2 Document status line (binding)

Add to **Overview** metadata grid (same region as existing **Report version** field in `FinalizedReportDocument.tsx`), visible on **screen and print**:

| Row status | **Document status** value (normative substance) |
|------------|--------------------------------------------------|
| `finalized` (current) | **Current issued report** |
| `superseded` | **Superseded — not the current issued report.** Optional second sentence: **Current version is v{M}.** where *M* is the current finalized version number for the scope (load via `getCurrentFinalizedVersion` for chrome only — not recomputation). |

**Also required on superseded rows (already partially present):**

- **Report version** — `v{N}` (unchanged field)
- **Finalized date** — add **Finalized** metadata field using `finalized_at` if not already on document chrome (authoring contract §8.4 requires `version` and `finalized_at` on finalized render — implement if missing)

**Screen chrome (non-print):** Optional slim page notice above document for `superseded` — **secondary** to metadata line; may duplicate status text for skim readers. Print relies on **metadata line + filename** (Snapshot precedent: metadata is load-bearing for downstream readers).

**Invariant INV-RVH-2:** A superseded document must be **mistakable for the current issued report** only by deliberate negligence — not by normal skim of header metadata.

---

## 5. Old `computed_schema_version` — render policy

### 5.1 Facts (verified)

| Fact | Where |
|------|--------|
| Current renderer schema constant | `REPORT_EMBEDDED_COMPUTED_SCHEMA_VERSION = 5` (`reportAuthoringTypes.ts`) |
| Discriminator | `selectPresentLevelsRenderBody` (`finalizedReportPresentation.ts`) |
| `computed_schema_version == null` | **Legacy** path — partial legacy Present Levels handling; not v5 change metrics |
| `computed_schema_version === 5` + valid change-metric shape | **Current** body |
| `computed_schema_version === 5` + invalid shape | **Corrupt** — visible error; print withheld |
| Any other declared version | **Corrupt** today |
| Print gate | `finalizedReportAllowsPrintEmission` — false when corrupt |

Older finalized rows may carry fat/orientation embed shapes (authoring contract §5.2.2 superseded table) with **absent** `computed_schema_version` or pre-cut payloads.

### 5.2 Binding policy — reuse the shipped renderer (C3)

C3 **does not** add a supported-schema registry, new Present Levels render tiers, or per-tier fixtures. That discriminator **already shipped**. Every issued row (current `finalized` or `superseded`) renders through **`FinalizedReportDocument`** (`frontend/src/components/report/FinalizedReportDocument.tsx`) exactly as it stands.

**Do not** silently “upgrade” old embeds at view time. **Do not** send a null-schema row through the v5 change-metrics widgets.

**Discriminator (unchanged)** — `selectPresentLevelsRenderBody` in `frontend/src/utils/finalizedReportPresentation.ts`:

| Result | Condition | Existing behaviour |
|--------|-----------|-------------------|
| **`legacy`** | `computed_schema_version` is `null` / absent | Present Levels body is the existing heading-only branch. Stored fat domain rows, when present on the embed, are read by **`legacyPresentLevelsDomainRows`** and used for honest goal headings via **`resolveGoalDomainHeading`**. No v5 change-metric widgets. No Matrix recomputation. |
| **`change_metrics`** | `computed_schema_version === 5` and a valid change-metric body | Current Present Levels body |
| **`corrupt`** | Any other declared version, or v5 with an invalid shape | Visible **`PRESENT_LEVELS_CORRUPT_EMBED_MESSAGE`**. **`finalizedReportAllowsPrintEmission`** is false; **`FINALIZED_REPORT_PRINT_UNAVAILABLE_MESSAGE`** is the print-withheld reason. |

A superseded row with `computed_schema_version == null` **must** take the same `legacy` path a current finalized null-schema row already takes. If it does not, that is a defect — do not work around it with a second renderer.

**OQ-RVH-5:** **Resolved by existing behaviour.** `legacyPresentLevelsDomainRows` already surfaces stored fat domains where they exist on the JSON (goal headings), without treating them as an authoritative v5 Present Levels body. C3 does not re-decide this.

### 5.3 What C3 actually cost

C3 built no schema registry and no new render path. Cost is reuse plus one gate extension:

| Item | What was built |
|------|----------------|
| **Renderer** | Reuse of existing `FinalizedReportDocument` and shipped `selectPresentLevelsRenderBody` (`legacy` / `change_metrics` / `corrupt`). |
| **Snapshot gate** | `finalizedReportHasRenderableSnapshot` extended to accept `status === 'superseded'` when `embedded_computed != null`. |

**Rejected for C3:** A supported-schema registry, new Present Levels render paths, per-tier fixtures, and “best effort” field mapping across schema versions.

---

## 6. Print and export of superseded versions

### 6.1 Permitted (binding — extends §8.3)

Authoring contract §8.3: `superseded` → **Historical read / optional print with version label**. **C3 implements that optional print.**

| Rule | Binding |
|------|---------|
| **Who may print** | **`admin` and `senior_therapist` only** — same as current (`canPrintFinalizedReport`) |
| **Therapist / viewer** | May **view** superseded on screen if they can view finalized; **must not** print (no Print control) |
| **PHI gate** | **Unchanged** — `ReportExportDialog` + `hasReportExportAcknowledged` before `window.print()` |
| **Ack namespace** | Per assessment (`report-export-ack:`) — unchanged; re-ack acceptable when printing a different version number |
| **Print payload** | Renders **that row’s** frozen `embedded_computed` + `authoring` through `FinalizedReportDocument` / `selectPresentLevelsRenderBody` (§5) |
| **Print withheld** | When the discriminator returns **`corrupt`** — same as current finalized corrupt behaviour (`finalizedReportAllowsPrintEmission` is false) |

### 6.2 What the printed artifact says about itself

| Channel | Requirement |
|---------|-------------|
| **On-document** | §4.2 **Document status** line + **Report version** + **Finalized** date in Overview metadata — **print CSS must include these** (G4: display = print for that row’s stored payload) |
| **Browser suggested filename** | Include token **`superseded`**, report **`version`**, and assessment id slug — parallel to Snapshot `assessment-snapshot-partial-…` pattern. Example shape: `communication-report-superseded-v2-{assessmentId}-{date}.pdf` (exact composition implementation; **must** include `superseded` and `v{N}`) |
| **Current version print** | Filename **must not** include `superseded` token |

**No HTML export path** for Communication Report in scope today — print/Save-as-PDF only.

---

## 7. Roles (verified in code; product caution)

**Verified** (`reportAuthoringRoles.ts` + service `assertAuthoringRole`):

| Action | admin | senior_therapist | therapist | viewer |
|--------|-------|------------------|-----------|--------|
| Write Report / create draft / finalize | ✓ | ✓ | ✗ | ✗ |
| View **current** Communication Report | ✓ | ✓ | ✓ | ✓ |
| **Print** (PHI gate) | ✓ | ✓ | ✗ | ✗ |
| `listReportVersions` / service read | No role gate in service — **UI must gate** | | | |

**C3 binding (UI gates):**

| Surface | admin | senior_therapist | therapist | viewer |
|---------|-------|------------------|-----------|--------|
| **Version history list** | ✓ | ✓ | ✓ | ✓ |
| **View superseded document** | ✓ | ✓ | ✓ | ✓ |
| **Print superseded** | ✓ | ✓ | ✗ | ✗ |
| **Link from Write Report** | ✓ | ✓ | ✗ | ✗ |

**Rationale:** Viewing what was issued is internal clinical record access — same class as viewing current finalized (therapist/viewer allowed). **Distributing** a superseded PDF remains senior/admin only (OQ-RA2).

**Product caution (founder):** `senior_therapist` was first exercised live 2026-08-30. **Code treats `admin` and `senior_therapist` identically** for all report role helpers today — no finer-grained distinction exists to verify. If policy should differ, that is **OQ-RVH-3** — not inferrable from code.

---

## 8. Audit

### 8.1 Events (binding)

Extend existing patterns — do **not** invent a parallel audit system.

| User action | `action` | `entity_type` | `details` (minimum) |
|-------------|----------|---------------|---------------------|
| Open **version history list** | `VIEW` | `report` | `artifact: 'report'`, `surface: 'version_history'`, `assessment_id`, `cycle_id` |
| Open **specific version** (including current) on finalized viewer | `VIEW` | `report` | `artifact: 'report'`, `surface: 'version_document'`, `version`, `status` (`finalized` \| `superseded`) |
| PHI ack before print (any issued version) | `EXPORT` | `assessment` | Existing — `event: 'acknowledgement'`, `channel: 'print'`, `artifact: 'report'`, `mode: 'standard'`, **`version`** (§7.3 authoring contract) |
| Print / Save as PDF (any issued version) | `EXPORT` | `assessment` | Existing — `event: 'print'`, `channel: 'print'`, `artifact: 'report'`, `mode: 'standard'`, **`version`** |

**`version` in audit must match the row printed or viewed** — authoring contract §7.3 / §8.4.

**Implementation note:** Reuse `logClinicalExportAudit` for print/ack; add a small `logReportViewAudit` (or equivalent) for `VIEW` events — fire-and-forget, never block UI.

**Not required:** Per-row audit on list render without opening a document (list open audit is sufficient).

---

## 9. Open questions (founder)

| ID | Question | Options | Recommendation | Phase |
|----|----------|---------|----------------|-------|
| **OQ-RVH-1** | Version-to-version diff UI | **A** Never · **B** Side-by-side prose later · **C** Automated diff | **A** — contradicts per-target model; defer | **Out of C3** |
| **OQ-RVH-2** | Show in-progress **draft** on history list for authors | **A** No — issued only (recommended) · **B** Show draft row with “In progress” | **A** — draft belongs in Write Report | C3 unless founder wants B |
| **OQ-RVH-3** | Differentiate `senior_therapist` vs `admin` on history/print | **A** Same gates (code today) · **B** Admin-only history | **A** — matches §8.1 table; therapist/viewer read is intentional | C3 |
| **OQ-RVH-4** | Exact **Document status** copy | Founder copy pass vs engineering strings in §4.2 | Adopt §4.2 substance until founder pass | C3 implementation |
| **OQ-RVH-5** | Legacy Present Levels content for pre-cut / null-schema rows | **A** Heading-only honest · **B** Render stored fat domains if present in JSON but non-authoritative | **Resolved by existing behaviour** (§5.2): `legacyPresentLevelsDomainRows` uses stored fat domains for goal headings only; Present Levels body stays heading-only; not an authoritative v5 body | **Resolved** (shipped; not re-decided in C3) |

---

## 10. Invariants (C3)

| ID | Invariant |
|----|-----------|
| **INV-RVH-1** | Historical view never recomputes `embedded_computed` |
| **INV-RVH-2** | Superseded documents carry honest non-current status in Overview metadata (screen + print) |
| **INV-RVH-3** | Unsupported schema → visible failure, not approximate render |
| **INV-RVH-4** | Version list and chrome introduce **no** aggregate percentage, composite, or index (extends INV-RA31) |
| **INV-RVH-5** | Print/ack audit `version` matches the row egressed |
| **INV-RVH-6** | G4 — on-screen render of a given row matches print of that same row’s stored payload |

---

## 11. Code vs authoring contract — alignment notes

| Topic | Authoring contract | Code today | C3 disposition |
|-------|-------------------|------------|----------------|
| Superseded historical read | §8.3 promised | No UI | **C3 delivers** |
| Version history browsing | Listed as authoring-contract non-goal | N/A | **Superseded by this document** for UI scope |
| `finalized_at` on document chrome | §8.4 requires | Overview shows version; **finalized date may be missing** on chrome | **Add** in C3 implementation |
| `finalizedReportHasRenderableSnapshot` | Implies issued snapshot | Checks `status === 'finalized'` only | **Extend** to `superseded` with `embedded_computed != null` |
| Service `listReportVersions` | Implied by versioning | Implemented, no auth check | **UI role gates** per §7 |
| `legacy` render (null-schema rows) | Model B legacy rows | `selectPresentLevelsRenderBody` → `legacy`; `legacyPresentLevelsDomainRows` for goal headings | **Explicit** policy §5.2 — no silent v5 render |

**No disagreement** on finalize, supersede SQL, or frozen snapshot rule — code matches authoring contract.

---

## 12. Builder touch list (implementation reference — not this task)

| File | Change class |
|------|----------------|
| `frontend/src/App.tsx` | Route `#/assessment/.../report/versions` |
| `frontend/src/pages/assessmentMatrixReportEntry.ts` | `buildVersionHistoryRouteHash`, version param reader |
| `frontend/src/pages/FinalizedAssessmentReport.tsx` | Load by version; superseded chrome; history link |
| `frontend/src/pages/ReportVersionHistory.tsx` *(new)* | Issued-only list |
| `frontend/src/pages/ReportAuthoring.tsx` | History link |
| `frontend/src/utils/finalizedReportPresentation.ts` | Reuse shipped `selectPresentLevelsRenderBody`; extend `finalizedReportHasRenderableSnapshot` |
| `frontend/src/components/report/FinalizedReportDocument.tsx` | Document status line; finalized date |
| `frontend/src/clinicalExport/reportViewAudit.ts` | VIEW events for history |
| `docs/architecture/assessment_report_version_history_contract.md` | This contract |

**Out of scope:** `reportAuthoring.ts` finalize/supersede logic, `reportEmbeddedComputed.ts` computation, diff UI, template changes.

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-31 | Initial C3 version history contract — routes, list, superseded marking (Snapshot precedent), print/audit/roles |
| 2026-08-31 | §5.2 corrected: no new schema registry; reuse shipped `selectPresentLevelsRenderBody` / `FinalizedReportDocument`; OQ-RVH-5 resolved by existing `legacyPresentLevelsDomainRows` |
| 2026-08-31 | Remaining sections reconciled with §5.2: §5.3 records actual C3 cost (reuse renderer + snapshot-gate extension); §6.1 uses `legacy` / `change_metrics` / `corrupt`; OQ-RVH-5 marked resolved in §9; remaining registry/tier vocabulary removed |
