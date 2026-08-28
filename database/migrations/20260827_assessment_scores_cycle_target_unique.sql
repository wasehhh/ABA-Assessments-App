-- =============================================================================
-- assessment_scores: one score row per (cycle, target)
-- =============================================================================
-- What: UNIQUE constraint on public.assessment_scores (assessment_cycle_id,
--       target_id). Does not include assessment_id: a cycle belongs to exactly
--       one assessment, and including it would leave the real duplicate shape
--       unconstrained.
--
-- Why: assessmentService.createScore is check-then-act (select, then insert or
--      update). Two overlapping saves for the same target in the same cycle can
--      both read "no row" and both insert. The reachable path is a therapist
--      tapping a score and correcting it inside the save window. The constraint
--      is the guarantee. The client keeps CREATE vs UPDATE as separate audit
--      actions; on unique_violation it re-reads and routes to updateScore.
--
-- Verified before writing: live assessment_scores had 1,359 rows and 1,359
-- distinct (assessment_cycle_id, target_id) pairs — zero violations (QA,
-- 2026-08-27). A constraint therefore applies cleanly today.
--
-- If this is run against a table that has since acquired a duplicate pair:
-- ADD CONSTRAINT fails, the unique constraint is not added, and Postgres
-- reports unique_violation (SQLSTATE 23505). Resolve the duplicate pair
-- before retrying. Do not drop or merge score rows without an audit decision.
-- A failed constraint addition on a dirty table is the likeliest way this
-- goes wrong later.
--
-- Manual-apply only (Supabase SQL editor). Nothing in this repo runs
-- database/migrations/ automatically. Founder applies after SPM review:
-- write → review → apply → verify → commit.
--
-- A clean run of ADD CONSTRAINT is not proof. The 20260819 migration failure
-- in this project came from exactly that assumption: a migration file
-- committed, never actually applied, and nobody checked. The editor reporting
-- success is not a catalogue read. Verify with the query below against the
-- same database you applied to.
--
-- Reversal (run separately in the SQL editor; not part of apply). Copy the
-- statement inside the block comment:
/*
ALTER TABLE public.assessment_scores
  DROP CONSTRAINT assessment_scores_cycle_target_unique;
*/
--
-- Verify (run separately after apply; not part of apply). Copy the statement
-- inside the block comment. This reads pg_constraint on the connected
-- database. Built-in catalogue: pg_constraint, pg_get_constraintdef, regclass.
/*
SELECT
  conname,
  contype,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.assessment_scores'::regclass
  AND conname = 'assessment_scores_cycle_target_unique';
*/
-- Correct result: one row.
--   conname     = assessment_scores_cycle_target_unique
--   contype     = u   (Postgres unique-constraint type)
--   definition  = UNIQUE (assessment_cycle_id, target_id)
-- Empty result means the constraint is absent, regardless of what the SQL
-- editor reported for the ADD. If this query errors because the relation
-- does not exist, you are not connected to the database that holds
-- assessment_scores.
-- =============================================================================

ALTER TABLE public.assessment_scores
  ADD CONSTRAINT assessment_scores_cycle_target_unique
  UNIQUE (assessment_cycle_id, target_id);
