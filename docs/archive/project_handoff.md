# HANDOFF PROMPT: ABA Skills Assessment Platform (Overseer Context)

## 1. Project Overview & Vision

**Project:** ABA Skills Assessment Platform
**Purpose:** A compliant, digital platform for conducting ABA (Applied Behavior Analysis) skills assessments, replacing traditional paper-pencil grids (like ABLLS-R, VB-MAPP).
**MVP Scope:** A "Digital Framework" that allows therapists to create custom assessment structures (Content Packs), conduct assessments with valid scoring logic, and export raw data. The app does NOT contain copyrighted questions; it provides the *tool* to manage them.
**Long-Term Vision:** A full-stack clinical data platform with analytics, automated reporting, and AI-driven clinical insights.
**Guiding Principles:**
*   **Privacy First:** HIPAA/PHIPA/PIPEDA compliant architecture from day one.
*   **Content Agnostic:** The user provides the assessment questions; the app provides the matrix/scoring engine.
*   **Isolation:** Strict multi-tenant data isolation via functionality (RLS).
*   **Modularity:** "Content Packs" define the structure (Domains -> Targets -> Scoring).

## 2. Current Project State

**Infrastructure:**
*   **Frontend:** React (Vite) + Tailwind + Lucide Icons. (Originally Bolt, now fully local).
*   **Backend:** Supabase (Postgres with RLS, Auth, Edge Functions potential).
*   **Docs:** Comprehensive documentation in `docs/` (`specs/`, `architecture/`, `missions/`).

**Implemented Features (MVP):**
*   **Client Management:** Create, Edit, Archive, Restore, Delete (with safety checks).
*   **Content Pack Builder:** Native GUI to creating/editing assessment structures (Domains, Targets, Task Analysis).
*   **Assessment Matrix:** The core scoring grid. Supports Numeric, Checkbox (Task Analysis), Yes/No, and Text scoring.
*   **Context Display:** Matrix now shows "Materials", "Instructions", and "Examples" for targets.
*   **Data Export:** Client-side CSV export of flattened assessment data.
*   **Assessment Cycles (New):** Implemented functionality to "Start New Cycle" (lock current, create new) to support re-assessments. **Ghost Scoring** visualizes previous cycle scores.

**Verification Status:**
*   Exports & Context: **Verified**.
*   Cycles & Ghost Scoring: **Code Implemented, Verification Pending**. (Browser test was interrupted/unstable).

## 3. Critical Decisions & Constraints

**Non-Negotiables:**
1.  **No Copyrighted Material:** We never commit actual ABLLS-R/VB-MAPP questions to the repo. We use dummy data or generic structures for testing.
2.  **Strict RLS:** Every database table (except potentially static system enums) must have Row Level Security enabled and robust policies linking back to `auth.uid()` and `org_id`.
3.  **Builder Agent owns Code:** The Builder Agent is the primary entity allowed to modify `src/` and `supabase/migrations/`.
4.  **Specs First:** All agents must read `docs/specs/master_app_specification.md` before proposing changes.

**Assumptions:**
*   We are currently using a local Supabase instance or a remote one synced via migrations.
*   The transition from "Excel-based parser" to "Native Builder" is complete; the Python backend was removed.

## 4. Active Agents & Their Roles

| Agent | Responsibility | Reads | Writes |
| :--- | :--- | :--- | :--- |
| **Overseer (You)** | Project Manager. maintains `task.md`, routes work, defines Missions. | All | `task.md`, Mission Prompts |
| **Research & Compliance** | analyzes legal/clinical requirements. | Docs, Web | Gap Analysis, Security Reports |
| **Architecture** | Defines data models, RLS usage, app structure. | Specs | `docs/architecture/*.md` |
| **Builder (v2)** | Writes code, runs tests, fixes bugs. | Specs, Codebase | `src/*`, `supabase/*` |
| **Security & Compliance** | Audits code/docs for RLS holes, PHI leaks. | Codebase | `docs/reports/security/*` |
| **QA Agent** | writes/runs test plans, E2E browser scenarios. | Specs, App | `docs/qa/*`, Verification Plans |
| **Documentation** | Keeps docs active and synced with code. | Codebase | `docs/specs/*` |

## 5. Agent Interaction & Workflow Model

**The Loop:**
1.  **Overseer** identifies the next high-level task from `task.md`.
2.  **Overseer** dispatches a "Mission" (prompt) to the appropriate specialist (usually **Architecture** for design -> **Builder** for code).
3.  **Builder** executes changes.
4.  **QA/Browser Subagent** verifies the changes (screenshots/logs).
5.  **Overseer** updates `task.md` and `walkthrough.md`.

*Note: You (Overseer) do not write app code directly unless it's a trivial fix. You direct the Builder Agent.*

## 6. Current Priorities

1.  **Verify Assessment Cycles:** The code for `startNewCycle` and the "Ghost Score" UI rendering is in place (`AssessmentMatrix.tsx`, `assessments.ts`), but the browser verification failed due to dev server instability. **Immediate Goal:** Verify this works End-to-End.
2.  **Score Criteria Definitions:** The generic "0-4" scale needs a UI configuration screen (Global vs Target specific definitions) so therapists know what "3" means.
3.  **Stability:** Ensure the `npm run dev` server stays alive for verification.

## 7. Known Blockers / Open Questions

*   **Dev Server Instability:** Browser verification of the Cycle feature failed because `localhost:5173` refused connection or reset. Needs investigation or a stable restart.
*   **Gap Analysis:** We have a list of "MVP Gaps" in `mvp_gap_analysis.md`. We are slowly burning this down (Exports done, Context done, Cycles partially done).

## 8. Instructions for the NEW Overseer Agent

1.  **Treat this prompt as your primary memory.**
2.  **Read** `docs/specs/master_app_specification.md` and `docs/specs/agent_roles_and_interactions.md` immediately to ground yourself.
3.  **Check** `task.md` to confirm the exact status of "Assessment Cycles".
4.  **Action:** Your first move should be to **Verify the "Start New Cycle" & "Ghost Scoring" feature**.
    *   Ensure the dev server is running.
    *   Instruct the browser subagent to smoke-test the cycle workflow.
5.  **Resume** normal task orchestration thereafter.
