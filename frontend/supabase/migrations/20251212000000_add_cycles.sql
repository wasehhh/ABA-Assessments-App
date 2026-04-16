-- Create assessment_cycles table
CREATE TABLE IF NOT EXISTS assessment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id), -- Critical for RLS
  cycle_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'locked'
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, cycle_number)
);

-- Add assessment_cycle_id to assessment_scores
ALTER TABLE assessment_scores 
ADD COLUMN IF NOT EXISTS assessment_cycle_id UUID REFERENCES assessment_cycles(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_assessment_id ON assessment_cycles(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_cycle_id ON assessment_scores(assessment_cycle_id);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_org_id ON assessment_cycles(org_id);

-- RLS Policies
ALTER TABLE assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cycles for their org" ON assessment_cycles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create cycles for their org" ON assessment_cycles
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update cycles for their org" ON assessment_cycles
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- Helper comment: Existing scores are now orphaned from a cycle perspective. 
-- In a real prod migration, we would backfill them into a "Cycle 1". 
-- DO NOT RUN BACKFILL HERE automatically as it might double-insert if run multiple times.
