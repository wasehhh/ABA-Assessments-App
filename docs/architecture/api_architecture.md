# API Architecture

## Overview
The application uses a **Serverless / EDGE-first** architecture.
Primary communication is **Direct-to-Database** via Supabase Client for reads, and **Server Actions** for complex writes/mutations.

## Communication Patterns

### 1. Data Fetching (Reads)
*   **Method:** Supabase Client (in Server Components).
*   **Pattern:** Fetch data directly in `page.tsx` or `layout.tsx`.
*   **Benefits:** RLS ensures security; Server Components prevent waterfall (mostly).
*   **Caching:** Leverage Next.js request memoization.

```typescript
// Example: Fetching Learner Profile
const supabase = createClient();
const { data: learner } = await supabase
  .from('learners')
  .select('*')
  .eq('id', learnerId)
  .single();
```

### 2. Mutations (Writes)
*   **Method:** Next.js Server Actions.
*   **Reasoning:**
    *   Centralized validation (Zod).
    *   Audit logging hooks (if extra app-level logging is needed).
    *   Complex multi-table transactions (e.g., Finalizing an assessment).

```typescript
// Example: Server Action
'use server'
export async function saveScore(scoreData: ScoreSchema) {
  // 1. Validate
  if (!validate(scoreData)) throw new Error("Invalid Data");
  
  // 2. Auth Check (Implicit via Supabase Client)
  const supabase = createClient();
  
  // 3. DB Operation
  const { error } = await supabase.from('assessment_scores').upsert(scoreData);
  
  // 4. Revalidate
  revalidatePath('/assessment/[id]');
}
```

## API Route Structure (App Router)

While most logic is in Server Actions, some specific API endpoints are needed for external integrations or webhooks.

`app/api/`
*   `auth/callback/route.ts` - Supabase Auth exchange.
*   `upload/framework/route.ts` - Handling large file uploads (if needed).
*   `export/pdf/route.ts` - Generating PDF streams (resource intensive, might offload to Edge Function).

## External Integrations



## Error Handling
*   **Global Error Boundaries:** Catch UI errors.
*   **API Errors:** Return standardized JSON: `{ success: false, error: { code: 'UNAUTHORIZED', message: ... } }`.
*   **Logging:** Server-side errors logged to monitoring service (Sentry/Datadog) **scrubbed of PHI**.
