-- Add status column to content_packs table for soft delete / archiving support
ALTER TABLE content_packs 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Optional: Index on status
CREATE INDEX IF NOT EXISTS idx_content_packs_status ON content_packs(status);
