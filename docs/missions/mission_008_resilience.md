# Mission: App Resilience & Portability (Builder Agent)

**Role**: Builder Agent
**Context**: The application hangs on "Loading..." on new machines because it assumes the existence of local backend/auth state and environment variables. Failing infrastructure (missing `.env`, missing DB tables) leads to silent infinite loading instead of helpful error messages.

**Objective**: Make the app self-contained and fail-safe. It must boot on any machine and surface infrastructure errors clearly.

## 1. Enforce Environment Variables
-   **Action**: Create `frontend/src/lib/env.ts` (or update `supabase.ts`).
-   **Logic**: Check for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
-   **Result**: If missing, throw a descriptive error immediately. Do not attempt to initialize Supabase Client with undefined values.

## 2. Harden Auth Boot Flow
-   **File**: `frontend/src/context/AuthContext.tsx`
-   **Action**:
    -   Ensure `setLoading(false)` is called in a `finally` block in the initial `useEffect`.
    -   Add an `error` state to the context (`const [error, setError] = useState<string | null>(null)`).
    -   If profile fetch fails (404), do **NOT** fail the whole app. Log it, maybe set user to null (or keep user but no profile), but definitely `setLoading(false)`.
    -   Expose `error` in the context so the UI can show it.

## 3. Global Error Handling
-   **File**: `frontend/src/App.tsx` (or `main.tsx`)
-   **Action**:
    -   Implement a basic Error Boundary (or `try/catch` around the main render) to catch the "Missing Env Vars" error.
    -   If an error is present (either from Env check or AuthContext), render a **"System Error" Screen** instead of the "Loading..." spinner.
    -   *Screen Content*: "System Verification Failed: [Error Message]. Please check your .env file."

## 4. Documentation
-   **Action**: Create `frontend/.env.example` with dummy values for all required variables.

## 5. Output
-   Resilient `AuthContext.tsx`.
-   Safe `supabase.ts`/`env.ts`.
-   `App.tsx` with error state handling.
-   `.env.example`.
