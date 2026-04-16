-- Add metadata column to assessment_scores for storing detailed Task Analysis results
ALTER TABLE assessment_scores 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN assessment_scores.metadata IS 'Stores detailed scoring data, such as per-step results for Task Analysis (e.g. {"steps": {"Step 1": true}})';
