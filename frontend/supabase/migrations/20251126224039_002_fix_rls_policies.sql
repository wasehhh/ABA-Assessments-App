/*
  # Fix RLS Policies to Prevent Infinite Recursion

  ## Changes
  - Drop existing policies on user_profiles that cause recursion
  - Create simpler policies that don't self-reference
  - Allow users to view their own profile directly
  - Allow insert during signup without checking existing profiles
  
  ## Security
  - Users can view their own profile using auth.uid()
  - Initial signup allows profile creation
  - Users can update only their own profile
*/

-- Drop existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view org members" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;

-- Create new simple policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Fix organizations policy - simplify to avoid recursion
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT org_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert organization during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);
