# QA Test Plan: Assessment Workflow

## Feature Overview
- **Goal**: Verify the end-to-end flow of assigning an assessment, scoring items, and finalizing.
- **Components**: `CreateAssessment.tsx`, `AssessmentMatrix.tsx`, `assessments.ts`.
- **Critical Requirement**: Data integrity of scores, proper status transitions, correct UI rendering.

## Test Environment
- **URL**: `/assessments/new`, `/assessments/:id`
- **Roles**: All (Admin assigns, Therapist scores, Supervisor reviews).

## Test Cases

### 1. Assessment Assignment (Admin/BCBA)
- **Steps**:
  1. Navigate to client profile or "New Assessment".
  2. Select Client: "John Doe".
  3. Select Framework: "ABLLS-R".
  4. Assign to: "Therapist Jane".
  5. Click "Create".
- **Expected Result**:
  - Redirect to Assessment Matrix.
  - `assessments` table has new row.
  - `status` is `draft` (or `in_progress`).
  - `pack_snapshot` is populated with the framework data at that point in time.

### 2. Scoring Interface (Therapist)
- **Pre-condition**: Assessment exists and is assigned to user.
- **Steps**:
  1. Open Assessment Matrix.
  2. Locate "A1".
  3. Click score "2" (assuming 0-4 scale).
  4. Add note: "Prompted".
- **Expected Result**:
  - UI updates immediately (optimistic).
  - DB `assessment_scores` table updates/inserts row.
  - `scored_by` is current user.
  - `score_value` = 2.

### 3. Logic: Max Score Constraint
- **Pre-condition**: Item Max Score is 2.
- **Steps**: Attempt to enter score "4" (if input allows) or verify UI doesn't show "4" button.
- **Expected Result**:
  - UI only shows valid options 0, 1, 2.
  - API rejects invalid score (if bypassed).

### 4. Progress Persistence
- **Steps**:
  1. Score 5 items.
  2. Refresh page.
- **Expected Result**:
  - Scores persist.
  - Notes persist.
  - Percentage complete updates.

### 5. Finalization (Supervisor)
- **Steps**:
  1. Login as Supervisor.
  2. Review Assessment.
  3. Click "Finalize / Approve".
- **Expected Result**:
  - Status changes to `approved` / `finalized`.
  - Assessment becomes Read-Only for Therapist.
  - "Submitted At" / "Approved At" timestamps set.

## Failure Scenarios to Test

### 1. Concurrent Edits
- **Scenario**: Two therapists scoring same assessment same time.
- **Expected Behavior**: Last write wins (Supabase default). Real-time subscriptions should ideally update UI (Need to verify if `useSubscription` is used).

### 2. Offline Scoring
- **Scenario**: Network disconnect while scoring.
- **Expected Behavior**: Optimistic UI stays. Error toast on reconnection/failure? (Current code review suggests `react-query` or direct `supabase` calls—need to verify offline handling).

### 3. Deleted Framework
- **Scenario**: Delete original Content Pack after assignment.
- **Expected Behavior**: Assessment continues to work because it uses `pack_snapshot` (stored JSON) in the `assessments` table.
- **Verification**: Ensure `pack_snapshot` is actually used for rendering, not the live `content_packs` row.

## Manual Verification Steps
1. Create Dummy Client.
2. Upload Dummy Framework.
3. Assign.
4. Score a few items.
5. Check Supabase Dashboard for data rows.
