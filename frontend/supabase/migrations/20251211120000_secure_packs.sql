-- Enable RLS
ALTER TABLE content_packs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view packs from their own organization
CREATE POLICY "Users can view packs from their own org"
ON content_packs FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM users WHERE org_id = content_packs.org_id
));

-- Policy: Organization Admins and Senior Therapists can insert/update packs
CREATE POLICY "Admins and Seniors can manage packs"
ON content_packs FOR ALL
USING (auth.uid() IN (
    SELECT id FROM users 
    WHERE org_id = content_packs.org_id 
    AND role IN ('admin', 'senior_therapist')
));
