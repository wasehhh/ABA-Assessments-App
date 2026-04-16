# Research: Strategic Recommendations

## Executive Summary
To succeed, the platform must position itself as a "Basement Builder"—a compliant formatting engine for assessments—rather than a content publisher. This avoids IP liability while solving the digitization problem.

## A. Product Strategy
1.  **The "Template" System:** Users upload their own definition files (Excel/CSV). We provide the renderer.
2.  **Focus on Visualization:** The value prop is the "Auto-Grid", not the questions themselves.
3.  **Canadian-First:** Market directly to Ontario/BC clinics with "PHIPA Compliant Data Residency" as a headline feature.

## B. Technical Recommendations
*   **Stack:** Next.js + Supabase (Postgres/Auth).
*   **Hosting:** Vercel (Frontend) + AWS Canada (Backend/DB).
*   **Data Model:** `organizations` -> `frameworks` -> `assessments`.

## C. MVP Roadmap
1.  **Phase 1:** Assessment Core (Upload Template -> Score -> View Grid).
2.  **Phase 2:** Multi-Tenancy & Auth (Clerk/Supabase).
3.  **Phase 3:** Assessment History (T1 vs T2 comparison).

## D. Pitfalls to Avoid
*   **Text Embedding:** Never ship the app with "ABLLS" pre-loaded in the DB.
*   **US Hosting:** Avoid US-only region lock in.
*   **Over-Engineering:** Do not build billing/scheduling yet.
