-- FORCE CONFIRM USER (Bypass Email)
-- This matches the behavior of clicking the email link.

-- 1. Confirm the user in the Auth system
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'niaziwaseh@gmail.com';

-- 2. Verify Invite matches (Just a sanity check)
select email, org_id from user_invites where email = 'niaziwaseh@gmail.com';
