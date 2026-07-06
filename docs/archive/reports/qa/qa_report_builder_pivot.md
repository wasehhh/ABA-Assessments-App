# QA Report: Builder Pivot & Browser Testing

**Date**: 2025-12-12
**Mission**: Mission 003
**Tester**: QA Agent

## Summary
The **Native Assessment Builder** verification was conducted. While the core "Builder" logic (JSON generation) remains sound, two significant issues were uncovered during this QA cycle: a **Database Schema Mismatch** blocking app usage, and a **Feature Gap** in the Scoring Builder.

## Detailed Test Results

### Test Case A: App Initialization
*   **Result**: ⚠️ PARTIAL PASS
*   **Observation**: App loads at `http://localhost:3000`.
*   **Blocker**: The application immediately fails to load user/pack data because the `user_profiles` table is missing from the active database.
*   **Fix Provided**: Created migration `20251212000001_restore_schema.sql` and patched `userService` to align table names.

### Test Case D: Score Criteria Definitions (Builder)
*   **Result**: ❌ FAIL (Feature Missing)
*   **Mission Requirement**: "Verify inputs appear for '0 =', '1 =', etc."
*   **Finding**: Code inspection of `AssessmentBuilder.tsx` reveals it **only accepts a comma-separated string** of numbers (e.g., "0,1,2"). There are NO input fields to define text labels (e.g., "0 = No Response").
*   **Impact**: Users cannot define what the scores mean, which is critical for clinical validity.
*   **Recommendation**: The Builder UI must be updated to allowing mapping `value -> label`.

### Test Case E: Assessment Cycles (Persistence)
*   **Result**: ⚠️ BLOCKED (Logic Verified)
*   **Verification (Code)**: `frontend/src/services/assessments.ts` correctly creates "Cycle 1" upon assessment creation and links scores to it.
*   **Verification (Browser)**: Blocked by the Schema Mismatch (Test Case A).

## Defect Summary

| ID | Severity | Issue | Status |
|---|---|---|---|
| BUG-001 | 🔴 Critical | **Missing DB Tables**: `user_profiles` table missing. | Fix Ready (Migration Created) |
| BUG-002 | 🟠 Major | **Missing Feature**: Cannot define Score Labels in Builder. | Needs Implementation |
| BUG-003 | 🟡 Minor | **Legacy Code**: "Upload Excel" button expects backend. | Unchanged |

## Conclusion
The **Assessment Cycles** feature logic is correctly implemented in the backend service. The **Score Criteria** feature is incomplete (missing UI). The application environment is currently unstable due to missing database tables, which must be resolved by running the provided migration.
