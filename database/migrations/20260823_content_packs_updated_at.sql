-- =============================================================================
-- content_packs.updated_at — revision token for Builder save-time conflict detection
-- Contract: docs/architecture/assessment_builder_phase_c_pr_c1_editing_sessions.md §6.3
-- Applied manually via Supabase SQL editor (PR C1b).
-- =============================================================================

-- 1. Add column (nullable briefly so we can backfill before NOT NULL).
alter table public.content_packs
  add column if not exists updated_at timestamp with time zone;

-- 2. Backfill from uploaded_at, falling back to created_at.
update public.content_packs
set updated_at = coalesce(uploaded_at, created_at, timezone('utc'::text, now()))
where updated_at is null;

-- 3. Default + NOT NULL for new rows and post-backfill integrity.
alter table public.content_packs
  alter column updated_at set default timezone('utc'::text, now()),
  alter column updated_at set not null;

-- 4. BEFORE UPDATE trigger — bump updated_at on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists content_packs_set_updated_at on public.content_packs;

create trigger content_packs_set_updated_at
  before update on public.content_packs
  for each row
  execute function public.set_updated_at();
