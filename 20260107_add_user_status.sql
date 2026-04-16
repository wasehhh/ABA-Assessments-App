-- Add status to user_profiles
alter table user_profiles 
add column if not exists status text default 'active' check (status in ('active', 'inactive'));

-- Allow Admins and Senior Therapists to update profiles within their organization
-- (Note: strict RLS for organization isolation)
create policy "Allow admins to update org members" on user_profiles
for update to authenticated
using (
  exists (
    select 1 from user_profiles admin_profile
    where admin_profile.id = auth.uid()
    and admin_profile.org_id = user_profiles.org_id
    and admin_profile.role = 'admin'
  )
)
with check (
  exists (
    select 1 from user_profiles admin_profile
    where admin_profile.id = auth.uid()
    and admin_profile.org_id = user_profiles.org_id
    and admin_profile.role = 'admin'
  )
);
