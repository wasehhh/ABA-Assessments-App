-- Comprehensive RLS Policy Fix for Restored Tables

-- 1. Clients
-- Allow users to view/create/update clients within their organization
CREATE POLICY "Users can view clients in their org" 
ON clients FOR SELECT 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create clients in their org" 
ON clients FOR INSERT 
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update clients in their org" 
ON clients FOR UPDATE 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 2. Assessments
-- Allow users to view/create/update/delete assessments within their organization
CREATE POLICY "Users can view assessments in their org" 
ON assessments FOR SELECT 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create assessments in their org" 
ON assessments FOR INSERT 
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update assessments in their org" 
ON assessments FOR UPDATE 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete assessments in their org" 
ON assessments FOR DELETE 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 3. Assessment Scores
-- Scores inherit access from the parent assessment
CREATE POLICY "Users can view scores in their org" 
ON assessment_scores FOR SELECT 
USING (
  assessment_id IN (
    SELECT id FROM assessments 
    WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create scores in their org" 
ON assessment_scores FOR INSERT 
WITH CHECK (
  assessment_id IN (
    SELECT id FROM assessments 
    WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update scores in their org" 
ON assessment_scores FOR UPDATE 
USING (
  assessment_id IN (
    SELECT id FROM assessments 
    WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete scores in their org" 
ON assessment_scores FOR DELETE 
USING (
  assessment_id IN (
    SELECT id FROM assessments 
    WHERE org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

-- 4. Audit Logs
-- Allow users to view/create logs within their organization
CREATE POLICY "Users can view audit logs in their org" 
ON audit_logs FOR SELECT 
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create audit logs in their org" 
ON audit_logs FOR INSERT 
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
