# Research: Technical Security Requirements

## Executive Summary
Security is the backbone of trust for clinical applications. The roadmap requires robust Authentication (MFA), strict Authorization (RBAC), and defense-in-depth for API and Database layers.

## Detailed Findings

### Authentication & Authorization
*   **Identity:** Use established providers (Clerk, Auth0, Supabase Auth).
*   **RBAC Roles:**
    *   *Admin:* Tenant management.
    *   *Supervisor (BCBA):* Clinical oversight, write access to assessments.
    *   *Therapist,* Data entry, read-only historical context (scoped to assigned clients).

### Secure API Design
*   **Rate Limiting:** Essential to prevent abuse.
*   **Input Validation:** Sanitize all JSON bodies.
*   **Over-Fetching:** Do not indiscriminately return full objects (e.g., `SELECT * FROM users`). Use DTOs.

### Database Security
*   **Row-Level Security (RLS):** Mandatory for Multi-tenancy.
    *   *Policy:* `auth.uid() = user_id` OR `org_id = current_org_id`.
*   **Connection Strings:** Never commit to code. Use environment variables.

## Legal & Privacy Implications
*   **Audit Trails:** Every sensitive action (View/Edit/Delete PHI) must be logged immutably.
*   **Backups:** Encrypted backups to a secondary region (e.g., AWS Canada East) for disaster recovery.

## Engineering Implications
*   **Stack Choice:** Supabase is strong here because RLS is native to Postgres.
*   **Middleware:** Implement security headers (Helmet), CORS restriction (allow only specific domains).

## Risks & Recommendations
*   **Risk:** Token leakage on client side.
*   **Recommendation:** Use HttpOnly cookies for session management where possible. Short-lived Access Tokens.
