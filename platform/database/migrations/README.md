# Platform migrations

This directory receives **new** platform migrations from the post-Alpha split forward.

**It is currently empty, and stays empty until after the AIM Alpha pilot**, which permits no new migrations.

**The historical ledger remains at `[repo] database/migrations/` and is not moving during the pilot.** It is frozen: it predates the split, it is a replay history of production rather than a schema description, and **it is never re-divided.**

Manual-apply only. No Supabase CLI. No `supabase link`. No `supabase db push`.

Ordering across directories is in [`../APPLY_ORDER.md`](../APPLY_ORDER.md).
