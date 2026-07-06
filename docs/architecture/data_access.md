# Data access (Supabase client)

How the Evalis SPA reads and writes data. There is **no** separate application API layer in-repo.

For schema details see [`database_schema.md`](./database_schema.md). For provisioning see [`supabase_setup.md`](./supabase_setup.md).

---

## Philosophy

| Principle | Detail |
|-----------|--------|
| **Direct-to-DB** | Tables exposed via Supabase PostgREST; frontend uses `@supabase/supabase-js`. |
| **Client-side session** | JWT from Supabase Auth attached to requests. |
| **RLS first** | Org isolation and many access rules enforced in Postgres policies. |
| **Services layer** | `frontend/src/services/*.ts` wraps Supabase calls for pages/components. |

---

## Client initialization

Configured in `frontend/src/lib/supabase.ts` from:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Common patterns

### Read (org-scoped list)

```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('org_id', profile.org_id);
```

RLS may also enforce `org_id`; explicit filters keep intent clear.

### Write (scores)

```typescript
const { data, error } = await supabase
  .from('assessment_scores')
  .upsert({ /* assessment_id, target_id, score, cycle, ... */ });
```

### RPC (invites)

```typescript
await supabase.rpc('check_user_invite', { lookup_email: email });
await supabase.rpc('claim_invite');
```

Required for invite flows — see [`supabase_setup.md`](./supabase_setup.md).

---

## Error handling

| Code | Typical meaning |
|------|-----------------|
| 401 | Missing/invalid session |
| 403 | RLS policy violation |
| 409 | Unique constraint / conflict |

Surface user-visible errors in UI; do not rely on silent failures for clinical paths.

---

## What we do not use

- Next.js Server Actions  
- FastAPI / Python backend (removed)  
- `@supabase/ssr` cookie middleware (SPA uses browser client)

Archived obsolete API docs: [`../archive/architecture/api_architecture.md`](../archive/architecture/api_architecture.md), [`../archive/api/api_reference.md`](../archive/api/api_reference.md).

---

_Last reviewed: 2026-06-10._
