# Mission: Verify Assessment Builder (QA Agent)

**Role**: QA Agent
**Context**: The "Assessment Builder" feature has been implemented, replacing the old Excel workflow. The Backend has been removed.
**Objective**: Verify that the new "Native Builder" works correctly in the browser and that the app loads without backend errors.

## 1. Core Documents
- `docs/specs/master_app_specification.md` (Reference for expected behavior)

## 2. Test Plan

### Test Case A: App Initialization
1.  **Start App**: Run `npm run dev -- --port 3000`.
2.  **Verify Load**: Open `http://localhost:3000`. Ensure there are no "Connection Refused" errors in the console related to `localhost:8000` (since backend is gone).

### Test Case B: Create Custom Assessment
1.  **Navigate**: Go to "Content Packs" -> "Build Custom".
2.  **Form Entry**:
    -   Title: "QA Test Pack"
    -   Add Domain: "Domain A"
    -   Add Target:
        -   Title: "Target 1"
        -   **Materials**: "Red Block" (Verify field exists)
        -   **Examples**: "Show block" (Verify field exists)
        -   **Instructions**: "Say 'Match'" (Verify field exists)
        -   Scoring: Select "Numeric".
3.  **Save**: Click "Save Assessment Pack".
4.  **Verify**: Ensure the new pack appears in the list.

### Test Case C: Assign & Run
1.  **Navigate**: Go to "Clients" -> Select a Client.
2.  **Assign**: Assign the "QA Test Pack".
3.  **Run**: Open the assessment matrix.
4.  **Verify**: Click on "Target 1". Verify that the **Materials, Examples, and Instructions** are visible in the expanded view (or tooltip).

### Test Case D: Score Criteria Definitions
1.  **Builder**: In "QA Test Pack", set Target 1 scoring to "Numeric (0-4)".
2.  **Input Criteria**: Verify that inputs appear for "0 =", "1 =", etc. Enter "Independent" for "4".
3.  **Matrix**: Open the assessment matrix. Hover over the "4" button.
4.  **Verify**: Ensure a tooltip appears saying "4 = Independent".

### Test Case E: Assessment Cycles
1.  **Load Assessment**: Open the matrix for the assigned client.
2.  **Verify Cycle**: Check the console or network tab (if possible) to confirm a request was made to `assessment_cycles` or that the UI (if improved later) shows "Cycle 1".
3.  **Score & Save**: Click a score. Refresh the page.
4.  **Verify Persistence**: Ensure the score persists (proving it linked to the correct cycle).

### Test Case F: Global Score Criteria (Mission 007 Fix)
1.  **Builder**: Create a new pack. Keep "Use Global Scale" CHECKED.
2.  **Verify UI**: Ensure "Score Criteria Definitions" inputs appear in the main settings area (not hidden).
3.  **Input**: Enter "Mastered Global" for Score 4.
4.  **Save & Assign**: Save pack, assign to client.
5.  **Matrix**: Hover over Score 4. Verify tooltip says "Mastered Global".

## 3. Output
-   `docs/reports/qa/qa_report_builder_pivot.md`: A report detailing Pass/Fail for each step.
