# AIM Alpha Readiness Plan

## Purpose
Prepare the ABA Assessment Platform for a controlled Alpha test at AIM with 2 experienced staff members.

This plan is based on:
- `docs/audits/current_state_audit_2026_05_02.md`

## Alpha readiness status

**Ready for Alpha with constraints.** This is not a statement of production readiness, HIPAA certification, or completeness against any regulatory framework.

**Operational constraints for AIM Alpha:**

- Use **Chrome** for printable reports and Save as PDF.
- Use **numeric** and **yes/no** packs only during Alpha.
- Do **not** use checkbox / task-analysis packs during Alpha.
- **Senior Therapist / Admin** edit submitted assessments directly during review when permitted by role rules; there is **no return-to-therapist revision workflow** yet.
- The Supabase target environment must be **smoke-tested** before Alpha sessions (`docs/architecture/supabase_setup.md`).

## Alpha Goal
Validate whether the app can support a real assessment workflow without disrupting clinicians.

The Alpha is not intended to prove the full product is finished. It is intended to test:
- usability
- scoring workflow
- assessment setup
- cycle logic
- exports/reports
- staff feedback
- major workflow blockers

## Alpha Scope

### In Scope
- Login / invite flow
- Invites currently create a record and shareable link; email delivery is not automated in this Alpha version.
- Client creation
- Pack selection or upload
- Assessment creation
- Target scoring
- Cycle workflow
- Submit / approve flow
- Analysis tab
- CSV export
- Printable report
- Feedback collection

### Known Limitations (Alpha)
- Printable reports work in Chrome.
- Safari print preview may return blank pages and is not supported during Alpha.

### Out of Scope
- Parent portal
- Offline mode
- Scan import
- AI/ML features
- Advanced analytics
- Full mobile phone optimization
- Enterprise deployment
- Automated clinical recommendations

## P0 — Must Fix Before Alpha

### 1. Broken Client-Level “New Assessment” Route
**Issue:** `#/create-assessment?client=` is referenced but not routed.  
**Why it matters:** Staff may try to create assessments from the client detail page and get sent to the wrong place.  
**Required outcome:** New assessment creation must work from client detail or the button must be removed/redirected correctly.

### 2. Export Scope Inconsistency
**Issue:** Assessment list export and matrix export appear to export different score scopes.  
**Why it matters:** Clinicians need predictable exports.  
**Required outcome:** Export options must clearly state what they export and behave consistently.

### 3. Therapist Assessment Visibility
**Issue:** Therapists may not see submitted/approved assessments due to status filtering.  
**Why it matters:** Staff need to reliably find assessments during the Alpha.  
**Required outcome:** Assessment list visibility must be predictable for all roles.

### 4. Debug Role Spoof
**Issue:** Debug role override exists for a specific email.  
**Why it matters:** Not appropriate for external Alpha testing.  
**Required outcome:** Remove, disable, or strictly isolate debug-only behaviour.

### 5. Known Working Supabase Setup
**Issue:** Migration files and SQL snapshots may not fully align.  
**Why it matters:** The Alpha environment must be reproducible and stable.  
**Required outcome:** Document the exact DB setup currently required for the app to work.

### 6. Minimum Report Polish
**Issue:** Printable report is functional but basic.  
**Why it matters:** Reports may be shown to clinical leadership.  
**Required outcome:** Report should look credible enough for internal review.  
Report has been upgraded during Phase 1 and is considered sufficient for Alpha (Chrome-supported printing).

### P0.5 — Workflow Integrity Layer

**Status:** The post-submit editing inconsistency called out in earlier reviews has been **addressed and QA-verified** (not a claim of production-grade RLS or external compliance).

**Assessment lifecycle (app-level):** Draft and in-progress work proceeds to **submitted**, then **approved** when a reviewer approves. Status drives which actions appear in the UI and which mutations the app allows.

**Role-based editing (post-submit, current build):**

- **Therapist:** cannot edit after **submit**; read-only for submitted/approved as enforced by the app.
- **Senior Therapist / Admin:** can edit **submitted** assessments during review (direct edits in-product).
- **Approved** assessments are **locked for all roles** (no further scoring edits).
- **Viewer:** cannot edit assessments in any status.
- **Historical / non-active cycles** are **read-only** for editing paths that touch scored content.

**Approval lock:** Once an assessment is **approved**, it is immutable for scoring/editing through the supported UI paths described above.

## P1 — Strongly Recommended Before Alpha

### 1. Footer Legal Links
**Issue:** Alpha-safe placeholder pages implemented (`#/privacy` and `#/terms`).  
**Required outcome:** Keep those routes available for Alpha disclosure (or hide links only if policy requires).

### 2. Browser Title / Branding
**Issue:** Browser title does not match app branding.  
**Required outcome:** Use consistent app name.

### 3. Pack Deletion / Unknown Pack Handling
**Issue:** Deleted packs may show as unknown in lists.  
**Required outcome:** Snapshot-based assessments should remain understandable.

### 4. Audit Log Cleanup
**Issue:** Some audit events may use inconsistent action/entity labels.  
**Required outcome:** Alpha-critical events should be clear enough for review.

### 5. Checkbox / Task Analysis Scope
**Issue:** Builder supports checkbox scoring but scoring UI does not fully support it.  
**Required outcome:** Hide, defer, or clearly mark unsupported scoring types for Alpha.

## P2 — Defer Until After Alpha
- Offline mode
- Parent portal
- Scan import
- Multimodal LLM import
- Advanced charts
- AI-generated summaries
- Full mobile phone experience
- Enterprise-grade multi-site management

## Alpha Success Criteria
Alpha is successful if:
- Staff can log in and access the correct organization
- Staff can create or access a client
- Staff can create/open an assessment
- Staff can score targets without confusion
- Scores save correctly
- Assessment can be submitted/reviewed
- Analysis tab provides useful information
- Export/report is understandable
- Staff can explain what worked and what was confusing

## Alpha Failure Criteria
Alpha is not ready if:
- Users cannot reliably log in
- Staff cannot find the correct assessment
- Scores fail to save
- Export/report data is inconsistent
- Clinicians cannot understand the workflow
- The app crashes or blocks assessment completion

## Immediate Next Step
Convert each P0 item into a focused implementation task before doing any new feature work.