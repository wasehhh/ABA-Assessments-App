
-- Enable RLS on audit_logs if not already (it should be)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can VIEW all logs for their own organization
CREATE POLICY "Admins can view audit logs for their org"
ON audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
        AND user_profiles.org_id = audit_logs.org_id
    )
);
