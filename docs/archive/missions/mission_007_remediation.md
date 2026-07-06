# Mission: Remediation & Fixes (Builder Agent)

**Role**: Builder Agent
**Context**: QA verified the "Assessment Cycles" work but found two critical issues: a missing database table (`user_profiles`) and a UX gap where "Score Criteria" inputs were invisible in the default "Global Scale" mode.

**Objective**: Restore the database schema and fix the Builder UX to support Global Score Definitions.

## 1. Database Restoration
-   **Context**: The `user_profiles` table was seemingly lost or not migrated. A recovery migration file exists.
-   **Action**: Execute the pending migration: `frontend/supabase/migrations/20251212000001_restore_schema.sql`.
-   **Verify**: Ensure `user_profiles` exists.

## 2. Assessment Builder UX Fix
-   **Context**: The "Score Criteria Definitions" (e.g., "4 = Independent") were only added to the *Individual Target* view. They are hidden when "Use Global Scale" is checked (which is the default).
-   **File**: `frontend/src/components/AssessmentBuilder.tsx`
-   **Action**:
    1.  Add state for global scale labels: `const [globalScaleLabels, setGlobalScaleLabels] = useState<Record<number, string>>({});`
    2.  Add the **UI Inputs** for these labels in the "Global Scale" section (below the "Default Scoring Scale" input).
    3.  **Update `handleSubmit`**: If `useGlobalScale` is true, map through `domains` and `targets` and inject the `globalScaleLabels` into every target's `scoring.scale_labels`.

## 3. Review Types
-   Ensure `frontend/src/types/index.ts` correctly defines `scale_labels` (this should be done, but double-check).

## 4. Output
-   Confirmed DB migration.
-   Updated `AssessmentBuilder.tsx`.
