# Security and Compliance Review
**Date:** 2025-12-10
**Status:** 🔴 CRITICAL ISSUES FOUND
**Auditor:** Security Agent

---

## Executive Summary
The system in its current state is **NOT compliant** with PHIPA/PIPEDA requirements and contains critical security vulnerabilities that prevent production deployment. The most severe issues are the unsecured Python backend, hardcoded local endpoints preventing deployment, and a reliance on manual database changes (Dashboard API) rather than committed migrations, which leaves the security posture of core tables (`assessments`, `scores`) unverified.

---

## 🚨 High Severity Issues (Critical Fixes Required)

### 1. Insecure Python Backend & Race Conditions
*   **File:** `backend/main.py`
*   **Severity:** **CRITICAL**
*   **Issue:**
    *   **Open CORS:** `allow_origins=["*"]` allows any website to call this API.
    *   **No Authentication:** The `/parse-template` endpoint allows any anonymous user to upload files.
    *   **Race Condition / DoS:**
        ```python
        temp_file = f"temp_{file.filename}"  # Line 24
        ```
        If two users upload a file with the same name simultaneously, one will overwrite the other's temp file before processing. This causes data corruption.
*   **Recommendation:**
    *   **Fix:** Use `tempfile.NamedTemporaryFile` to generate unique, safe paths.
    *   **Fix:** Implement a shared secret or token validation (passed from Next.js API route).
    *   **Deploy:** Do not expose this valid URL to the public internet. Wrap it behind a Next.js Server Action.

### 2. Hardcoded Localhost in Client Code
*   **File:** `frontend/src/services/packs.ts:65`
    ```typescript
    const response = await fetch('http://localhost:8000/parse-template', ...
    ```
*   **Severity:** **HIGH**
*   **Issue:** The frontend calls `localhost:8000` directly. This works for the developer but **will break immediately** on deployment (as the user's browser looks for port 8000 on *their* machine).
*   **Recommendation:**
    *   **Short Term:** Use an environment variable `VITE_API_URL`.
    *   **Long Term:** Proxy this call through a Next.js API Route (or Vercel Function) so the browser talks to `/api/parse` and the server talks to the Python backend.

### 3. Missing/Unverified RLS Policies (Schema Drift)
*   **Location:** `frontend/supabase/migrations/`
*   **Severity:** **HIGH**
*   **Issue:** Only one migration file exists (`...fix_rls_policies.sql`), which covers `user_profiles` and `organizations`.
    *   **MISSING:** Policies for `assessments`, `assessment_scores`, `content_packs`, `audit_logs`.
    *   **Risk:** If these tables were created in the Dashboard without `ENABLE ROW LEVEL SECURITY`, they are **publicly readable/writable** by anyone with the anon key.
*   **Recommendation:**
    *   Immediately create a migration that enables RLS on all tables and adds strictly scoped policies. (See "remediation" section below).

---

## 🟠 Medium Severity Issues

### 4. Client-Side Audit Logging
*   **File:** `frontend/src/services/assessments.ts:62`
*   **Severity:** **MEDIUM**
*   **Issue:** The frontend *volunteers* to log its actions:
    ```typescript
    await supabase.from('audit_logs').insert([...])
    ```
    A malicious user can use the Supabase JS client to insert data *without* sending the corresponding audit log.
*   **Recommendation:**
    *   **Ideal:** Use Postgres Triggers (`AFTER INSERT/UPDATE`) to automatically create audit logs server-side.
    *   **Acceptable (MVP):** Use Supabase Edge Functions for all writes, ensuring logging happens there.

### 5. Potential Copyright Risk (Excel Template)
*   **File:** `ABLLS_Template.xlsx` (Root directory)
*   **Severity:** **MEDIUM**
*   **Issue:** Existence of this file in the repo. If it contains the actual text of ABLLS items, it is a copyright violation to distribute it.
*   **Recommendation:** Ensure this is a *structural* template only (e.g., "Item C1" without the definition text). Add `*.xlsx` to `.gitignore` if it contains real data.

---

## ✅ Recommended RLS Policy Remediation
Run the following SQL to secure the un-migrated tables immediately.

```sql
-- Enable RLS on all tables
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Assessments: Only visible to members of the same Organization
CREATE POLICY "Assessments visible to Org Members"
ON assessments FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Assessments editable by Org Supervisors"
ON assessments FOR ALL
USING (
  org_id IN (
    SELECT org_id FROM user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'bcba')
  )
);

-- Scores: Visible to Org, Editable by assignee/supervisor
-- (Simplified for MVP)
CREATE POLICY "Scores visible to Org"
ON assessment_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = assessment_scores.assessment_id
    AND a.org_id IN (
        SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);
```

## Next Steps for Builder Agent
1.  **Refactor Backend:** Move `parse_template` call to a Next.js Server Action (proxy).
2.  **Secure Python:** Add a shared secret header check.
3.  **Harden DB:** snapshot the current schema and apply the RLS policies above.
