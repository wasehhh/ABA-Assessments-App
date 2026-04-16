-- Add users view for backward compatibility
-- This is needed because 'secure_packs.sql' references 'users' table/view.

CREATE OR REPLACE VIEW users AS SELECT * FROM user_profiles;
