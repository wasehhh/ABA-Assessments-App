# Migration ledger

`database/migrations/` is the authoritative migration ledger for this project.

Migrations are MANUAL-APPLY ONLY. Apply each file by hand in the Supabase SQL editor, one at a time, in filename date order, and verify with a catalogue query after each. A successful-looking run in the editor is not verification.

No Supabase CLI command is ever run against this project. No `supabase link`. No `supabase db push`. There is no `supabase/config.toml` and there must not be one.

Six files are historical one-off operational repairs, not schema migrations. A fresh replay onto an empty database should skip them: `20260105_seed_test_pack.sql`, `20260106_fix_niazi_data.sql`, `20260106_force_confirm_pending.sql`, `20260106_force_confirm_user.sql`, `20260106_restore_both_profiles.sql`, `20260106_restore_missing_profile.sql`. They repaired specific rows on a specific database in January 2026 and have no meaning anywhere else.

The remaining files are schema, policy, function and trigger definitions and belong in a replay.
