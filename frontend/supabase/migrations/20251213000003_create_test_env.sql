-- Create Test Environment
-- 1. Create a known Test Organization
DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001'; -- Deterministic ID for Test Org
  v_user_id UUID := '82a582fb-6cd7-4987-9425-3282e0f32ccd'; -- User ID observed in logs
BEGIN
  -- Insert Test Org if not exists
  INSERT INTO organizations (id, name)
  VALUES (v_org_id, 'Universal Test Org')
  ON CONFLICT (id) DO UPDATE SET name = 'Universal Test Org';

  -- Update the specific user to be Admin of this Org
  -- This makes them a "Super User" relative to this organization
  UPDATE user_profiles
  SET 
    org_id = v_org_id,
    role = 'admin',
    full_name = 'Super User (Test)'
  WHERE id = v_user_id;

  -- Ensure RLS allows this (mostly covered by previous fixes, but good to be sure)
  -- (No extra RLS needed if we update via migration which is superuser)
END $$;
