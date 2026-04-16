-- FORCE CONFIRM ALL PENDING USERS
-- Run this to unblock any user stuck at "Check your email"

UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email_confirmed_at IS NULL;

-- If you have specific emails, strictly filtering is safer, but for dev/test:
-- This approves everyone.
