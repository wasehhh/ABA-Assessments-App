# Mission: Implement Assessment Cycles (Builder Agent)

**Role**: Builder Agent
**Context**: The data model needs to support longitudinal tracking. We are introducing "Assessment Cycles" (e.g., Initial, 6-Month) within a single Assessment container.
**Objective**: Update the Supabase Schema and TypeScript Types to support the `Assessment -> Cycle -> Score` hierarchy.

## 1. Schema Changes (SQL)
Create a new migration `frontend/supabase/migrations/20251212000000_add_cycles.sql`:

1.  **New Table**: `assessment_cycles`
    -   `id` (UUID, PK)
    -   `assessment_id` (UUID, FK to `assessments`)
    -   `cycle_number` (Integer, e.g., 1, 2, 3)
    -   `status` (Enum/Text: 'in_progress', 'locked')
    -   `start_date` (Date)
    -   `end_date` (Date, nullable)
    -   `created_at`, `updated_at`

2.  **Update Table**: `assessment_scores`
    -   Add `assessment_cycle_id` (UUID, FK to `assessment_cycles`).
    -   *Migration Strategy*: For existing scores, if any, create a "Cycle 1" for their assessment and link them. (Or just truncate if data is dummy).

## 2. Type Updates (TypeScript)
Update `frontend/src/types/index.ts`:
1.  Add `AssessmentCycle` interface.
2.  Update `AssessmentScore` interface to include `assessment_cycle_id`.

## 3. UI/Service Updates (Minimal)
1.  **Update** `assessments.ts` (Service):
    -   Add methods to `startCycle(assessmentId)`.
    -   Update `getScores` to accept `cycleId`.
2.  **Update** `AssessmentMatrix.tsx`:
    -   *Temporary Fix*: Just hardcode it to fetch/create "Cycle 1" on load so the app doesn't break. (Full UI for switching cycles will be a later mission).

## 4. Output
-   SQL Migration file.
-   Updated `types.ts`.
-   Patched `AssessmentMatrix.tsx` (to maintain functionality).
