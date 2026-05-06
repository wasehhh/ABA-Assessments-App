# Phase 0 Cleanup Tracker

## Purpose
Track and execute all cleanup tasks required to prepare the app for AIM Alpha.

This is the ONLY file used to track active Phase 0 work.

---

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

---

## P0 — Must Fix Before Alpha

### 1. Fix Client → New Assessment Flow
- [x] Identify where `#/create-assessment?client=` is triggered (see audit: Client Detail hub → `frontend/src/pages/ClientDetail.tsx`)
- [x] Decide correct behavior:
  - redirect to `#/assessments` with client pre-selected OR
  - implement proper route
- [x] Implement fix
- [x] Test:
  - [x] create from client page
  - [x] create from assessments page

---

### 2. Fix Export Consistency
- [x] Compare:
  - export from assessment list
  - export from matrix page
- [x] Identify scope difference (cycle vs all data)
- [x] Decide standard export behavior
- [x] Align both export paths
- [x] Validate CSV structure manually

---

### 3. Fix Therapist Assessment Visibility
- [x] Confirm current filtering behavior for therapist role
- [x] Identify where `statusFilter` is enforced
- [x] Decide expected visibility (should therapists see submitted/approved?)
- [x] Update UI and/or query logic
- [x] Test with:
  - [x] draft
  - [x] submitted
  - [x] approved assessments

---

### 4. Remove Debug Role Spoof
- [x] Locate debug role override logic
- [x] Remove OR guard behind dev-only condition
- [x] Confirm no runtime role switching in production (code inspection)
- [x] Confirm role strictly comes from DB (code inspection: profile only from `authService.getUserProfile`)
- [x] QA validate

---

### 5. Stabilize Supabase Setup (Critical)
- [x] Identify:
  - which SQL files are actually required
- [x] Document:
  - required tables
  - required RPC functions (`check_user_invite`, `claim_invite`)
- [x] Create:
  - `docs/architecture/supabase_setup.md`
- [x] Verify:
  - fresh environment can run core flows

---

### 6. Minimum Report Polish
- [x] Review current report layout
- [x] Improve:
  - spacing
  - headings
  - readability
- [x] Ensure:
  - printable format works cleanly
  - no broken data fields
- [x] Test:
  - real assessment data

---

## P1 — Strongly Recommended Before Alpha

### 7. Footer Links
- [x] Replace placeholders OR hide links

### 8. Browser Title
- [x] Update `<title>` to match app name

### 9. Pack Deletion Handling
- [ ] Identify behavior when pack is deleted
- [ ] Ensure assessments still show usable info

### 10. Audit Log Cleanup
- [x] Review audit entries
- [x] Ensure consistent `action` and `entity_type`
- [x] QA validate (new rows + legacy rows in UI)

### 11. Checkbox Scoring Handling
- [ ] Identify where checkbox packs break
- [ ] Decide:
  - disable OR
  - clearly label unsupported
- [ ] Prevent user confusion

---

## Execution Rules

- Only work on ONE task at a time
- Do not jump between tasks
- Do not add new features
- Do not skip testing
- Every completed task must be verified in UI

---

## Phase 0 Exit Criteria

Some items originally tracked under Phase 0 (e.g. report polish, footer links) were completed during Phase 1 work. This tracker reflects final system state rather than strict chronological execution.

Phase 0 is complete when:
- All P0 tasks are [x]
- No known blockers remain for AIM Alpha
- Core flows work end-to-end:
  - login
  - client
  - assessment
  - scoring
  - submission
  - export/report

### Post–Phase 0 follow-ups (resolved before Alpha)

After Phase 0 closure, an additional **workflow integrity** gap was discovered and resolved under **P0.5 — Workflow Integrity Layer** (see `docs/roadmap/aim_alpha_readiness_plan.md`, `docs/product/assessment_lifecycle.md`): **role-based post-submit editing**, **approved-state lock**, and related lifecycle checks were implemented and **QA-verified**.

**Client save error visibility:** Create/update failures on the client record now surface a **visible error banner**, preserve entered data, and keep the form open; **QA verified** before Alpha.

---

## UX Improvements (Post-P0)

### Return to Client After Cancel
- After initiating New Assessment from Client Detail, Cancel currently returns to the Assessments page.
- For better UX, it should return to the originating client page.
- This is acceptable for AIM Alpha but should be improved post-P0.