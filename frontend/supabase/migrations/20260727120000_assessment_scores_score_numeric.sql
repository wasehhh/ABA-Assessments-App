-- PR14B: Persist decimal assessment scores.
-- Converts assessment_scores.score from integer → numeric when needed.
-- Idempotent: no-op if the column is already numeric/decimal.
-- Preserves existing integer values via USING cast; indexes/FKs/constraints unchanged.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessment_scores'
      AND column_name = 'score'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.assessment_scores
      ALTER COLUMN score TYPE numeric
      USING score::numeric;
  END IF;
END $$;

COMMENT ON COLUMN public.assessment_scores.score IS
  'Submitted score value; must be a member of the target resolved scale. Supports decimals (e.g. 0.5).';
