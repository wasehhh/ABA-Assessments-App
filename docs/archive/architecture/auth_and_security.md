# Auth & Security Architecture

## 1. Authentication Strategy

*   **Provider:** Supabase Auth (wrapping GoTrue).
*   **Methods:** Email/Password (MVP), Magic Link (Optional).
*   **Session Management:** JWTs stored in HttpOnly cookies (via `@supabase/ssr` in Next.js).
*   **MFA:** Planned for Phase 2 (TOTP) - highly recommended for Admin accounts.

## 2. Authorization (RBAC)

User roles are stored in the `public.users` table.

| Role | Permissions |
|---|---|
| **Organization Admin** | Full access to Organization, Users, Learners, Frameworks. CANNOT access other Orgs. |
| **Supervisor (BCBA)** | Read/Write Learners, Assessments. Can "Finalize" assessments. Can edit Frameworks (optional). |
| **Therapist (RBT)** | Read assigned Learners/Assessments. Write scores to assigned Assessments. NO delete permissions. |

## 3. Row Level Security (RLS) - The Defense Layer

RLS is the **primary** security barrier. Every table must have `ENABLE ROW LEVEL SECURITY` on.

### Helper Functions (Postgres)
To keep policies clean, we define helper functions:

```sql
-- Check if user belongs to the org
create function is_org_member(org_id uuid) returns boolean as $$
  select exists (
    select 1 from users 
    where id = auth.uid() 
    and organization_id = org_id
  );
$$ language sql security definer;

-- Check if user has specific role
create function has_role(required_role app_role) returns boolean as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role = required_role
  );
$$ language sql security definer;
```

### Policy Examples

#### Learners Table
*   **SELECT:** `is_org_member(organization_id)`
*   **INSERT/UPDATE:** `is_org_member(organization_id) AND (has_role('admin') OR has_role('supervisor'))`
*   **DELETE:** `is_org_member(organization_id) AND has_role('admin')`

#### Assessment Scores Table
*   **SELECT:** `is_org_member(organization_id)`
    *   *Note:* Therapists can see all scores for learners they have access to to understand history.
*   **INSERT/UPDATE:** `is_org_member(organization_id)` AND `assessments.status != 'finalized'`
    *   *Requirement:* Needs a join or check against the parent assessment status.

## 4. Multi-Tenancy Implementation

*   **Strict Isolation:** No "Super Admin" role in the application layer that sees all tenants.
*   **Data Leaks:**
    *   *Prevention:* All queries wrapped in identifying hooks.
    *   *Testing:* Unit tests must attempt to query `Org B` data with `Org A` user token and fail.

## 5. Deployment & Infrastructure Security (Compliance)

### Data Residency
*   **Region:** Supabase Project **MUST** be provisioned in `ca-central-1` (AWS Canada).
*   **Failover:** Backups encrypted to a separate Canadian bucket.

### Audit Logging (PHIPA Requirement)
*   **Trigger-Based Logging:**
    *   Create a table `audit_logs` (user_id, action, table_name, record_id, timestamp, diff).
    *   Attach `AFTER INSERT OR UPDATE OR DELETE` triggers to `assessments` and `learners`.
    *   RLS on `audit_logs`: Insert only (system), Select (Admin only).

### Encryption
*   **At Rest:** Standard Postgres encryption.
*   **In Transit:** TLS 1.2+.
*   **App Level:** Minimal encryption needed if DB is secure, but 'Notes' fields could be sensitive.
