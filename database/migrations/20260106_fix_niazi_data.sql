-- FIX DATA FOR niaziwaseh@gmail.com
-- 1. Get the correct Org ID from the Admin's user profile (or hardcode from verification)
-- Correct Org ID: 0718dd28-6dae-4053-b0c4-424dc2f933e5
-- Wrong Org ID: ec4bcfbe-8b1c-40a5-adf4-9748c39f458f

DO $$
DECLARE
    target_user_id uuid;
    correct_org_id uuid := '0718dd28-6dae-4053-b0c4-424dc2f933e5';
    wrong_org_id uuid := 'ec4bcfbe-8b1c-40a5-adf4-9748c39f458f';
BEGIN
    -- Get User ID
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'niaziwaseh@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- 1. Update Profile to Correct Org and Role
        UPDATE user_profiles
        SET org_id = correct_org_id,
            role = 'therapist'
        WHERE id = target_user_id;

        -- 2. Delete the Wrong Organization (and cascade to any data if it existed, but likely empty)
        -- Note: We need to be careful with foreign keys. 
        -- If user profile was the only thing referencing it, we already moved the profile.
        -- But 'organizations.created_by' might reference the user.
        -- and 'user_profiles.org_id' referenced it (now moved).
        
        -- Delete the wrong org
        DELETE FROM organizations WHERE id = wrong_org_id;

        -- 3. Delete the pending invite (since it's now "claimed" manually)
        DELETE FROM user_invites WHERE email = 'niaziwaseh@gmail.com';
        
        RAISE NOTICE 'Fixed user data for niaziwaseh@gmail.com';
    ELSE
        RAISE NOTICE 'User niaziwaseh@gmail.com not found';
    END IF;
END $$;
