# Mission: Pivot to Native Builder (Builder Agent)

**Role**: Builder Agent
**Context**: The project has pivoted from an "Excel-First" approach to a "GUI-First" Native Builder approach.
**Objective**: Remove the obsolete Python backend and upgrade the Frontend Assessment Builder to support rich metadata (Materials, Examples, Instructions).

## 1. Core Documents to Read
- `docs/specs/master_app_specification.md` (Updated Spec)
- `frontend/src/types/index.ts` (Current Data Model)
- `frontend/src/components/AssessmentBuilder.tsx` (Current GUI)

## 2. Tasks

### Phase A: Architecture Cleanup
1.  **DELETE** `backend/` directory entirely. (It was only for Excel parsing, which is now deprecated).
2.  **UPDATE** `frontend/src/services/packs.ts`:
    -   Remove `parseExcel` function.
    -   Remove any calls to `localhost:8000`.

### Phase B: Data Model Upgrade
1.  **UPDATE** `frontend/src/types/index.ts`:
    -   Add the following fields to the `Target` interface:
        -   `materials: string` (Required)
        -   `examples: string` (Optional)
        -   `instructions: string` (Optional)
        -   `success_criteria: string` (Ensure it exists)

### Phase C: GUI Enhancement
1.  **UPDATE** `frontend/src/components/AssessmentBuilder.tsx`:
    -   Update the "Add/Edit Target" form section to include inputs for:
        -   **Materials Needed** (Text Input)
        -   **Examples** (Text Area)
        -   **Instructions** (Text Area)
    -   Ensure these fields are saved in the `onSave` handler.

### Phase D: RLS Config (New Requirement)
1.  **CREATE** `frontend/supabase/migrations/20251211120000_secure_packs.sql`:
    -   Enable RLS on `content_packs`.
    -   Policy: "Users can view packs from their own organization."
    -   Policy: "Organization Admins can insert/update packs."

## 3. Constraints
-   **No Python Code**: Do not write any replacement Python code.
-   **Strict Types**: Ensure all new fields are properly typed in TypeScript.
-   **Preserve Existing Logic**: Do not break the existing "Scoring Type" or "Domain" logic.

## 4. Output
-   Deleted backend.
-   Updated Typescript interfaces.
-   Enhanced React Component (`AssessmentBuilder`).
-   New Migration file.
