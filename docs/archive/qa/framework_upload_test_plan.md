# QA Test Plan: Framework Uploads

## Feature Overview
- **Goal**: Verify that users can upload Excel/CSV templates that define assessment structures.
- **Component**: `ContentPacks.tsx` (UI), `packs.ts` (Service), `parser.py` (Backend).
- **Critical Requirement**: No corrupted structure, correct parsing of domains/items, correct storage in Supabase.

## Test Environment
- **URL**: `/content-packs`
- **Roles**: Organization Admin, BCBA (Therapists should NOT have access).

## Test Cases

### 1. Happy Path: Valid Excel Upload
- **Input**: `ABLLS_Template.xlsx` (Standard format).
- **Steps**:
  1. Login as Admin.
  2. Navigate to "Content Packs".
  3. Click "Import Pack".
  4. Select valid XLSX file.
  5. Enter Title: "Test Framework 1".
  6. Click Upload.
- **Expected Result**:
  - Success message displayed.
  - New pack appears in list "Test Framework 1".
  - Preview shows correct number of domains (A-Z).
  - DB `content_packs` table contains new row with valid JSON in `pack_data`.

### 2. Edge Case: Missing Sheet
- **Input**: Excel file without "SkillMatrix_Data" sheet.
- **Expected Result**:
  - Error toast: "Invalid Template: Missing 'SkillMatrix_Data' sheet."
  - No DB insertion.

### 3. Edge Case: Partial Data
- **Input**: Excel file with missing `Domain` column for some rows.
- **Expected Result**:
  - Parser should skip rows with empty domain.
  - Parser should NOT crash.
  - Valid rows should still be processed (or all rejected, depending on strictness). *Current Logic: Skips empty domain rows.*

### 4. Edge Case: Invalid Max Score
- **Input**: Excel file where `Max Score` is "N/A" or text.
- **Expected Result**:
  - Verification if `parser.py` handles non-numeric max_score. *Code Review: It reads raw value. Frontend type expects number?*
  - **Potential Bug**: Backend passes raw value, Frontend might crash or display NaN.

### 5. Security: Unauthorized Role
- **Pre-condition**: Logged in as Therapist.
- **Steps**: Attempt to access /content-packs or call upload API.
- **Expected Result**:
  - UI: Access Denied / Redirect.
  - API: 403 Forbidden (RLS Policy Check).

### 6. Performance: Large File
- **Input**: Excel with 5000+ items.
- **Expected Result**:
  - Upload completes within 10 seconds.
  - Application does not freeze.

## Manual Verification Steps
1. **Prepare Template**:
   - Create `test_valid.xlsx` from `ABLLS_Template.xlsx`.
   - Create `test_broken.xlsx` (rename sheet).
2. **Run Backend**:
   - `cd backend && python main.py`
3. **Run Frontend**:
   - `npm run dev`
4. **Execute Uploads**.

## Automated Testing Strategy (Recommended)
- **Unit Test**: `backend/tests/test_parser.py` (Need to create).
  - Test `parse_template` with mock files.
- **Integration Test**: Browser test uploading a file.

## Known Issues (from Code Review)
- **Hardcoded Backend URL**: `http://localhost:8000` in `packs.ts`. Will fail if backend is on different port or deployed.
- **Data Model**: Uses JSON blob instead of normalized tables (see Architecture Report).
