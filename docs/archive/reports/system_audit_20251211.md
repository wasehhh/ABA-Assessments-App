# System Audit Report ("State of the Union")
**Date**: December 2025
**Scope**: Entire Codebase Audit

## 1. Executive Summary
The system is an **ABA Skills Assessment Platform** currently in an **Early MVP Phase**.
It allows users to log in, manage clients, and upload assessment frameworks (Excel/CSV).
The architecture consists of a **Vite + React Frontend**, a **Supabase Backend** (Auth/DB), and a **FastAPI Python Microservice** for file parsing.

**Critical Status**:
- **Core Features**: Functional (Login, Routing, Dashboard, Framework Upload).
- **Security**: 🔴 **CRITICAL VULNERABILITIES** (Open Python Backend, Missing RLS).
- **Architecture**: Deviates from Spec (Vite vs Next.js).
- **Compliance**: Not yet PHI-compliant (missing detailed RLS, improper logging).

---

## 2. File Inventory & Functionality

### 2.1 Backend (`/backend`)
A lightweight Python service acting as a file parser.
-   `main.py`:
    -   **Tech**: FastAPI.
    -   **Function**: Endpoint `/parse-template` accepts `.xlsx`/`.csv`.
    -   **Key Logic**: Saves file to disk (`shutil.copyfileobj`), calls `services.parser`, returns JSON.
    -   **Security**: Minimal. Uses a simple "API_SECRET" check (`verify_api_key`) but has `allow_origins=["*"]`.
    -   **Risks**: Race condition in file naming (`temp_{filename}`), potential DoS via large files.

### 2.2 Frontend (`/frontend`)
A Single Page Application (SPA) built with Vite and React.
-   `src/App.tsx`:
    -   **Routing**: Custom hash-based router (`#/login`, `#/dashboard`, etc.). **Simple but non-standard** (usually React Router is preferred).
    -   **Auth**: Wraps app in `AuthProvider`, redirects to `#/login` if no user.
-   `src/services/packs.ts`:
    -   **Logic**: Handles file uploads.
    -   **Integration**: Calls `localhost:8000/parse-template` directly. **MAJOR BUG**: This implementation will fail in production (users can't reach localhost).
    -   **DB Writes**: Inserts into `content_packs` and manually inserts into `audit_logs` (Security risk: client-side logging is untrustworthy).
-   `src/components/`: Standard UI components (Layout, etc.).
-   `src/pages/`: Feature pages (Login, Dashboard, Clients, AssessmentMatrix).

### 2.3 Database (`/frontend/supabase`)
Supabase (PostgreSQL) configuration.
-   `migrations/20251126224039_002_fix_rls_policies.sql`:
    -   **Coverage**: `user_profiles`, `organizations`.
    -   **Status**: **INCOMPLETE**. Missing RLS policies for `assessments`, `scores`, `content_packs`, `audit_logs`. These tables are currently potentially insecure if they exist in the DB.

---

## 3. Key Findings & Discrepancies

| Feature | Spec Requirement | Current Implementation | Verdict |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (Server Components) | Vite (Client-side SPA) | **DEVIATION** (Stick with Vite for now, adapt patterns). |
| **Backend Integration** | Next.js Server Actions | Direct `fetch` to `localhost:8000` | **BROKEN** (Needs Proxy). |
| **Security / RLS** | "End-to-end least privilege" | RLS only on User/Org tables. | **CRITICAL FIX NEEDED**. |
| **File Parsing** | Secure, stateless | Writes to disk, race conditions. | **NEEDS FIX**. |
| **Audit Logs** | Server-side triggers | Client-side inserts. | **NEEDS FIX** (Move to DB Triggers). |

---

## 4. Current Plan (Roadmap)

### Immediate Next Step: Mission 001 (Security Remediation)
We are currently paused on triggering the **Builder Agent** for this mission.
**Goal**: Secure the platform to be production-ready (Safe to deploy).

**Tasks**:
1.  **Secure Backend**: Add `X-Service-Key` auth, fix race conditions.
2.  **Edge Function Proxy**: Create a Supabase Edge Function to proxy uploads (solving the "localhost" and "CORS" issues).
3.  **RLS Hardening**: Apply RLS to all remaining tables.

### Future Phases
1.  **Phase 2**: Analytics & Reporting (Graphs).
2.  **Phase 3**: Advanced Features (AI/ML).

## 5. Summary Recommendation
The codebase is a functional "Prototype" but **not yet an MVP** due to security and deployment blockers.
The immediate priority MUST be **Mission 001** to fix the plumbing (Proxy + RLS) before adding any new features.
