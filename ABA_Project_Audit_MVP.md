# Full Project State Audit
**Date**: 2026-01-09
**Version**: 0.9.0 (Internal MVP)

## 1. High-Level App Overview
**Current Status**: **Functional Internal MVP**.
The application is a functioning, multi-tenant capable **ABA Data Collection & Assessment Platform**. It successfully solves the core problem of digitalizing paper-based assessment protocols (like ABLLS-R) and tracking client progress over time.

-   **Target Audience**: Small to medium-sized ABA clinics.
-   **Readiness**: **Pilot-Ready** (with caveats on reporting polish).
-   **Core Capabilities**:
    -   Multi-user, Role-based access (Admin vs Therapist).
    -   Customizable Assessment content (Packs).
    -   Longitudinal tracking (Cycles).
    -   Audit logging and HIPAA/PHIPA-aware architecture.

---

## 2. Full Page-by-Page Breakdown

### 2.1 Public & Auth Pages
| Page | Route | Access | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `#/login` | Public | **Working** | Email/Password auth. Supports "Invite Link" pre-filling. Debug mode for checking role behavior. |
| **Verify Email** | `(Supabase)` | Public | **Working** | Standard Supabase auth flow. |

### 2.2 Core Application
| Page | Route | Access | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `#/dashboard` | Auth | **Working** | Shows aggregated stats (Clients, Assessments). "Quick Actions" panel adapts to user role. |
| **Clients** | `#/clients` | Auth | **Working** | List view. Search/Filter (Active/Archived). Create/Edit modal. Delete protection logic (cannot delete if assessments exist). |
| **Client Detail** | `#/client/:id` | Auth | **Working** | Client Hub. Shows list of all assessments for that client. Actions: Create New Assessment, Delete Drafts. |
| **Assessments** | `#/assessments` | Auth | **Working** | Global list of all assessments in org. Filters (Active/Submitted/Approved). Export menu (CSV Matrix/Long). |
| **Assessment Matrix** | `#/assessment/:id` | Auth | **Working** | **The Core Engine**. <br> - **Overview Layer**: Domain stats, progress bars. <br> - **Scoreboard Layer**: Grid view of targets. <br> - **Detail Modal**: Scoring (0-4), Notes. <br> - **Features**: Cycle management (New Cycle), Compare Mode (View history), Submit/Approve workflow. |
| **Assessment Report** | `.../report` | Auth | **Basic** | Printable view. Functional but visual layout is basic. Needs branding polish. |
| **Content Packs** | `#/packs` | Admin/Sen. | **Working** | Manage assessment templates. Upload JSON/CSV. "Build Custom" opens a visual builder. |

### 2.3 Admin & Settings
| Page | Route | Access | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Team Management** | `#/users` | Admin | **Working** | Invite users via email. Manage roles. Revoke invites. View status (Active/Inactive). |
| **Org Settings** | `#/org-settings` | Admin | **Working** | Rename Clinic. Changes reflected in reports/audit log. |
| **Audit Log** | `#/audit-log` | Admin | **Working** | Read-only table of system events (View, Update, Delete). Essential for compliance. |
| **Settings** | `#/settings` | Auth | **Working** | User profile (Name) and Security (Password change). |

---

## 3. User Flows

### Admin Onboarding
1.  **Sign Up**: Creates Org + Admin User.
2.  **Org Setup**: Naming the clinic (`#/org-settings`).
3.  **Invite Team**: Sending invites to Therapists (`#/users`).
4.  **Import Content**: Uploading an assessment "Pack" (e.g., ABLLS-R demo) (`#/packs`).

### Clinical Workflow
1.  **Create Client**: Admin/Senior Therapist adds a new client record.
2.  **Assign Assessment**: Select Client + Pack -> Creates "Draft" Assessment.
3.  **Scoring (Cycle 1)**: Therapist opens Matrix. Scores targets. Logs notes.
4.  **Submit**: Therapist marks assessment as "Submitted" (Locks editing).
5.  **Review**: Admin reviews and "Approves".
6.  **Re-Assessment (Cycle 2)**: months later, Admin clicks "New Cycle". Scores reset (but history preserved). Therapist scores again.

---

## 4. Feature Inventory

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Multi-Tenancy** | ✅ Implemented | Data strictly isolated by `org_id` RLS policies. |
| **Role-Based Access** | ✅ Implemented | `admin`, `senior_therapist`, `therapist`, `viewer` roles enforced in UI & DB. |
| **Cycle-Based Scoring** | ✅ Implemented | Allows "Time Travel" comparison (Cycle 1 vs Cycle 2). |
| **Pack Builder** | ✅ Implemented | JSON/CSV import supported. Visual builder exists but is simple. |
| **Task Analysis** | ⚠️ Partial | Schema supports `metadata` for steps, but UI for sub-step scoring is not fully distinct. |
| **Offline Mode** | ❌ Missing | App requires active connection. |
| **Parent Portal** | ❌ Missing | No external access for parents yet. |
| **Scan Import** | 📝 Planned | Feature plan drafted, not implemented. |

