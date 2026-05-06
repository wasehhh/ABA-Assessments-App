-- RESTORE PROFILES FOR TEST USERS
-- Run this in Supabase Verification SQL Editor

DO $$
DECLARE
    v_org_id uuid := '0718dd28-6dae-4053-b0c4-424dc2f933e5'; -- Test Organization
    v_user_id uuid;
BEGIN
    -- 1. Restore niaziwaseh@gmail.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'niaziwaseh@gmail.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, org_id, role, full_name, email)
        VALUES (v_user_id, v_org_id, 'admin', 'Waseh Niazi', 'niaziwaseh@gmail.com')
        ON CONFLICT (id) DO UPDATE
        SET org_id = EXCLUDED.org_id, role = EXCLUDED.role;
        RAISE NOTICE 'Restored niaziwaseh@gmail.com';
    ELSE
        RAISE WARNING 'niaziwaseh@gmail.com not found in auth.users';
    END IF;

    -- 2. Restore a1niazi@torontomu.ca
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'a1niazi@torontomu.ca';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (id, org_id, role, full_name, email)
        VALUES (v_user_id, v_org_id, 'senior_therapist', 'A1 Niazi', 'a1niazi@torontomu.ca')
        ON CONFLICT (id) DO UPDATE
        SET org_id = EXCLUDED.org_id, role = EXCLUDED.role;
        RAISE NOTICE 'Restored a1niazi@torontomu.ca';
    ELSE
        RAISE WARNING 'a1niazi@torontomu.ca not found in auth.users';
    END IF;
END $$;
