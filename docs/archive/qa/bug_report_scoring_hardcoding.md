# Bug Report: Scoring Type Hardcoding

## Description
The system is designed to support various scoring types (0-2, 0-4, Yes/No, Checkbox), and the Frontend (`AssessmentMatrix.tsx`) supports rendering them. However, the data ingestion pipeline (`parser.py` and `packs.ts`) effectively hardcodes or loses this information.

## Location
- **Backend**: `backend/services/parser.py`
- **Frontend Service**: `frontend/src/services/packs.ts`

## Evidence
1. `backend/services/parser.py`: Extracts `max_score` but does not identify if it's 0-2, 0-4, or another type. It returns a generic structure.
2. `frontend/src/services/packs.ts` (CSV Parser): Hardcodes `scoring: { scale: [0, 1, 2, 3, 4], no_opportunity_allowed: true }` on line 98.
3. `frontend/src/services/packs.ts` (Excel Parser): Just returns the JSON from backend. The backend JSON doesn't seem to include the `scoring` object with `type` and `scale`.

## Impact
- **Severity**: High (Functional Gap).
- **consequence**: All assessments will default to 0-4 scale or whatever the default is, making it impossible to correctly implement ABLLS (0-2/0-4 mixed) vs VB-MAPP (0-1).
- **User Experience**: Users uploading a 0-2 framework will likely see 0-4 buttons, leading to invalid data entry.

## Steps to Reproduce
1. Upload an Excel template with items intended to be scored 0-2.
2. Open the resulting assessment.
3. Observe the scoring buttons.
4. **Expected**: Buttons 0, 1, 2.
5. **Actual**: Likely Buttons 0, 1, 2, 3, 4 (or generic default).

## Proposed Fix
1. **Update Excel Template**: Add a column `Scoring Type` (e.g., "0-4", "Yes/No").
2. **Update Parser**: Read this column and populate the `scoring` object in the JSON response.
   ```python
   # Example structure to generate
   "scoring": {
       "type": "numeric",
       "scale": [0, 1, 2]
   }
   ```
3. **Update Frontend Types**: Ensure the JSON from backend matches `ContentPackData` interface.