---

## 5. Data Model & Persistence
**Database**: PostgreSQL 15+ (Supabase Managed)
**Schema Quality**: **High**. Normalized (3NF) with strict Foreign Key constraints.

### 5.1 Core Tables
| Table | PK | Key Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| **`organizations`** | `id` | `created_by` (auth.users) | The Tenant root. All data is scoped to this ID. |
| **`user_profiles`** | `id` | `id` (auth.users), `org_id` | Extends Supabase Auth. Stores Name, Role, Status. |
| **`user_invites`** | `email` | `org_id`, `invited_by` | Pending invitations. Converted to Profile on signup. |
| **`clients`** | `id` | `org_id` | Patient records. (Name, DOB, Status). |
| **`content_packs`** | `id` | `org_id` | Assessment Templates. Stores JSON structure in `pack_data`. |
| **`assessments`** | `id` | `client_id`, `content_pack_id` | The Container. Stores `pack_snapshot` (Frozen JSON). |
| **`assessment_cycles`**| `id` | `assessment_id` | Time periods (e.g., "Initial", "Re-eval"). Status: `in_progress` \| `locked`.|
| **`assessment_scores`**| `id` | `assessment_id`, `cycle_id` | Individual data points. Links Target ID to Score (0-4). |
| **`audit_logs`** | `id` | `org_id`, `user_id` | Compliance trail. Stores `action`, `entity_type`, `details` (JSON). |

### 5.2 Helper / Implicit Tables
| Table | Origin | Purpose |
| :--- | :--- | :--- |
| **`auth.users`** | Supabase | Identity Provider. Stores Email, Encrypted Password, Last Sign In. |
| **`storage.objects`**| Supabase | (Implicit) Used for `evidence_files` in `assessment_scores` (JSONB refs). |

### 5.3 Key Data Structures (JSONB)
-   **`content_packs.pack_data`**:
    ```json
    { "domains": [{ "title": "Visual", "targets": [{ "code": "B1", ... }] }] }
    ```
-   **`assessment_scores.metadata`**: Stores granular "Task Analysis" steps (e.g., `{ "steps_completed": ["step1", "step3"] }`).

### 5.4 RLS Policies (Security)
-   **Strict Multi-Tenancy**: Every query enforces `org_id = get_my_org_id()`.
-   **Isolation**: Users cannot read data from other Orgs, even if they guess the UUID.
-   **Role Logic**:
    -   `viewer`: Select ONLY.
    -   `therapist`: Update Scores (if cycle `in_progress`).
    -   `admin`: Full `INSERT/UPDATE/DELETE`.

## 6. Role & Permission Reality Check
| Role | Capabilities |
| :--- | :--- |
| **Admin** | Full access. Manage Org, Users, Packs. Approve Assessments. |
| **Senior Therapist** | Manage Clients, Assessments. Create Packs. CANNOT manage Users/Org. |
| **Therapist** | View assigned Clients. Score Assessments (Edit). CANNOT Delete or Manage Packs. |
| **Viewer** | Read-only access to all data. |

**Gap**: Currently, `therapist` can view *all* clients in Org, not just assigned ones. (Acceptable for small clinics, maybe an issue for large ones).

## 7. Analysis & Reporting
**Current Reality**:
-   **Matrix View**: Color-coded grid is the primary analytical tool.
-   **Progress Bars**: "Domain Acquisition" stats calculated in real-time.
-   **Comparisons**: Ability to view "Cycle 1" ghost scores while scoring "Cycle 2".
-   **Exports**: CSV download allows external graphing (Excel/Tableau).

**Missing**:
-   Visual Charts (Line graphs of progress over time).
-   Narrative Report Generation (AI summary of progress).

## 8. Known Issues & Gaps
1.  **Report Aesthetics**: The `#/assessment/:id/report` page is functional but looks like a raw document. Needs a "Professional PDF" styling pass.
2.  **Navigation Feedback**: Sometimes refreshing on a deep route (e.g., `#/assessment/123`) might flicker the login screen before resolving auth.
3.  **Mobile Experience**: The Matrix grid is usable on iPad, but difficult on Phones.
4.  **Deleted Pack Handling**: If a Pack is deleted, its Assessment snapshots remain (Good), but UI might show "Unknown Pack" if not handled carefully in list views.

## 9. MVP Readiness Assessment
**Verdict**: **READY FOR BETA / INTERNAL PILOT**

The application is stable enough for a clinic to use for *real* data collection, provided they:
1.  Are trained on the "Cycle" concept.
2.  Have a predefined JSON/CSV for their assessment content (or use the builder).
3.  Don't require offline access.

**Critical Path to Launch**:
1.  **Backup/Export**: Ensure clinics can easily download ALL their data (Compliance requirement).
2.  **TOS/Privacy Policy**: Update the placeholder footer links.
