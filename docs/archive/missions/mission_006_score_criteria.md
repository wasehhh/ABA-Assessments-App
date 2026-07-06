# Mission: Add Score Criteria to Builder (Builder Agent)

**Role**: Builder Agent
**Context**: ABA assessments (ABLLS, AFLS) require specific definitions for each score value (e.g., "4 = Independent", "3 = Minimally Prompted"). The current builder only allows setting the numeric scale (0-4) but not the *meaning* of each number.
**Objective**: Enhance the Assessment Builder to allow users to define text labels for each score in the scale.

## 1. Type Updates
-   **File**: `frontend/src/types/index.ts`
-   **Interface**: `Target.scoring`
-   **Action**: Ensure `scale_labels` is strictly typed as `Record<number, string>`.

## 2. Builder UI Updates
-   **File**: `frontend/src/components/AssessmentBuilder.tsx`
-   **Action**:
    -   When `ScoringType === 'numeric'`, render dynamic input fields for each number in the scale.
    -   *Example*: If Scale is `0, 1, 2`, render 3 text inputs:
        -   "Label for 0"
        -   "Label for 1"
        -   "Label for 2"
    -   Store these values in `target.scoring.scale_labels`.

## 3. Assessment Page Updates (Rendering)
-   **File**: `frontend/src/pages/AssessmentMatrix.tsx` (or wherever scoring happens)
-   **Action**: When displaying the scoring buttons, show these labels (e.g., in a tooltip or below the button) so the therapist knows what "2" means.

## 4. Output
-   Updated `types.ts`
-   Updated `AssessmentBuilder.tsx`
-   Updated `AssessmentMatrix.tsx` (to display labels)
