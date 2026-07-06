# API Reference

The ABA Skills Assessment Platform primarily uses **Supabase** (PostgREST) as its API layer. This means the frontend communicates directly with the database using the Supabase Client, secured by Row Level Security (RLS) policies.

## 1. Core API Philosophy

- **Direct-to-DB**: Most "API endpoints" are actually just database tables exposed via REST/Realtime.
- **Client-Side Auth**: The frontend manages the session (JWT) which is passed to Postgres.
- **RLS Enforced**: You do not need to write "check permission" logic in API handlers; the database policies enforce tenant isolation and role access.

## 2. Database Schema (The "API")

For a detailed list of tables and columns, please refer to:
👉 **[Database Schema](../architecture/database_schema.md)**

## 3. Usage Examples (Supabase Client)

### Fetching Learners
```javascript
const { data, error } = await supabase
  .from('learners')
  .select('*')
  // .eq('organization_id', user.org_id) <-- RLS handles this, but good practice to be explicit if needed
  .order('last_name');
```

### Saving a Score
```javascript
const { data, error } = await supabase
  .from('assessment_scores')
  .upsert({
    assessment_id: '...',
    item_id: '...',
    score_value: 4,
    notes: 'Mastered quickly',
    scored_by: user.id
  });
```



## 4. Error Handling

- **400 Bad Request**: Malformed input (e.g. invalid score range).
- **401 Unauthorized**: Missing or invalid JWT.
- **403 Forbidden**: RLS policy violation (e.g. trying to access another org's learner).
- **409 Conflict**: Duplicate key violation.
