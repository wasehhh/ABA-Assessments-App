-- RESTORE MISSING PROFILE for niaziwaseh@gmail.com
-- Since the invite was deleted during debugging, the system doesn't know which Org to join.
-- We manually insert the profile.

-- 1. Get the User ID (Dynamic lookup safer than hardcoding)
DO $$
DECLARE
    target_user_id uuid;
    target_org_id uuid := '0718dd28-6dae-4053-b0c4-424dc2f933e5'; -- Test Organization
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'niaziwaseh@gmail.com';

    IF target_user_id IS NOT NULL THEN
        INSERT INTO user_profiles (id, org_id, role, full_name, email)
        VALUES (
            target_user_id,
            target_org_id,
            'senior_therapist', -- or 'admin' if you prefer
            'Waseh Niazi',
            'niaziwaseh@gmail.com'
        )
        ON CONFLICT (id) DO UPDATE
        SET org_id = EXCLUDED.org_id,
            role = EXCLUDED.role;
            
        RAISE NOTICE 'Restored profile for niaziwaseh@gmail.com';
    ELSE
        RAISE NOTICE 'User not found in Auth system!';
    END IF;
END $$;
