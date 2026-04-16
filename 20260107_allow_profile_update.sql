-- Allow users to update their own profile (Full Name)
create policy "Allow update own profile" on user_profiles 
for update to authenticated 
using (auth.uid() = id) 
with check (auth.uid() = id);
