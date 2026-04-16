# Frontend Architecture

## 1. Tech Stack
*   **Framework:** Next.js 14+ (App Router).
*   **Language:** TypeScript (Strict Mode).
*   **Styling:** Tailwind CSS.
*   **Components:** Radix UI Primitives (Headless) + specialized clinical components (Grids).
*   **State:** React Query (Server State), Zustand (Client Global State), React Context (Dependency Injection).

## 2. Folder Structure
We follow a **Feature-based** architecture, grouping files by domain rather than type.

```
/app
  /(auth)            # Auth routes (login, forgot-password)
  /(dashboard)       # Protected routes
    /layout.tsx      # Dashboard Shell (Sidebar, Header)
    /learners
      /page.tsx      # List logic
      /[id]/page.tsx # Detail logic
    /assessments
      /[id]/score    # The "Scoring Interface"
  /api               # Route Handlers
  /global.css

/components
  /ui                # Generic primitives (Button, Input) - likely Shadcn
  /domain            # Business logic components
    /assessment-grid # The complex grid visualizer
    /score-input     # 0-4 input with validation

/lib
  /supabase          # Client/Server creators
  /utils             # Helpers
  /types             # Zod schemas & TS interfaces
```

## 3. Key UX Patterns
*   **Optimistic UI:** When a therapist scores an item, update the Grid INSTANTLY. Do not wait for server response. Queue the request.
    *   *Implementation:* React Query `onMutate`.
*   **Offline Support:** Service Workers (Phase 2) to cache the active assessment.
*   **Focus Mode:** On mobile/tablet, hide the sidebar when inside `/score`.

## 4. Component Guidelines
*   **Server Components (`.tsx`):**
    *   Fetch data.
    *   Pass data to clients.
    *   No `useState`, `useEffect`.
*   **Client Components (`'use client'`):**
    *   Interactivity.
    *   Forms.
    *   Complex visualizations (Canvas/SVG).

## 5. Testing Strategy
*   **Unit:** Vitest/Jest for logic (scoring calculations).
*   **Component:** React Testing Library.
*   **E2E:** Playwright (Critical Flows: Login -> Select Learner -> Score Item -> Verify Save).
